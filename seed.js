const fs = require('fs');
const path = require('path');

async function seed() {
  const { initDatabase, getDb, saveDatabase } = require('./server/db/init.js');
  await initDatabase();
  const db = getDb();
  
  // Create a default course if none exist
  let course = db.get("SELECT * FROM courses LIMIT 1");
  let courseId;
  
  if (!course) {
    console.log("No course found, creating 'Introduction to Web Design'...");
    const result = db.run(
      "INSERT INTO courses (title, description, format, is_visible) VALUES (?, ?, ?, ?)",
      ["Introduction to Web Design", "Learn how to build beautiful, modern websites.", "weekly", 1]
    );
    courseId = result.lastInsertRowid;
  } else {
    courseId = course.id;
  }
  
  // Find demo student
  const student = db.get("SELECT id FROM users WHERE username = 'student'");
  
  if (student && courseId) {
    const enrolled = db.get("SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?", [student.id, courseId]);
    if (!enrolled) {
      db.run("INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)", [student.id, courseId]);
      console.log(`Enrolled demo student (ID: ${student.id}) in course (ID: ${courseId})`);
    } else {
      console.log("Demo student is already enrolled in the course.");
    }
  }
  
  saveDatabase();
  console.log("Seeding complete.");
}

seed().catch(console.error);
