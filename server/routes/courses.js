const express = require('express');
const { getDb } = require('../db/init');

const router = express.Router();

// GET /api/courses
router.get('/', (req, res) => {
  const db = getDb();
  if (req.session.isTeacher) {
    const courses = db.all('SELECT * FROM courses ORDER BY sort_order, created_at DESC');
    return res.json({ courses });
  }

  const courses = db.all(
    `SELECT c.*, e.enrolled_at
     FROM courses c
     LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
     WHERE c.is_visible = 1
     ORDER BY c.sort_order, c.created_at DESC`,
    [req.session.userId]
  );
  res.json({ courses });
});

// POST /api/courses
router.post('/', (req, res) => {
  if (!req.session.isTeacher) return res.status(403).json({ error: 'Teacher access required' });

  const { title, description, format } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const db = getDb();
  const result = db.run(
    'INSERT INTO courses (title, description, format) VALUES (?, ?, ?)',
    [title, description || null, format || 'topics']
  );

  req.app.get('io').emit('content:updated');

  res.status(201).json({ id: result.lastInsertRowid, message: 'Course created' });
});

// PUT /api/courses/:id
router.put('/:id', (req, res) => {
  if (!req.session.isTeacher) return res.status(403).json({ error: 'Teacher access required' });

  const { id } = req.params;
  const { title, description, format, is_visible, sort_order } = req.body;

  const db = getDb();
  db.run(
    `UPDATE courses SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      format = COALESCE(?, format),
      is_visible = COALESCE(?, is_visible),
      sort_order = COALESCE(?, sort_order)
    WHERE id = ?`,
    [title || null, description !== undefined ? description : null, format || null, is_visible !== undefined ? (is_visible ? 1 : 0) : null, sort_order !== undefined ? sort_order : null, Number(id)]
  );

  req.app.get('io').emit('content:updated');

  res.json({ message: 'Course updated' });
});

// DELETE /api/courses/:id
router.delete('/:id', (req, res) => {
  if (!req.session.isTeacher) return res.status(403).json({ error: 'Teacher access required' });

  const db = getDb();
  db.run('DELETE FROM courses WHERE id = ?', [Number(req.params.id)]);
  
  req.app.get('io').emit('content:updated');
  
  res.json({ message: 'Course deleted' });
});

// POST /api/courses/:id/enroll
router.post('/:id/enroll', (req, res) => {
  if (!req.session.isTeacher) return res.status(403).json({ error: 'Teacher access required' });

  const { user_ids } = req.body;
  const courseId = Number(req.params.id);
  const db = getDb();

  for (const uid of (user_ids || [])) {
    db.run('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)', [uid, courseId]);
  }

  req.app.get('io').emit('content:updated');

  res.json({ message: 'Students enrolled' });
});

// DELETE /api/courses/:id/enroll/:userId
router.delete('/:id/enroll/:userId', (req, res) => {
  if (!req.session.isTeacher) return res.status(403).json({ error: 'Teacher access required' });

  const db = getDb();
  db.run('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?', [Number(req.params.userId), Number(req.params.id)]);
  
  req.app.get('io').emit('content:updated');
  
  res.json({ message: 'Student unenrolled' });
});

module.exports = router;
