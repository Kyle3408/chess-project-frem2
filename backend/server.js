// backend/server.js
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import pool from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const securityQuestions = {
  first_pet: 'What was the name of your first pet?',
  first_school: 'What was the name of your first school?',
  birth_city: 'In what city were you born?',
  childhood_friend: 'What was the first name of a childhood friend?'
};

const isValidSecurityQuestion = (question) => Object.prototype.hasOwnProperty.call(securityQuestions, question);
const normalizeSecurityAnswer = (answer) => answer.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');

// --- REGISTER ENDPOINT ---
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, securityQuestion, securityAnswer } = req.body;
    
    if (!username || !email || !password || !securityQuestion || typeof securityAnswer !== 'string' || !securityAnswer.trim()) {
      return res.status(400).json({ error: "All fields, including a security question and answer, are required" });
    }

    if (!isValidSecurityQuestion(securityQuestion)) {
      return res.status(400).json({ error: "Choose a valid security question" });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const securityAnswerHash = await bcrypt.hash(normalizeSecurityAnswer(securityAnswer), saltRounds);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, security_question, security_answer_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email`,
      [username, email, passwordHash, securityQuestion, securityAnswerHash]
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
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      hasSecurityQuestion: Boolean(user.security_question && user.security_answer_hash)
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: "Server error during login" });
  }
});

// --- SET SECURITY QUESTION FOR EXISTING ACCOUNTS ---
app.post('/api/security-question', async (req, res) => {
  try {
    const { email, currentPassword, securityQuestion, securityAnswer } = req.body;

    if (!email || !currentPassword || !securityQuestion || typeof securityAnswer !== 'string' || !securityAnswer.trim()) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!isValidSecurityQuestion(securityQuestion)) {
      return res.status(400).json({ error: "Choose a valid security question" });
    }

    const result = await pool.query(
      `SELECT id, password_hash FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    if (!await bcrypt.compare(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const securityAnswerHash = await bcrypt.hash(normalizeSecurityAnswer(securityAnswer), 10);
    await pool.query(
      `UPDATE users SET security_question = $1, security_answer_hash = $2 WHERE id = $3`,
      [securityQuestion, securityAnswerHash, user.id]
    );

    res.json({ message: "Security question saved" });
  } catch (err) {
    console.error("❌ Security question setup error:", err.message);
    res.status(500).json({ error: "Server error saving security question" });
  }
});

// --- LOOK UP SECURITY QUESTION FOR PASSWORD RESET ---
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const userResult = await pool.query(
      `SELECT security_question, security_answer_hash FROM users WHERE email = $1`,
      [email]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "No account found with that email address" });
    }

    const user = userResult.rows[0];
    if (!user.security_question || !user.security_answer_hash || !isValidSecurityQuestion(user.security_question)) {
      return res.status(409).json({ error: "This account needs a security question. Log in to set one before resetting your password." });
    }

    res.json({ securityQuestion: securityQuestions[user.security_question] });
  } catch (err) {
    console.error("❌ Security question lookup error:", err.message);
    res.status(500).json({ error: "Server error looking up security question" });
  }
});

// --- RESET PASSWORD (VERIFY SECURITY ANSWER & UPDATE PASSWORD) ENDPOINT ---
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, securityAnswer, newPassword } = req.body;

    if (!email || typeof securityAnswer !== 'string' || !securityAnswer.trim() || !newPassword) {
      return res.status(400).json({ error: "Email, security answer, and new password are required" });
    }

    const result = await pool.query(
      `SELECT id, security_answer_hash FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    if (!user.security_answer_hash ||
        !await bcrypt.compare(normalizeSecurityAnswer(securityAnswer), user.security_answer_hash)) {
      return res.status(400).json({ error: "Incorrect security answer" });
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      `UPDATE users
       SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL
       WHERE id = $2`,
      [newPasswordHash, user.id]
    );

    console.log(`✅ Password successfully reset for ${email}`);
    res.json({ message: "Password updated successfully! You can now log in." });
  } catch (err) {
    console.error("❌ Reset password error:", err.message);
    res.status(500).json({ error: "Server error resetting password" });
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

await pool.query(`
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS security_question TEXT,
    ADD COLUMN IF NOT EXISTS security_answer_hash TEXT
`);

app.listen(5000, () => console.log('Server running on http://localhost:5000'));