const express = require('express');
const { getDb } = require('../db/init');
const { requireTeacher } = require('../middleware/auth');

const router = express.Router();

// ============================================
// GET /api/settings — Get all site settings
// ============================================
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.all('SELECT key, value FROM site_settings');
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json({ settings });
});

// ============================================
// PUT /api/settings — Update settings (admin only)
// ============================================
router.put('/', requireTeacher, (req, res) => {
  const db = getDb();
  const { settings } = req.body;

  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Settings object required' });
  }

  for (const [key, value] of Object.entries(settings)) {
    db.run("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)", [key, value || '']);
  }

  res.json({ message: 'Settings updated' });
});

// ============================================
// GET /api/settings/announcements — Get announcements
// ============================================
router.get('/announcements', (req, res) => {
  const db = getDb();
  const announcements = db.all('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 20');
  res.json({ announcements });
});

// ============================================
// POST /api/settings/announcements — Create announcement (admin)
// ============================================
router.post('/announcements', requireTeacher, (req, res) => {
  const db = getDb();
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

  const result = db.run(
    'INSERT INTO announcements (title, content) VALUES (?, ?)',
    [title, content]
  );

  res.status(201).json({ id: result.lastInsertRowid, message: 'Announcement created' });
});

// ============================================
// DELETE /api/settings/announcements/:id — Delete announcement (admin)
// ============================================
router.delete('/announcements/:id', requireTeacher, (req, res) => {
  const db = getDb();
  db.run('DELETE FROM announcements WHERE id = ?', [Number(req.params.id)]);
  res.json({ message: 'Announcement deleted' });
});

module.exports = router;
