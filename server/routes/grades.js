const express = require('express');
const { getDb } = require('../db/init');
const { requireTeacher } = require('../middleware/auth');

const router = express.Router();

// ============================================
// GET /api/grades — Admin: full gradebook
// ============================================
router.get('/', requireTeacher, (req, res) => {
  const db = getDb();

  // Get all courses
  const courses = db.all('SELECT id, title FROM courses ORDER BY sort_order, title');

  // Get all students
  const students = db.all(`
    SELECT id, username, full_name, email FROM users
    WHERE is_teacher = 0 AND is_suspended = 0
    ORDER BY full_name
  `);

  // Get all work items with grades
  const workItems = db.all(`
    SELECT w.id, w.title, w.course_id, w.type, w.max_score, w.due_date,
      c.title as course_title
    FROM work_items w
    LEFT JOIN courses c ON c.id = w.course_id
    WHERE w.is_published = 1
    ORDER BY w.course_id, w.created_at
  `);

  // Get all submissions with scores
  const submissions = db.all(`
    SELECT ws.id, ws.work_item_id, ws.user_id, ws.score, ws.feedback,
      ws.submitted_at, ws.graded_at
    FROM work_submissions ws
    ORDER BY ws.submitted_at DESC
  `);

  // Get enrollments
  const enrollments = db.all('SELECT user_id, course_id FROM enrollments');

  res.json({ courses, students, workItems, submissions, enrollments });
});

// ============================================
// GET /api/grades/student — Student: my grades
// ============================================
router.get('/student', (req, res) => {
  const db = getDb();
  const userId = req.session.userId;

  const grades = db.all(`
    SELECT ws.id, ws.work_item_id, ws.score, ws.feedback, ws.submitted_at,
      ws.graded_at, w.title as work_title, w.type as work_type,
      w.max_score, w.due_date, c.title as course_title, c.id as course_id
    FROM work_submissions ws
    JOIN work_items w ON w.id = ws.work_item_id
    LEFT JOIN courses c ON c.id = w.course_id
    WHERE ws.user_id = ?
    ORDER BY ws.submitted_at DESC
  `, [userId]);

  // Get enrolled courses
  const courses = db.all(`
    SELECT c.id, c.title FROM courses c
    JOIN enrollments e ON e.course_id = c.id
    WHERE e.user_id = ?
    ORDER BY c.title
  `, [userId]);

  // Get total work items available per course
  const availableWork = db.all(`
    SELECT w.course_id, COUNT(*) as total
    FROM work_items w
    JOIN enrollments e ON e.course_id = w.course_id AND e.user_id = ?
    WHERE w.is_published = 1
    GROUP BY w.course_id
  `, [userId]);

  res.json({ grades, courses, availableWork });
});

// ============================================
// PUT /api/grades/:submissionId — Admin: update grade
// ============================================
router.put('/:submissionId', requireTeacher, (req, res) => {
  const db = getDb();
  const { score, feedback } = req.body;
  const subId = Number(req.params.submissionId);

  db.run(
    'UPDATE work_submissions SET score = ?, feedback = ?, graded_at = CURRENT_TIMESTAMP WHERE id = ?',
    [score !== undefined ? Number(score) : null, feedback || null, subId]
  );

  res.json({ message: 'Grade updated' });
});

module.exports = router;
