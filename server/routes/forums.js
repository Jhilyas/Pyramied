const express = require('express');
const { getDb } = require('../db/init');
const { requireTeacher } = require('../middleware/auth');

const router = express.Router();

// ============================================
// GET /api/forums — List all forums
// ============================================
router.get('/', (req, res) => {
  const db = getDb();

  const forums = db.all(`
    SELECT f.*,
      c.id as course_id,
      c.title as course_title,
      (SELECT COUNT(*) FROM forum_posts WHERE forum_id = f.id AND parent_id IS NULL) as topic_count,
      (SELECT COUNT(*) FROM forum_posts WHERE forum_id = f.id) as post_count,
      (SELECT fp.created_at FROM forum_posts fp WHERE fp.forum_id = f.id ORDER BY fp.created_at DESC LIMIT 1) as last_post_at
    FROM forums f
    LEFT JOIN modules m ON m.id = f.module_id
    LEFT JOIN courses c ON c.id = m.course_id
    ORDER BY f.created_at DESC
  `);

  res.json({ forums });
});

// ============================================
// POST /api/forums — Create a forum (admin only)
// ============================================
router.post('/', requireTeacher, (req, res) => {
  const { title, description, course_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const db = getDb();

  // If course_id provided, we need to find/create a module to attach the forum to
  let moduleId = null;
  if (course_id) {
    // Try to find an existing "Forums" module in this course
    let forumModule = db.get(
      "SELECT id FROM modules WHERE course_id = ? AND title = 'Forums'",
      [Number(course_id)]
    );
    if (!forumModule) {
      const result = db.run(
        "INSERT INTO modules (course_id, title, description, sort_order) VALUES (?, 'Forums', 'Discussion forums', 999)",
        [Number(course_id)]
      );
      moduleId = result.lastInsertRowid;
    } else {
      moduleId = forumModule.id;
    }
  }

  const result = db.run(
    'INSERT INTO forums (module_id, title, description) VALUES (?, ?, ?)',
    [moduleId, title, description || null]
  );

  req.app.get('io').emit('content:updated');

  res.status(201).json({ id: result.lastInsertRowid, message: 'Forum created' });
});

// ============================================
// DELETE /api/forums/:id — Delete a forum (admin only)
// ============================================
router.delete('/:id', requireTeacher, (req, res) => {
  const db = getDb();
  db.run('DELETE FROM forum_posts WHERE forum_id = ?', [Number(req.params.id)]);
  db.run('DELETE FROM forums WHERE id = ?', [Number(req.params.id)]);
  
  req.app.get('io').emit('content:updated');
  
  res.json({ message: 'Forum deleted' });
});

// ============================================
// GET /api/forums/:id/posts — Get forum posts
// ============================================
router.get('/:id/posts', (req, res) => {
  const db = getDb();
  const forumId = Number(req.params.id);

  // Get the forum info
  const forum = db.get('SELECT * FROM forums WHERE id = ?', [forumId]);
  if (!forum) return res.status(404).json({ error: 'Forum not found' });

  // Get all posts with user info
  const posts = db.all(`
    SELECT fp.*, u.full_name, u.username, u.avatar_url
    FROM forum_posts fp
    JOIN users u ON u.id = fp.user_id
    WHERE fp.forum_id = ?
    ORDER BY fp.created_at ASC
  `, [forumId]);

  // Build thread structure: top-level posts + replies
  const threads = posts.filter(p => !p.parent_id).map(topic => ({
    ...topic,
    replies: posts.filter(p => p.parent_id === topic.id),
  }));

  res.json({ forum, threads });
});

// ============================================
// POST /api/forums/:id/posts — Create a post
// ============================================
router.post('/:id/posts', (req, res) => {
  const db = getDb();
  const forumId = Number(req.params.id);
  const { content, parent_id } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  const result = db.run(
    'INSERT INTO forum_posts (forum_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
    [forumId, req.session.userId, parent_id || null, content]
  );

  // Log activity
  db.run('INSERT INTO activity_log (user_id, session_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)',
    [req.session.userId, req.sessionID, 'forum_post', 'forum', forumId]);

  req.app.get('io').emit('content:updated');

  res.status(201).json({ id: result.lastInsertRowid, message: 'Post created' });
});

// ============================================
// DELETE /api/forums/:id/posts/:postId — Delete a post (admin or author)
// ============================================
router.delete('/:id/posts/:postId', (req, res) => {
  const db = getDb();
  const postId = Number(req.params.postId);
  const post = db.get('SELECT * FROM forum_posts WHERE id = ?', [postId]);

  if (!post) return res.status(404).json({ error: 'Post not found' });

  if (!req.session.isTeacher && post.user_id !== req.session.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // Delete replies first, then the post
  db.run('DELETE FROM forum_posts WHERE parent_id = ?', [postId]);
  db.run('DELETE FROM forum_posts WHERE id = ?', [postId]);
  
  req.app.get('io').emit('content:updated');
  
  res.json({ message: 'Post deleted' });
});

module.exports = router;
