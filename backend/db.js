// backend/db.js
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_YvlORg8qyoF1@ep-blue-mud-b5kpspnh-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=requireRE',
  ssl: {
    rejectUnauthorized: false
  }
});

export default pool;
