const { Pool } = require('pg');

// Use neon or supabase string from env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If not using SSL locally, you can modify this based on env
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
