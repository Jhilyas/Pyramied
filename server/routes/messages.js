const express = require('express');
const { getDb } = require('../db/init');

const router = express.Router();

// ============================================
// GET /api/messages — Get messages for current user
// ============================================
router.get('/', (req, res) => {
  const db = getDb();
  const userId = req.session.userId;

  // inbox
  const inbox = db.all(`
    SELECT m.*, u.full_name as from_name, u.username as from_username
    FROM messages m
    JOIN users u ON u.id = m.from_user_id
    WHERE m.to_user_id = ?
    ORDER BY m.created_at DESC
  `, [userId]);

  // sent
  const sent = db.all(`
    SELECT m.*, u.full_name as to_name, u.username as to_username
    FROM messages m
    JOIN users u ON u.id = m.to_user_id
    WHERE m.from_user_id = ?
    ORDER BY m.created_at DESC
  `, [userId]);

  // unread count
  const unread = db.get('SELECT COUNT(*) as count FROM messages WHERE to_user_id = ? AND is_read = 0', [userId]);

  res.json({ inbox, sent, unreadCount: unread ? unread.count : 0 });
});

// ============================================
// GET /api/messages/users — Get list of users you can message
// ============================================
router.get('/users', (req, res) => {
  const db = getDb();

  if (req.session.isTeacher) {
    // Teachers can message any user
    const users = db.all(`
      SELECT id, username, full_name, is_teacher FROM users
      WHERE id != ? AND is_suspended = 0
      ORDER BY is_teacher DESC, full_name
    `, [req.session.userId]);
    return res.json({ users });
  }

  // Students can only message teachers
  const users = db.all(`
    SELECT id, username, full_name, is_teacher FROM users
    WHERE is_teacher = 1 AND is_suspended = 0
    ORDER BY full_name
  `);
  res.json({ users });
});

// ============================================
// POST /api/messages — Send a message
// ============================================
router.post('/', (req, res) => {
  const db = getDb();
  const { to_user_id, subject, content } = req.body;

  if (!to_user_id || !content) {
    return res.status(400).json({ error: 'Recipient and content required' });
  }

  const result = db.run(
    'INSERT INTO messages (from_user_id, to_user_id, subject, content) VALUES (?, ?, ?, ?)',
    [req.session.userId, Number(to_user_id), subject || null, content]
  );

  res.status(201).json({ id: result.lastInsertRowid, message: 'Message sent' });
});

// ============================================
// PUT /api/messages/:id/read — Mark message as read
// ============================================
router.put('/:id/read', (req, res) => {
  const db = getDb();
  db.run('UPDATE messages SET is_read = 1 WHERE id = ? AND to_user_id = ?',
    [Number(req.params.id), req.session.userId]);
  res.json({ message: 'Marked as read' });
});

// ============================================
// DELETE /api/messages/:id — Delete a message
// ============================================
router.delete('/:id', (req, res) => {
  const db = getDb();
  const msg = db.get('SELECT * FROM messages WHERE id = ?', [Number(req.params.id)]);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  // Only sender or recipient can delete
  if (msg.from_user_id !== req.session.userId && msg.to_user_id !== req.session.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  db.run('DELETE FROM messages WHERE id = ?', [Number(req.params.id)]);
  res.json({ message: 'Message deleted' });
});

module.exports = router;
