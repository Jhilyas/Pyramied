const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'pyramied.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;

async function initDatabase() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing DB from file, or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('[DB] Loaded existing database from:', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('[DB] Created new database');
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Run schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.run(schema);

  // Seed default admin if not exists
  const adminCheck = db.exec("SELECT id FROM users WHERE username = 'admin'");
  if (adminCheck.length === 0 || adminCheck[0].values.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run(
      "INSERT INTO users (username, password_hash, full_name, email, is_teacher) VALUES (?, ?, ?, ?, ?)",
      ['admin', hash, 'Administrator', 'admin@pyramied.local', 1]
    );
    console.log('[DB] Created default admin user (admin / admin123)');
  }

  // Seed demo student if not exists
  const studentCheck = db.exec("SELECT id FROM users WHERE username = 'student'");
  if (studentCheck.length === 0 || studentCheck[0].values.length === 0) {
    const hash = bcrypt.hashSync('student123', 10);
    db.run(
      "INSERT INTO users (username, password_hash, full_name, email, is_teacher) VALUES (?, ?, ?, ?, ?)",
      ['student', hash, 'Demo Student', 'student@pyramied.local', 0]
    );
    console.log('[DB] Created demo student user (student / student123)');
  }

  // Default site settings
  db.run("INSERT OR IGNORE INTO site_settings (key, value) VALUES ('site_name', 'Pyramied')");
  db.run("INSERT OR IGNORE INTO site_settings (key, value) VALUES ('site_logo', '/favicon.svg')");
  db.run("INSERT OR IGNORE INTO site_settings (key, value) VALUES ('primary_color', '#34C759')");

  // Save to disk
  saveDatabase();

  console.log('[DB] Database initialized successfully.');
  return db;
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper: wraps sql.js to feel like better-sqlite3
function getDb() {
  return {
    // Run a statement (INSERT, UPDATE, DELETE)
    run(sql, params = []) {
      db.run(sql, params);
      saveDatabase();
      return { lastInsertRowid: getLastInsertId() };
    },
    // Get one row
    get(sql, params = []) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return null;
    },
    // Get all rows
    all(sql, params = []) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    },
    // Execute raw SQL (for schema, etc.)
    exec(sql) {
      db.run(sql);
      saveDatabase();
    },
  };
}

function getLastInsertId() {
  const result = db.exec("SELECT last_insert_rowid() as id");
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0];
  }
  return 0;
}

module.exports = { initDatabase, getDb, saveDatabase };
