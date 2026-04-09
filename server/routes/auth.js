const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/init');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const db = getDb();
  const user = db.get('SELECT * FROM users WHERE username = ?', [username]);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.is_suspended) {
    return res.status(403).json({ error: 'Account suspended. Contact your administrator.' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
  db.run('INSERT INTO activity_log (user_id, session_id, action) VALUES (?, ?, ?)', [user.id, req.sessionID, 'login']);

  req.session.userId = user.id;
  req.session.isTeacher = !!user.is_teacher;

  res.json({
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      is_teacher: !!user.is_teacher,
    },
  });
});

// POST /api/auth/signup — student self-registration
router.post('/signup', (req, res) => {
  const { username, password, full_name, email } = req.body;

  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Username, full name, and password are required' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const db = getDb();
  const exists = db.get('SELECT id FROM users WHERE username = ?', [username]);
  if (exists) {
    return res.status(409).json({ error: 'Username already taken. Try another one.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.run(
    'INSERT INTO users (username, password_hash, full_name, email, is_teacher) VALUES (?, ?, ?, ?, 0)',
    [username, hash, full_name, email || null]
  );

  const userId = result.lastInsertRowid;

  // Auto-enroll new student into all visible courses so they receive lessons and work immediately
  const visibleCourses = db.all('SELECT id FROM courses WHERE is_visible = 1');
  for (const c of visibleCourses) {
    db.run('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)', [userId, c.id]);
  }

  // Auto-login after signup
  req.session.userId = userId;
  req.session.isTeacher = false;

  db.run('INSERT INTO activity_log (user_id, session_id, action) VALUES (?, ?, ?)', [userId, req.sessionID, 'signup']);

  res.status(201).json({
    user: {
      id: userId,
      username,
      full_name,
      email: email || null,
      is_teacher: false,
    },
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const user = db.get('SELECT id, username, full_name, email, is_teacher FROM users WHERE id = ?', [req.session.userId]);

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  res.json({ user: { ...user, is_teacher: !!user.is_teacher } });
});

module.exports = router;
