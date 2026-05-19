const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data.db');

let db = null;
let SQL = null;

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

async function initDb() {
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
  initSchema();
  saveDb();
  return db;
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'disciple' CHECK(role IN ('admin','disciple')),
      created_at TEXT DEFAULT (datetime('now')),
      last_active TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      image_url TEXT,
      order_in_pathway INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      content_text TEXT DEFAULT '',
      video_url TEXT,
      pdf_file_path TEXT,
      estimated_minutes INTEGER DEFAULT 15,
      order_in_series INTEGER NOT NULL DEFAULT 0,
      is_offline_enabled INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      is_multi_choice INTEGER NOT NULL DEFAULT 0,
      order_in_test INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      option_text TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      order_in_question INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      score REAL NOT NULL DEFAULT 0,
      max_score INTEGER NOT NULL DEFAULT 0,
      is_passed INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 1,
      completed_at TEXT DEFAULT (datetime('now')),
      responses TEXT DEFAULT '[]'
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS user_class_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','completed')),
      read_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      badge_icon TEXT DEFAULT '\u{1F3C6}',
      type TEXT NOT NULL,
      achieved_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      issue_date TEXT DEFAULT (datetime('now')),
      pdf_url TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_classes_series ON classes(series_id)',
    'CREATE INDEX IF NOT EXISTS idx_questions_class ON questions(class_id)',
    'CREATE INDEX IF NOT EXISTS idx_options_question ON options(question_id)',
    'CREATE INDEX IF NOT EXISTS idx_test_results_user ON test_results(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_test_results_class ON test_results(class_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_user_class_progress ON user_class_progress(user_id, class_id)',
    'CREATE INDEX IF NOT EXISTS idx_milestones_user ON milestones(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id)',
  ];
  for (const idx of indexes) db.run(idx);
}

function prepare(sql) {
  return db.prepare(sql);
}

function exec(sql) {
  return db.exec(sql);
}

function run(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) stmt.bind(params);
  stmt.step();
  const changes = db.getRowsModified();
  const lastInsertRowid = tryGetLastInsertId();
  stmt.free();
  return { changes, lastInsertRowid };
}

function tryGetLastInsertId() {
  try {
    const result = db.exec('SELECT last_insert_rowid() as id');
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0];
    }
  } catch {}
  return 0;
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

module.exports = { initDb, getDb, saveDb, run, get, all, SQL };
