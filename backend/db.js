// backend/db.js
import pkg from 'pg';
const { Pool } = pkg;

// Replace with your local Postgres credentials
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'demodb',
  password: 'Pikachu28',
  port: 5432,
});

export default pool;