const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// In-memory blacklist for force-logout mechanism
// In a real production system, consider a Redis store or DB table for blacklisting JWTs
const globalTokenBlacklist = new Set();
let globalLogoutTimestamp = null; // To invalidate all tokens issued before this time

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET must be defined in environment");
  return process.env.JWT_SECRET;
};

const generateToken = (projectKey) => {
  return jwt.sign(
    { id: projectKey.id, key_name: projectKey.key_name, is_admin: projectKey.is_admin },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
};

exports.login = async (req, res) => {
  try {
    const { key_name, secret } = req.body;
    if (!key_name || !secret) {
      return res.status(400).json({ error: 'key_name and secret are required' });
    }

    const result = await db.query('SELECT * FROM project_keys WHERE key_name = $1', [key_name]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const projectKey = result.rows[0];
    const isMatch = await bcrypt.compare(secret, projectKey.hashed_key);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(projectKey);

    // Log the login event
    await db.query(
      'INSERT INTO system_logs (event_type, event_data, ip_address) VALUES ($1, $2, $3)',
      ['LOGIN', JSON.stringify({ key_name: projectKey.key_name, is_admin: projectKey.is_admin }), req.ip]
    );

    res.json({
      token,
      project_key: {
        id: projectKey.id,
        key_name: projectKey.key_name,
        is_admin: projectKey.is_admin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.checkAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  if (globalTokenBlacklist.has(token)) {
    return res.status(401).json({ error: 'Token has been revoked' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (globalLogoutTimestamp && decoded.iat && decoded.iat * 1000 < globalLogoutTimestamp) {
      return res.status(401).json({ error: 'Session expired due to global force logout' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

exports.requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

exports.forceLogoutAll = async (req, res) => {
  try {
    globalLogoutTimestamp = Date.now();
    await db.query(
      'INSERT INTO system_logs (event_type, event_data, ip_address) VALUES ($1, $2, $3)',
      ['FORCE_LOGOUT_ALL', JSON.stringify({ admin_id: req.user.id }), req.ip]
    );
    res.json({ message: 'All active sessions have been invalidated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createKey = async (req, res) => {
  try {
    const { key_name, secret, is_admin } = req.body;
    if (!key_name || !secret) {
      return res.status(400).json({ error: 'key_name and secret required' });
    }

    const hashedKey = await bcrypt.hash(secret, 10);
    const result = await db.query(
      'INSERT INTO project_keys (key_name, hashed_key, is_admin) VALUES ($1, $2, $3) RETURNING id, key_name, is_admin, created_at',
      [key_name, hashedKey, is_admin || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(400).json({ error: 'Key name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.listKeys = async (req, res) => {
  try {
    const result = await db.query('SELECT id, key_name, is_admin, created_at FROM project_keys ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
