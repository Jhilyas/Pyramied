const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/init');

const router = express.Router();

// GET /api/users
router.get('/', (req, res) => {
  const db = getDb();
  const users = db.all('SELECT id, username, full_name, email, is_teacher, is_suspended, last_login, created_at FROM users ORDER BY created_at DESC');
  res.json({ users });
});

// POST /api/users
router.post('/', (req, res) => {
  const { username, full_name, password, email, is_teacher } = req.body;
  if (!username || !full_name || !password) {
    return res.status(400).json({ error: 'Username, full name, and password are required' });
  }

  const db = getDb();
  const exists = db.get('SELECT id FROM users WHERE username = ?', [username]);
  if (exists) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.run(
    'INSERT INTO users (username, password_hash, full_name, email, is_teacher) VALUES (?, ?, ?, ?, ?)',
    [username, hash, full_name, email || null, is_teacher ? 1 : 0]
  );
  
  const userId = result.lastInsertRowid;

  if (!is_teacher) {
    const visibleCourses = db.all('SELECT id FROM courses WHERE is_visible = 1');
    for (const c of visibleCourses) {
      db.run('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)', [userId, c.id]);
    }
  }

  res.status(201).json({ id: userId, message: 'User created' });
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { username, full_name, password, email, is_teacher, is_suspended } = req.body;

  const db = getDb();
  const user = db.get('SELECT * FROM users WHERE id = ?', [Number(id)]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, Number(id)]);
  }

  db.run(
    `UPDATE users SET
      username = COALESCE(?, username),
      full_name = COALESCE(?, full_name),
      email = COALESCE(?, email),
      is_teacher = COALESCE(?, is_teacher),
      is_suspended = COALESCE(?, is_suspended)
    WHERE id = ?`,
    [
      username || null,
      full_name || null,
      email !== undefined ? email : null,
      is_teacher !== undefined ? (is_teacher ? 1 : 0) : null,
      is_suspended !== undefined ? (is_suspended ? 1 : 0) : null,
      Number(id),
    ]
  );

  res.json({ message: 'User updated' });
});

// POST /api/users/bulk
router.post('/bulk', (req, res) => {
  res.json({ message: 'Bulk upload endpoint ready' });
});

module.exports = router;
