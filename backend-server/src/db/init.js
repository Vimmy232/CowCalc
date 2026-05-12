const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  try {
    const schemaPath = path.join(__dirname, '../../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Schema loaded successfully');

    // Only create default admin if ADMIN_SECRET is provided in env
    if (process.env.ADMIN_SECRET) {
      const res = await pool.query("SELECT * FROM project_keys WHERE key_name = 'admin'");
      if (res.rows.length === 0) {
        const hashedKey = await bcrypt.hash(process.env.ADMIN_SECRET, 10);
        await pool.query(
          "INSERT INTO project_keys (key_name, hashed_key, is_admin) VALUES ($1, $2, $3)",
          ['admin', hashedKey, true]
        );
        console.log('Admin account seeded using ADMIN_SECRET.');
      }
    }
  } catch (err) {
    console.error('Error initializing DB:', err);
  } finally {
    await pool.end();
  }
}

initDB();
