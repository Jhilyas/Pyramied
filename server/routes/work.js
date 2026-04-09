const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db/init');
const { requireTeacher } = require('../middleware/auth');

const router = express.Router();

// Multer config — 100MB limit, preserve original extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'work');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      '.pdf', '.doc', '.docx', '.ppt', '.pptx',
      '.xls', '.xlsx', '.txt', '.rtf', '.odt',
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
      '.mp4', '.mp3', '.zip', '.rar',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed`));
    }
  },
});

// ============================================
// GET /api/work — List work items
// ============================================
router.get('/', (req, res) => {
  const db = getDb();

  if (req.session.isTeacher) {
    // Admin: get all work items with attachment counts and view counts
    const items = db.all(`
      SELECT w.*,
        c.title as course_title,
        (SELECT COUNT(*) FROM work_attachments WHERE work_item_id = w.id) as attachment_count,
        (SELECT COUNT(*) FROM work_views WHERE work_item_id = w.id) as view_count,
        (SELECT COUNT(*) FROM work_submissions WHERE work_item_id = w.id) as submission_count
      FROM work_items w
      LEFT JOIN courses c ON c.id = w.course_id
      ORDER BY w.created_at DESC
    `);
    return res.json({ items });
  }

  // Student: all published items
  const items = db.all(`
    SELECT w.*,
      c.title as course_title,
      (SELECT COUNT(*) FROM work_attachments WHERE work_item_id = w.id) as attachment_count,
      wv.view_count,
      wv.last_viewed_at,
      ws.id as submission_id,
      ws.submitted_at,
      ws.score,
      ws.feedback
    FROM work_items w
    LEFT JOIN courses c ON c.id = w.course_id
    LEFT JOIN work_views wv ON wv.work_item_id = w.id AND wv.user_id = ?
    LEFT JOIN work_submissions ws ON ws.work_item_id = w.id AND ws.user_id = ?
    WHERE w.is_published = 1 AND (c.is_visible = 1 OR w.course_id IS NULL)
    ORDER BY w.created_at DESC
  `, [req.session.userId, req.session.userId]);

  return res.json({ items });
});

// ============================================
// GET /api/work/:id — Single work item + attachments
// ============================================
router.get('/:id', (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);

  const item = db.get('SELECT w.*, c.title as course_title FROM work_items w LEFT JOIN courses c ON c.id = w.course_id WHERE w.id = ?', [id]);
  if (!item) return res.status(404).json({ error: 'Work item not found' });

  // Students can only see published items
  if (!req.session.isTeacher && !item.is_published) {
    return res.status(403).json({ error: 'This work is not published yet' });
  }

  const attachments = db.all('SELECT id, file_name, file_path, file_type, file_size FROM work_attachments WHERE work_item_id = ?', [id]);

  // If student, get their submission
  let submission = null;
  if (!req.session.isTeacher) {
    submission = db.get('SELECT * FROM work_submissions WHERE work_item_id = ? AND user_id = ?', [id, req.session.userId]);
  }

  res.json({ item, attachments, submission });
});

// ============================================
// POST /api/work — Create work item (admin only)
// ============================================
router.post('/', requireTeacher, upload.array('files', 20), (req, res) => {
  const { title, description, course_id, type, due_date, is_published } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const db = getDb();
  const result = db.run(
    `INSERT INTO work_items (title, description, course_id, type, due_date, is_published)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, description || null, course_id ? Number(course_id) : null, type || 'assignment', due_date || null, (is_published === '1' || is_published === true) ? 1 : 0]
  );

  const workId = result.lastInsertRowid;

  // Save attachments
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      db.run(
        `INSERT INTO work_attachments (work_item_id, file_name, file_path, file_type, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [workId, file.originalname, `/uploads/work/${file.filename}`, file.mimetype, file.size]
      );
    }
  }

  // Log activity
  db.run('INSERT INTO activity_log (user_id, session_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)',
    [req.session.userId, req.sessionID, 'create_work', 'work_item', workId]);

  req.app.get('io').emit('content:updated');

  res.status(201).json({ id: workId, message: 'Work item created' });
});

// ============================================
// PUT /api/work/:id — Update work item (admin only)
// ============================================
router.put('/:id', requireTeacher, upload.array('files', 20), (req, res) => {
  const id = Number(req.params.id);
  const { title, description, course_id, type, due_date, is_published } = req.body;

  const db = getDb();
  db.run(
    `UPDATE work_items SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      course_id = COALESCE(?, course_id),
      type = COALESCE(?, type),
      due_date = COALESCE(?, due_date),
      is_published = COALESCE(?, is_published),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      title || null,
      description !== undefined ? description : null,
      course_id ? Number(course_id) : null,
      type || null,
      due_date !== undefined ? due_date : null,
      is_published !== undefined ? ((is_published === '1' || is_published === true) ? 1 : 0) : null,
      id,
    ]
  );

  // Save new attachments if any
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      db.run(
        `INSERT INTO work_attachments (work_item_id, file_name, file_path, file_type, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [id, file.originalname, `/uploads/work/${file.filename}`, file.mimetype, file.size]
      );
    }
  }

  req.app.get('io').emit('content:updated');

  res.json({ message: 'Work item updated' });
});

// ============================================
// DELETE /api/work/:id — Delete work item (admin only)
// ============================================
router.delete('/:id', requireTeacher, (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);

  const attachments = db.all('SELECT file_path FROM work_attachments WHERE work_item_id = ?', [id]);
  for (const a of attachments) {
    const fullPath = path.join(__dirname, '..', a.file_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  db.run('DELETE FROM work_items WHERE id = ?', [id]);
  
  req.app.get('io').emit('content:updated');
  
  res.json({ message: 'Work item deleted' });
});

// ============================================
// DELETE /api/work/:id/attachment/:attachId — Delete single attachment
// ============================================
router.delete('/:id/attachment/:attachId', requireTeacher, (req, res) => {
  const db = getDb();
  const attach = db.get('SELECT * FROM work_attachments WHERE id = ? AND work_item_id = ?', [Number(req.params.attachId), Number(req.params.id)]);
  if (!attach) return res.status(404).json({ error: 'Attachment not found' });

  const fullPath = path.join(__dirname, '..', attach.file_path);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  db.run('DELETE FROM work_attachments WHERE id = ?', [attach.id]);

  res.json({ message: 'Attachment deleted' });
});

// ============================================
// POST /api/work/:id/view — Record student view
// ============================================
router.post('/:id/view', (req, res) => {
  if (req.session.isTeacher) return res.json({ ok: true }); // Don't track admin views

  const db = getDb();
  const id = Number(req.params.id);
  const userId = req.session.userId;

  const existing = db.get('SELECT id, view_count FROM work_views WHERE work_item_id = ? AND user_id = ?', [id, userId]);

  if (existing) {
    db.run(
      'UPDATE work_views SET view_count = view_count + 1, last_viewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [existing.id]
    );
  } else {
    db.run(
      'INSERT INTO work_views (work_item_id, user_id) VALUES (?, ?)',
      [id, userId]
    );
  }

  // Log activity
  db.run('INSERT INTO activity_log (user_id, session_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)',
    [userId, req.sessionID, 'view_work', 'work_item', id]);

  res.json({ ok: true });
});

// ============================================
// GET /api/work/:id/views — View analytics (admin)
// ============================================
router.get('/:id/views', requireTeacher, (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);

  const views = db.all(`
    SELECT wv.*, u.full_name, u.username
    FROM work_views wv
    JOIN users u ON u.id = wv.user_id
    WHERE wv.work_item_id = ?
    ORDER BY wv.last_viewed_at DESC
  `, [id]);

  // Also get total enrolled students for this work's course
  const item = db.get('SELECT course_id FROM work_items WHERE id = ?', [id]);
  let totalEnrolled = 0;
  if (item && item.course_id) {
    const count = db.get('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?', [item.course_id]);
    totalEnrolled = count ? count.count : 0;
  }

  res.json({ views, totalEnrolled, totalViewed: views.length });
});

// ============================================
// POST /api/work/:id/submit — Student submission
// ============================================
router.post('/:id/submit', upload.single('file'), (req, res) => {
  if (req.session.isTeacher) return res.status(400).json({ error: 'Teachers cannot submit work' });

  const db = getDb();
  const id = Number(req.params.id);
  const userId = req.session.userId;
  const { content } = req.body;

  // Check if already submitted
  const existing = db.get('SELECT id FROM work_submissions WHERE work_item_id = ? AND user_id = ?', [id, userId]);
  if (existing) {
    return res.status(409).json({ error: 'You have already submitted this work. Contact your teacher to re-submit.' });
  }

  const filePath = req.file ? `/uploads/work/${req.file.filename}` : null;
  const fileName = req.file ? req.file.originalname : null;

  const result = db.run(
    'INSERT INTO work_submissions (work_item_id, user_id, content, file_path, file_name) VALUES (?, ?, ?, ?, ?)',
    [id, userId, content || null, filePath, fileName]
  );

  // Log activity
  db.run('INSERT INTO activity_log (user_id, session_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)',
    [userId, req.sessionID, 'submit_work', 'work_item', id]);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Work submitted successfully' });
});

// ============================================
// GET /api/work/:id/submissions — All submissions (admin)
// ============================================
router.get('/:id/submissions', requireTeacher, (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);

  const submissions = db.all(`
    SELECT ws.*, u.full_name, u.username
    FROM work_submissions ws
    JOIN users u ON u.id = ws.user_id
    WHERE ws.work_item_id = ?
    ORDER BY ws.submitted_at DESC
  `, [id]);

  res.json({ submissions });
});

// ============================================
// PUT /api/work/:id/submissions/:subId/grade — Grade a submission
// ============================================
router.put('/:id/submissions/:subId/grade', requireTeacher, (req, res) => {
  const db = getDb();
  const { score, feedback } = req.body;

  db.run(
    'UPDATE work_submissions SET score = ?, feedback = ?, graded_at = CURRENT_TIMESTAMP WHERE id = ?',
    [score !== undefined ? Number(score) : null, feedback || null, Number(req.params.subId)]
  );

  res.json({ message: 'Submission graded' });
});

module.exports = router;
