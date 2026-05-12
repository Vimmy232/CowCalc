const db = require('../db');

exports.saveBuild = async (req, res) => {
  try {
    const { title, description, plan_data, is_meta } = req.body;
    const project_key_id = req.user.id;

    if (!title || !plan_data) {
      return res.status(400).json({ error: 'title and plan_data are required' });
    }

    // Only admins can create meta builds
    const actual_is_meta = req.user.is_admin ? (is_meta || false) : false;

    const result = await db.query(
      `INSERT INTO builds (title, description, project_key_id, plan_data, is_meta)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, description, project_key_id, plan_data, actual_is_meta]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Save build error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getBuilds = async (req, res) => {
  try {
    const { is_meta } = req.query;
    let query = 'SELECT b.id, b.title, b.description, b.is_meta, b.created_at, p.key_name as author FROM builds b LEFT JOIN project_keys p ON b.project_key_id = p.id';
    let params = [];

    if (is_meta === 'true') {
      query += ' WHERE b.is_meta = $1';
      params.push(true);
    }

    query += ' ORDER BY b.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getBuildById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT b.*, p.key_name as author FROM builds b LEFT JOIN project_keys p ON b.project_key_id = p.id WHERE b.id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Build not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
