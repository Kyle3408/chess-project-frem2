// backend/server.js
import express from 'express';
import cors from 'cors';
import pool from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint para crear una partida
app.post('/api/games', async (req, res) => {
  try {
    const { whitePlayerId, blackPlayerId } = req.body;
    const result = await pool.query(
      `INSERT INTO games (white_player_id, black_player_id) 
       VALUES ($1, $2) RETURNING *`,
      [whitePlayerId || null, blackPlayerId || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para registrar un movimiento
app.post('/api/moves', async (req, res) => {
  try {
    const { gameId, playerId, moveNumber, sanMove, fenAfterMove } = req.body;
    
    const moveResult = await pool.query(
      `INSERT INTO movelogs (game_id, player_id, move_number, san_move, fen_after_move)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [gameId, playerId || null, moveNumber, sanMove, fenAfterMove]
    );

    await pool.query(
      `UPDATE games SET current_fen = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [fenAfterMove, gameId]
    );

    res.json(moveResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log('Servidor corriendo en http://localhost:5000'));