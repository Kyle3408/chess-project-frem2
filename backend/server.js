// backend/server.js
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import pool from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// --- REGISTER ENDPOINT ---
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email`,
      [username, email, passwordHash]
    );

    console.log("✅ New user registered:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Registration error:", err.message);
    res.status(500).json({ error: "Username or email already exists" });
  }
});

// --- LOGIN ENDPOINT ---
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    console.log("✅ User logged in:", user.username);
    res.json({ id: user.id, username: user.username, email: user.email });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: "Server error during login" });
  }
});

// --- CREATE GAME ENDPOINT ---
app.post('/api/games', async (req, res) => {
  try {
    const { whitePlayerId, blackPlayerId } = req.body;
    const result = await pool.query(
      `INSERT INTO games (white_player_id, black_player_id) VALUES ($1, $2) RETURNING *`,
      [whitePlayerId || null, blackPlayerId || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SAVE MOVE ENDPOINT ---
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