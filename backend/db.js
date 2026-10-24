import 'dotenv/config';
import pkg from 'pg';

const { Pool } = pkg;

// DEBUG LINE: Let's print what DATABASE_URL looks like in the terminal
console.log("🔍 Loaded DATABASE_URL:", process.env.DATABASE_URL ? "URL exists (hidden for security)" : "UNDEFINED!");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default pool;