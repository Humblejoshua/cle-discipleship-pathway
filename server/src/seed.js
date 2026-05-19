const { initDb, get, all, run, saveDb } = require('./db');
const { hashPassword } = require('./framework');

async function seed() {
  await initDb();

  const existingAdmin = get("SELECT id FROM users WHERE role = 'admin'");
  if (!existingAdmin) {
    run("INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      ['Admin Pastor', 'admin@clechurch.org', '+1234567890', hashPassword('admin123'), 'admin']);
    saveDb();
    console.log('Created admin: admin@clechurch.org / admin123');
  }

  const existingSeries = get('SELECT id FROM series LIMIT 1');
  if (!existingSeries) {
    const series = [
      ['Foundations of Faith', 'Build your foundation in the Christian faith.', 1],
      ['Understanding Righteousness', 'Deepen your understanding of righteousness through faith.', 2],
      ['Walking in the Spirit', 'Learn to walk daily in the power of the Holy Spirit.', 3],
    ];
    for (const [title, desc, order] of series) {
      const sr = run('INSERT INTO series (title, description, order_in_pathway) VALUES (?, ?, ?)', [title, desc, order]);
      saveDb();
      for (let ci = 0; ci < 2; ci++) {
        const cr = run(
          'INSERT INTO classes (series_id, title, description, content_text, video_url, estimated_minutes, order_in_series, is_offline_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [sr.lastInsertRowid, ci === 0 ? `Introduction to ${title}` : `${title} - Session 2`, `Lesson about ${title}`, '<h2>Lesson Content</h2><p>Study this material carefully.</p><blockquote>"Faith comes from hearing" - Romans 10:17</blockquote>', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 15, ci + 1, 1]
        );
        saveDb();
        const questions = [
          'What is the main theme of this lesson?',
          'Which Scripture is referenced?',
          'What practice is encouraged?',
        ];
        for (let qi = 0; qi < questions.length; qi++) {
          const qr = run('INSERT INTO questions (class_id, question_text, is_multi_choice, order_in_test) VALUES (?, ?, ?, ?)', [cr.lastInsertRowid, questions[qi], 0, qi + 1]);
          saveDb();
          const qid = qr.lastInsertRowid;
          const opts = [
            ['Option A', 0], ['Option B', 0], ['Correct Answer', 1], ['Option D', 0],
          ];
          for (let oi = 0; oi < opts.length; oi++) {
            run('INSERT INTO options (question_id, option_text, is_correct, order_in_question) VALUES (?, ?, ?, ?)', [qid, opts[oi][0], opts[oi][1], oi + 1]);
          }
          saveDb();
        }
      }
    }
    console.log('Created sample data');
  }
  console.log('Seed complete!');
}

seed().catch(e => { console.error(e); process.exit(1); });
