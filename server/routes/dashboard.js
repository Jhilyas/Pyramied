const express = require('express');
const { getDb } = require('../db/init');

const router = express.Router();

// GET /api/dashboard/admin
router.get('/admin', (req, res) => {
  if (!req.session.isTeacher) return res.status(403).json({ error: 'Teacher access required' });

  const db = getDb();
  const courses = db.get('SELECT COUNT(*) as count FROM courses WHERE is_visible = 1');
  const students = db.get('SELECT COUNT(*) as count FROM users WHERE is_teacher = 0 AND is_suspended = 0');
  const submissions = db.get('SELECT COUNT(*) as count FROM submissions');
  const quizAttempts = db.get('SELECT COUNT(*) as count FROM quiz_attempts');
  const workItems = db.get('SELECT COUNT(*) as count FROM work_items WHERE is_published = 1');
  const workSubmissions = db.get('SELECT COUNT(*) as count FROM work_submissions');

  const recentActivity = db.all(
    `SELECT al.*, u.full_name as user_name
     FROM activity_log al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC
     LIMIT 20`
  );

  res.json({
    stats: {
      courses: courses ? courses.count : 0,
      students: students ? students.count : 0,
      submissions: submissions ? submissions.count : 0,
      quizAttempts: quizAttempts ? quizAttempts.count : 0,
      workItems: workItems ? workItems.count : 0,
      workSubmissions: workSubmissions ? workSubmissions.count : 0,
    },
    recentActivity,
  });
});

// GET /api/dashboard/student
router.get('/student', (req, res) => {
  const userId = req.session.userId;
  const db = getDb();

  const courses = db.all(
    `SELECT c.*
     FROM courses c
     WHERE c.is_visible = 1
     ORDER BY c.sort_order`,
    []
  );

  // Add progress (simplified — count completions vs total resources)
  const coursesWithProgress = courses.map((c) => {
    const totalRes = db.get(
      `SELECT COUNT(*) as count FROM resources r JOIN modules m ON m.id = r.module_id WHERE m.course_id = ?`,
      [c.id]
    );
    const completedRes = db.get(
      `SELECT COUNT(*) as count FROM completions comp
       JOIN resources r2 ON r2.id = comp.resource_id AND comp.resource_type = 'resource'
       JOIN modules m2 ON m2.id = r2.module_id
       WHERE m2.course_id = ? AND comp.user_id = ?`,
      [c.id, userId]
    );
    const total = totalRes ? totalRes.count : 0;
    const completed = completedRes ? completedRes.count : 0;
    return {
      ...c,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  // Upcoming deadlines
  const upcoming = db.all(
    `SELECT 'assignment' as type, a.title, a.due_date, c.title as course_title
     FROM assignments a
     JOIN modules m ON m.id = a.module_id
     JOIN courses c ON c.id = m.course_id
     WHERE c.is_visible = 1 AND a.due_date > datetime('now')
     UNION ALL
     SELECT 'quiz' as type, q.title, q.due_date, c.title as course_title
     FROM quizzes q
     JOIN modules m ON m.id = q.module_id
     JOIN courses c ON c.id = m.course_id
     WHERE c.is_visible = 1 AND q.due_date > datetime('now')
     ORDER BY due_date ASC
     LIMIT 6`
  );

  res.json({ courses: coursesWithProgress, upcoming });
});

module.exports = router;
