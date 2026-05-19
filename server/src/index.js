const { createApp, sendJson, sendFile, serveStatic, jwtSign, jwtVerify, hashPassword, verifyPassword, authenticateToken, requireAdmin } = require('./framework');
const { initDb, getDb, saveDb, get, all, run } = require('./db');
const PDFDocument = require('./pdf');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const CERTS_DIR = path.join(__dirname, '..', 'certificates');

async function main() {
  await initDb();
  console.log('Database initialized');

  const app = createApp();

  // Auth routes
  app.post('/api/auth/signup', (req, res) => {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !password) return sendJson(res, 400, { error: 'Name, phone, and password are required' });
    const existing = get('SELECT id FROM users WHERE phone = ? OR (email = ? AND email IS NOT NULL)', [phone, email || '']);
    if (existing) return sendJson(res, 409, { error: 'Phone or email already registered' });
    const hash = hashPassword(password);
    const result = run('INSERT INTO users (name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, ?)', [name, phone, email || null, hash, 'disciple']);
    saveDb();
    const user = get('SELECT id, name, email, phone, role FROM users WHERE id = ?', [result.lastInsertRowid]);
    const token = jwtSign({ id: user.id, role: user.role, name: user.name });
    sendJson(res, 201, { user, token });
  });

  app.post('/api/auth/login', (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) return sendJson(res, 400, { error: 'Login and password are required' });
    const user = get('SELECT * FROM users WHERE email = ? OR phone = ?', [login, login]);
    if (!user || !verifyPassword(password, user.password_hash)) return sendJson(res, 401, { error: 'Invalid credentials' });
    run("UPDATE users SET last_active = datetime('now') WHERE id = ?", [user.id]);
    saveDb();
    const token = jwtSign({ id: user.id, role: user.role, name: user.name });
    sendJson(res, 200, { user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }, token });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    const u = get('SELECT id, name, email, phone, role, created_at, last_active FROM users WHERE id = ?', [user.id]);
    if (!u) return sendJson(res, 404, { error: 'User not found' });
    sendJson(res, 200, { user: u });
  });

  app.put('/api/auth/profile', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    const { name, email } = req.body;
    run("UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), last_active = datetime('now') WHERE id = ?", [name || null, email || null, user.id]);
    saveDb();
    const u = get('SELECT id, name, email, phone, role FROM users WHERE id = ?', [user.id]);
    sendJson(res, 200, { user: u });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { login } = req.body;
    if (!login) return sendJson(res, 400, { error: 'Email or phone is required' });
    const user = get('SELECT id, name, email FROM users WHERE email = ? OR phone = ?', [login, login]);
    if (!user) return sendJson(res, 200, { message: 'If the account exists, a reset link has been sent.' });
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    run('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expiresAt]);
    saveDb();
    console.log(`\n  PASSWORD RESET for ${user.name} (${user.email || login}):\n  Token: ${token}\n  Link: http://localhost:${PORT}/reset-password?token=${token}\n`);
    sendJson(res, 200, { message: 'If the account exists, a reset link has been sent.' });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return sendJson(res, 400, { error: 'Token and new password are required' });
    if (password.length < 6) return sendJson(res, 400, { error: 'Password must be at least 6 characters' });
    const record = get("SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')", [token]);
    if (!record) return sendJson(res, 400, { error: 'Invalid or expired reset token' });
    const hash = hashPassword(password);
    run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, record.user_id]);
    run('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [record.id]);
    saveDb();
    sendJson(res, 200, { message: 'Password reset successfully. You can now log in.' });
  });

  // Series routes
  app.get('/api/series', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    const series = all('SELECT * FROM series ORDER BY order_in_pathway ASC');
    sendJson(res, 200, { series });
  });

  app.get('/api/series/:id', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    const serie = get('SELECT * FROM series WHERE id = ?', [req.params.id]);
    if (!serie) return sendJson(res, 404, { error: 'Series not found' });
    sendJson(res, 200, { series: serie });
  });

  app.post('/api/series', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user || !requireAdmin(req, res)) return;
    const { title, description, order_in_pathway } = req.body;
    if (!title) return sendJson(res, 400, { error: 'Title is required' });
    const result = run('INSERT INTO series (title, description, order_in_pathway) VALUES (?, ?, ?)', [title, description || '', order_in_pathway || 0]);
    saveDb();
    const series = get('SELECT * FROM series WHERE id = ?', [result.lastInsertRowid]);
    sendJson(res, 201, { series });
  });

  app.put('/api/series/:id', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user || !requireAdmin(req, res)) return;
    const { title, description, image_url, order_in_pathway, is_active } = req.body;
    run('UPDATE series SET title = COALESCE(?, title), description = COALESCE(?, description), image_url = COALESCE(?, image_url), order_in_pathway = COALESCE(?, order_in_pathway), is_active = COALESCE(?, is_active), updated_at = datetime(\'now\') WHERE id = ?', [title || null, description ?? null, image_url ?? null, order_in_pathway ?? null, is_active ?? null, req.params.id]);
    saveDb();
    const series = get('SELECT * FROM series WHERE id = ?', [req.params.id]);
    if (!series) return sendJson(res, 404, { error: 'Series not found' });
    sendJson(res, 200, { series });
  });

  app.delete('/api/series/:id', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user || !requireAdmin(req, res)) return;
    const existing = get('SELECT id FROM series WHERE id = ?', [req.params.id]);
    if (!existing) return sendJson(res, 404, { error: 'Series not found' });
    run('DELETE FROM series WHERE id = ?', [req.params.id]);
    saveDb();
    sendJson(res, 200, { message: 'Deleted' });
  });

  // Helper: check if the previous class in the same series is passed
  function isPreviousClassPassed(userId, classId, userRole) {
    if (userRole === 'admin') return true;
    const cls = get('SELECT series_id, order_in_series FROM classes WHERE id = ?', [classId]);
    if (!cls || cls.order_in_series === 0) return true;
    const prev = get('SELECT id FROM classes WHERE series_id = ? AND order_in_series = ? AND is_published = 1', [cls.series_id, cls.order_in_series - 1]);
    if (!prev) return true;
    const passed = get('SELECT id FROM test_results WHERE user_id = ? AND class_id = ? AND is_passed = 1', [userId, prev.id]);
    return !!passed;
  }

  // Class routes
  app.get('/api/classes/series/:seriesId', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    const classes = all('SELECT * FROM classes WHERE series_id = ? AND is_published = 1 ORDER BY order_in_series ASC', [req.params.seriesId]);
    const withLockStatus = classes.map(cls => ({
      ...cls,
      locked: !isPreviousClassPassed(user.id, cls.id, user.role)
    }));
    sendJson(res, 200, { classes: withLockStatus });
  });

  app.get('/api/classes/:id', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    if (!isPreviousClassPassed(user.id, req.params.id, user.role)) return sendJson(res, 403, { error: 'Complete the previous class first' });
    const cls = get('SELECT * FROM classes WHERE id = ?', [req.params.id]);
    if (!cls) return sendJson(res, 404, { error: 'Class not found' });
    sendJson(res, 200, { class: cls });
  });

  app.post('/api/classes', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user || !requireAdmin(req, res)) return;
    const { series_id, title, description, content_text, video_url, estimated_minutes, order_in_series, is_offline_enabled, is_published } = req.body;
    if (!series_id || !title) return sendJson(res, 400, { error: 'Series ID and title are required' });

    let pdfPath = null;
    const files = req.body._files;
    if (files && files.pdf) {
      const filename = `class-${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), files.pdf.data);
      pdfPath = '/uploads/' + filename;
    }

    const result = run('INSERT INTO classes (series_id, title, description, content_text, video_url, pdf_file_path, estimated_minutes, order_in_series, is_offline_enabled, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [series_id, title, description || '', content_text || '', video_url || '', pdfPath, estimated_minutes || 15, order_in_series || 0, is_offline_enabled ? 1 : 0, is_published !== undefined ? (is_published ? 1 : 0) : 1]);
    saveDb();
    const cls = get('SELECT * FROM classes WHERE id = ?', [result.lastInsertRowid]);
    sendJson(res, 201, { class: cls });
  });

  app.put('/api/classes/:id', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user || !requireAdmin(req, res)) return;
    const existing = get('SELECT * FROM classes WHERE id = ?', [req.params.id]);
    if (!existing) return sendJson(res, 404, { error: 'Class not found' });
    const { title, description, content_text, video_url, estimated_minutes, order_in_series, is_offline_enabled, is_published } = req.body;

    let pdfPath = undefined;
    const files = req.body._files;
    if (files && files.pdf) {
      const filename = `class-${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), files.pdf.data);
      pdfPath = '/uploads/' + filename;
    }

    run('UPDATE classes SET title = COALESCE(?, title), description = COALESCE(?, description), content_text = COALESCE(?, content_text), video_url = COALESCE(?, video_url), pdf_file_path = COALESCE(?, pdf_file_path), estimated_minutes = COALESCE(?, estimated_minutes), order_in_series = COALESCE(?, order_in_series), is_offline_enabled = COALESCE(?, is_offline_enabled), is_published = COALESCE(?, is_published), updated_at = datetime(\'now\') WHERE id = ?', [title || null, description ?? null, content_text ?? null, video_url ?? null, pdfPath ?? null, estimated_minutes ?? null, order_in_series ?? null, is_offline_enabled !== undefined ? (is_offline_enabled ? 1 : 0) : null, is_published !== undefined ? (is_published ? 1 : 0) : null, req.params.id]);
    saveDb();
    const cls = get('SELECT * FROM classes WHERE id = ?', [req.params.id]);
    sendJson(res, 200, { class: cls });
  });

  app.delete('/api/classes/:id', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user || !requireAdmin(req, res)) return;
    const existing = get('SELECT id FROM classes WHERE id = ?', [req.params.id]);
    if (!existing) return sendJson(res, 404, { error: 'Class not found' });
    run('DELETE FROM classes WHERE id = ?', [req.params.id]);
    saveDb();
    sendJson(res, 200, { message: 'Deleted' });
  });

  // Test routes
  app.get('/api/tests/:classId', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    if (!isPreviousClassPassed(user.id, req.params.classId, user.role)) return sendJson(res, 403, { error: 'Complete the previous class first' });
    const questions = all('SELECT * FROM questions WHERE class_id = ? ORDER BY order_in_test ASC', [req.params.classId]);
    const qs = questions.map(q => {
      const options = all('SELECT id, option_text, order_in_question FROM options WHERE question_id = ? ORDER BY order_in_question ASC', [q.id]);
      return { ...q, options };
    });
    const cls = get('SELECT estimated_minutes FROM classes WHERE id = ?', [req.params.classId]);
    const timerMinutes = cls ? Math.min(cls.estimated_minutes || 5, 5) : 5;
    sendJson(res, 200, { questions: qs, timer_minutes: timerMinutes });
  });

  app.post('/api/tests/:classId/submit', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    if (!isPreviousClassPassed(user.id, req.params.classId, user.role)) return sendJson(res, 403, { error: 'Complete the previous class first' });
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) return sendJson(res, 400, { error: 'Answers array is required' });
    const classId = req.params.classId;
    const userId = user.id;
    const questions = all('SELECT * FROM questions WHERE class_id = ? ORDER BY order_in_test ASC', [classId]);
    let correct = 0;
    const total = questions.length;
    const results = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const userAnswer = answers[i];
      const correctOpts = all('SELECT id, option_text FROM options WHERE question_id = ? AND is_correct = 1', [q.id]);
      const allOpts = all('SELECT id, option_text, is_correct FROM options WHERE question_id = ? ORDER BY order_in_question ASC', [q.id]);
      const userSelected = q.is_multi_choice ? (Array.isArray(userAnswer) ? userAnswer : [userAnswer]) : [userAnswer];
      const correctIds = correctOpts.map(o => o.id).sort();
      const userIds = userSelected.filter(Boolean).map(Number).sort();
      const isCorrect = JSON.stringify(correctIds) === JSON.stringify(userIds);
      if (isCorrect) correct++;
      results.push({ question_text: q.question_text, is_multi_choice: !!q.is_multi_choice, is_correct: isCorrect, correct_options: correctOpts, all_options: allOpts, user_answers: userSelected });
    }
    const score = total > 0 ? correct / total : 0;
    const isPassed = score >= 0.7;
    const maxAttempts = 3;
    const existingResult = get('SELECT * FROM test_results WHERE user_id = ? AND class_id = ? ORDER BY completed_at DESC LIMIT 1', [userId, classId]);
    const currentAttempts = existingResult ? existingResult.attempts : 0;
    if (currentAttempts >= maxAttempts) return sendJson(res, 400, { error: 'Maximum attempts reached for this test' });
    run('INSERT INTO test_results (user_id, class_id, score, max_score, is_passed, attempts, responses) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, classId, score, total, isPassed ? 1 : 0, currentAttempts + 1, JSON.stringify(results)]);
    saveDb();
    run("UPDATE user_class_progress SET status = 'completed', read_at = datetime('now') WHERE user_id = ? AND class_id = ?", [userId, classId]);
    saveDb();
    checkMilestones(userId);
    const seriesId = get('SELECT series_id FROM classes WHERE id = ?', [classId])?.series_id;
    if (seriesId) checkCertificate(userId, seriesId);
    sendJson(res, 200, { score, max_score: total, is_passed: isPassed, attempts: currentAttempts + 1, max_attempts: maxAttempts, results });
  });

  app.get('/api/tests/:classId/result', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    const result = get('SELECT * FROM test_results WHERE user_id = ? AND class_id = ? ORDER BY completed_at DESC LIMIT 1', [user.id, req.params.classId]);
    if (!result) return sendJson(res, 404, { error: 'No test result found' });
    result.responses = JSON.parse(result.responses || '[]');
    sendJson(res, 200, { result });
  });

  app.get('/api/tests/:classId/status', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    const result = get('SELECT * FROM test_results WHERE user_id = ? AND class_id = ? ORDER BY completed_at DESC LIMIT 1', [user.id, req.params.classId]);
    sendJson(res, 200, { has_taken: !!result, is_passed: result ? !!result.is_passed : false, attempts: result ? result.attempts : 0, max_attempts: 3 });
  });

  app.post('/api/tests/:classId', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user || !requireAdmin(req, res)) return;
    const { question_text, is_multi_choice, order_in_test, options } = req.body;
    if (!question_text) return sendJson(res, 400, { error: 'Question text is required' });
    const result = run('INSERT INTO questions (class_id, question_text, is_multi_choice, order_in_test) VALUES (?, ?, ?, ?)', [req.params.classId, question_text, is_multi_choice ? 1 : 0, order_in_test || 0]);
    saveDb();
    const questionId = result.lastInsertRowid;
    if (options && Array.isArray(options)) {
      options.forEach((opt, i) => {
        run('INSERT INTO options (question_id, option_text, is_correct, order_in_question) VALUES (?, ?, ?, ?)', [questionId, opt.option_text, opt.is_correct ? 1 : 0, i + 1]);
      });
      saveDb();
    }
    const question = get('SELECT * FROM questions WHERE id = ?', [questionId]);
    const opts = all('SELECT * FROM options WHERE question_id = ? ORDER BY order_in_question ASC', [questionId]);
    sendJson(res, 201, { question: { ...question, options: opts } });
  });

  app.put('/api/tests/:classId', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user || !requireAdmin(req, res)) return;
    const { question_id, question_text, is_multi_choice, order_in_test, options } = req.body;
    if (!question_id) return sendJson(res, 400, { error: 'Question ID is required' });
    run('UPDATE questions SET question_text = ?, is_multi_choice = ?, order_in_test = ? WHERE id = ?', [question_text, is_multi_choice ? 1 : 0, order_in_test || 0, question_id]);
    saveDb();
    if (options && Array.isArray(options)) {
      run('DELETE FROM options WHERE question_id = ?', [question_id]);
      saveDb();
      options.forEach((opt, i) => {
        run('INSERT INTO options (question_id, option_text, is_correct, order_in_question) VALUES (?, ?, ?, ?)', [question_id, opt.option_text, opt.is_correct ? 1 : 0, i + 1]);
      });
      saveDb();
    }
    const question = get('SELECT * FROM questions WHERE id = ?', [question_id]);
    const opts = all('SELECT * FROM options WHERE question_id = ? ORDER BY order_in_question ASC', [question_id]);
    sendJson(res, 200, { question: { ...question, options: opts } });
  });

  app.delete('/api/tests/:classId', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user || !requireAdmin(req, res)) return;
    const { question_id } = req.body;
    if (!question_id) return sendJson(res, 400, { error: 'Question ID is required' });
    run('DELETE FROM questions WHERE id = ?', [question_id]);
    saveDb();
    sendJson(res, 200, { message: 'Deleted' });
  });

  // Progress routes
  app.get('/api/progress/pathway', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    const userId = user.id;
    const seriesList = all('SELECT * FROM series WHERE is_active = 1 ORDER BY order_in_pathway ASC');
    const pathway = seriesList.map(series => {
      const classes = all('SELECT * FROM classes WHERE series_id = ? AND is_published = 1 ORDER BY order_in_series ASC', [series.id]);
      const totalClasses = classes.length;
      let completedClasses = 0;
      const classStatuses = classes.map(cls => {
        const progress = get('SELECT status FROM user_class_progress WHERE user_id = ? AND class_id = ?', [userId, cls.id]);
        const testResult = get('SELECT is_passed, score FROM test_results WHERE user_id = ? AND class_id = ? AND is_passed = 1 ORDER BY completed_at DESC LIMIT 1', [userId, cls.id]);
        const isCompleted = testResult ? true : false;
        const status = progress ? progress.status : 'not_started';
        if (isCompleted) completedClasses++;
        return { ...cls, status: isCompleted ? 'completed' : status, test_passed: isCompleted, score: testResult ? testResult.score : null, locked: !isPreviousClassPassed(userId, cls.id, user.role) };
      });
      const seriesCompleted = totalClasses > 0 && completedClasses === totalClasses;
      const cert = seriesCompleted ? get('SELECT id, issue_date FROM certificates WHERE user_id = ? AND series_id = ?', [userId, series.id]) : null;
      return { ...series, total_classes: totalClasses, completed_classes: completedClasses, percentage: totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0, is_completed: seriesCompleted, certificate: cert, classes: classStatuses };
    });
    const totalAll = pathway.reduce((sum, s) => sum + s.total_classes, 0);
    const completedAll = pathway.reduce((sum, s) => sum + s.completed_classes, 0);
    sendJson(res, 200, { pathway, totals: { total_classes: totalAll, completed_classes: completedAll, percentage: totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0 } });
  });

  app.post('/api/progress/class/:classId/read', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    const userId = user.id;
    const classId = req.params.classId;
    const existing = get('SELECT id FROM user_class_progress WHERE user_id = ? AND class_id = ?', [userId, classId]);
    if (existing) {
      run("UPDATE user_class_progress SET status = 'in_progress', read_at = datetime('now') WHERE user_id = ? AND class_id = ?", [userId, classId]);
    } else {
      run("INSERT INTO user_class_progress (user_id, class_id, status, read_at) VALUES (?, ?, 'in_progress', datetime('now'))", [userId, classId]);
    }
    saveDb();
    sendJson(res, 200, { message: 'Class marked as read', status: 'in_progress' });
  });

  app.get('/api/progress/milestones', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    const milestones = all('SELECT * FROM milestones WHERE user_id = ? ORDER BY achieved_at DESC', [user.id]);
    sendJson(res, 200, { milestones });
  });

  app.get('/api/progress/certificates', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    const certs = all('SELECT c.*, s.title as series_title FROM certificates c JOIN series s ON s.id = c.series_id WHERE c.user_id = ? ORDER BY c.issue_date DESC', [user.id]);
    sendJson(res, 200, { certificates: certs });
  });

  app.get('/api/progress/stats', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    const userId = user.id;
    const totalClasses = get('SELECT COUNT(*) as c FROM classes WHERE is_published = 1').c;
    const completed = get('SELECT COUNT(DISTINCT class_id) as c FROM test_results WHERE user_id = ? AND is_passed = 1', [userId]).c;
    const avgScore = get('SELECT AVG(score) as avg FROM test_results WHERE user_id = ?', [userId]).avg || 0;
    const milestones = get('SELECT COUNT(*) as c FROM milestones WHERE user_id = ?', [userId]).c;
    const certs = get('SELECT COUNT(*) as c FROM certificates WHERE user_id = ?', [userId]).c;
    sendJson(res, 200, { total_classes: totalClasses, completed_classes: completed, percentage: totalClasses > 0 ? Math.round((completed / totalClasses) * 100) : 0, average_score: Math.round(avgScore * 100), milestones_count: milestones, certificates_count: certs });
  });

  // Report routes
  app.get('/api/reports/overview', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user || !requireAdmin(req, res)) return;
    const totalDisciples = get("SELECT COUNT(*) as c FROM users WHERE role = 'disciple'").c;
    const totalSeries = get('SELECT COUNT(*) as c FROM series').c;
    const totalClasses = get('SELECT COUNT(*) as c FROM classes WHERE is_published = 1').c;
    const totalTestsPassed = get('SELECT COUNT(*) as c FROM test_results WHERE is_passed = 1').c;
    const totalCertificates = get('SELECT COUNT(*) as c FROM certificates').c;
    const avgCompletion = get("SELECT COALESCE(AVG(c.completed), 0) as avg FROM (SELECT COUNT(DISTINCT tr.class_id) * 1.0 / NULLIF((SELECT COUNT(*) FROM classes WHERE is_published = 1), 0) as completed FROM users u LEFT JOIN test_results tr ON tr.user_id = u.id AND tr.is_passed = 1 WHERE u.role = 'disciple' GROUP BY u.id) c").avg || 0;
    sendJson(res, 200, { total_disciples: totalDisciples, total_series: totalSeries, total_classes: totalClasses, total_tests_passed: totalTestsPassed, total_certificates: totalCertificates, average_completion: Math.round(avgCompletion * 100) });
  });

  app.get('/api/reports/disciples', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user || !requireAdmin(req, res)) return;
    const disciples = all("SELECT id, name, email, phone, last_active FROM users WHERE role = 'disciple' ORDER BY name ASC");
    const data = disciples.map(d => {
      const totalClasses = get('SELECT COUNT(*) as c FROM classes WHERE is_published = 1').c;
      const completed = get('SELECT COUNT(DISTINCT class_id) as c FROM test_results WHERE user_id = ? AND is_passed = 1', [d.id]).c;
      const avgScore = get('SELECT AVG(score) as avg FROM test_results WHERE user_id = ?', [d.id]).avg || 0;
      const lastActiveSeries = get('SELECT s.title FROM series s JOIN classes c ON c.series_id = s.id JOIN user_class_progress ucp ON ucp.class_id = c.id WHERE ucp.user_id = ? ORDER BY ucp.created_at DESC LIMIT 1', [d.id]);
      return { ...d, classes_completed: completed, total_classes: totalClasses, average_test_score: Math.round(avgScore * 100), current_series: lastActiveSeries ? lastActiveSeries.title : 'None' };
    });
    sendJson(res, 200, { disciples: data });
  });

  app.get('/api/reports/series', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user || !requireAdmin(req, res)) return;
    const seriesList = all('SELECT * FROM series ORDER BY order_in_pathway ASC');
    const data = seriesList.map(s => {
      const totalClasses = get('SELECT COUNT(*) as c FROM classes WHERE series_id = ? AND is_published = 1', [s.id]).c;
      const totalDisciples = get("SELECT COUNT(*) as c FROM users WHERE role = 'disciple'").c;
      const completedDisciples = totalDisciples > 0 ? get("SELECT COUNT(*) as c FROM users u WHERE u.role = 'disciple' AND NOT EXISTS (SELECT 1 FROM classes c2 WHERE c2.series_id = ? AND c2.is_published = 1 AND NOT EXISTS (SELECT 1 FROM test_results tr WHERE tr.class_id = c2.id AND tr.user_id = u.id AND tr.is_passed = 1))", [s.id]).c : 0;
      const avgScorePerClass = all("SELECT c.id, c.title, COALESCE(AVG(tr.score), 0) as avg_score FROM classes c LEFT JOIN test_results tr ON tr.class_id = c.id AND tr.is_passed = 1 WHERE c.series_id = ? GROUP BY c.id", [s.id]);
      return { ...s, total_classes: totalClasses, total_disciples: totalDisciples, completed_disciples: completedDisciples, completion_rate: totalDisciples > 0 ? Math.round((completedDisciples / totalDisciples) * 100) : 0, avg_score_per_class: avgScorePerClass.map(a => ({ title: a.title, avg_score: Math.round((a.avg_score || 0) * 100) })) };
    });
    sendJson(res, 200, { series: data });
  });

  // Certificate routes
  app.get('/api/certificates', (req, res) => {
    const user = authenticateToken(req, res);
    if (!user) return;
    const isAdmin = user.role === 'admin';
    let certs;
    if (isAdmin) {
      certs = all('SELECT cert.*, u.name as disciple_name, s.title as series_title FROM certificates cert JOIN users u ON u.id = cert.user_id JOIN series s ON s.id = cert.series_id ORDER BY cert.issue_date DESC');
    } else {
      certs = all('SELECT cert.*, s.title as series_title FROM certificates cert JOIN series s ON s.id = cert.series_id WHERE cert.user_id = ? ORDER BY cert.issue_date DESC', [user.id]);
    }
    sendJson(res, 200, { certificates: certs });
  });

  app.get('/api/certificates/:id/download', (req, res) => {
    const jwtUser = authenticateToken(req, res);
    if (!jwtUser) return;
    const cert = get('SELECT cert.*, u.name as disciple_name, s.title as series_title FROM certificates cert JOIN users u ON u.id = cert.user_id JOIN series s ON s.id = cert.series_id WHERE cert.id = ?', [req.params.id]);
    if (!cert) return sendJson(res, 404, { error: 'Certificate not found' });
    if (jwtUser.role !== 'admin' && cert.user_id !== jwtUser.id) return sendJson(res, 403, { error: 'Access denied' });
    const filename = `certificate-${cert.id}.pdf`;
    const filePath = path.join(CERTS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      generatePDFCert(cert, filePath);
    }
    res.sendFile(filePath, `CLE_Certificate_${cert.series_title.replace(/\s+/g, '_')}.pdf`);
  });

  app.get('/uploads/*', (req, res) => {
    const filePath = path.join(UPLOADS_DIR, req.params['*'] || '');
    res.serveStatic(filePath);
  });

  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.get('*', (req, res) => {
    const requestPath = req.path || req.url.split('?')[0];
    if (requestPath.startsWith('/api/')) return sendJson(res, 404, { error: 'API not found' });
    const filePath = path.join(clientDist, requestPath === '/' ? 'index.html' : requestPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mimes = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2' };
      const stat = fs.statSync(filePath);
      res.writeHead(200, { 'Content-Type': mimes[ext] || 'application/octet-stream', 'Content-Length': stat.size, 'Access-Control-Allow-Origin': '*' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const indexPath = path.join(clientDist, 'index.html');
      if (fs.existsSync(indexPath)) {
        const stat = fs.statSync(indexPath);
        res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': stat.size, 'Access-Control-Allow-Origin': '*' });
        fs.createReadStream(indexPath).pipe(res);
      } else {
        sendJson(res, 404, { error: 'Not found. Build the client first: cd client && npx vite build' });
      }
    }
  });

  app.get('/api/health', (req, res) => {
    sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
  });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`CLE Server running on http://localhost:${PORT}`);
  });
}

function checkMilestones(userId) {
  const totalClasses = get('SELECT COUNT(*) as c FROM classes WHERE is_published = 1').c;
  const completed = get('SELECT COUNT(DISTINCT c.id) as c FROM classes c JOIN test_results tr ON tr.class_id = c.id AND tr.user_id = ? AND tr.is_passed = 1', [userId]).c;
  const existing = all('SELECT type FROM milestones WHERE user_id = ?', [userId]).map(r => r.type);
  const toInsert = [];
  if (completed >= 3 && !existing.includes('class_count_3')) toInsert.push(['Completed 3 foundational classes', 'You have completed 3 classes on your discipleship journey.', '\u{1F4D6}', 'class_count_3']);
  if (completed >= 10 && !existing.includes('class_count_10')) toInsert.push(['Completed 10 classes', 'Dedication in learning God\'s Word!', '\u{1F4DA}', 'class_count_10']);
  if (totalClasses > 0 && (completed / totalClasses) >= 0.5 && !existing.includes('progress_50')) toInsert.push(['Reached 50% of the Discipleship Pathway', 'Halfway through your journey of faith!', '\u{1F31F}', 'progress_50']);
  if (totalClasses > 0 && completed === totalClasses && !existing.includes('all_classes')) toInsert.push(['Completed All Classes', 'You have completed the entire Discipleship Pathway!', '\u{1F389}', 'all_classes']);
  const seriesCompleted = all('SELECT s.id, s.title FROM series s WHERE NOT EXISTS (SELECT 1 FROM classes c WHERE c.series_id = s.id AND c.is_published = 1 AND NOT EXISTS (SELECT 1 FROM test_results tr WHERE tr.class_id = c.id AND tr.user_id = ? AND tr.is_passed = 1)) AND s.id IN (SELECT DISTINCT series_id FROM classes WHERE is_published = 1) AND NOT EXISTS (SELECT 1 FROM milestones m WHERE m.user_id = ? AND m.type = \'series_completed_\' || s.id)', [userId, userId]);
  for (const s of seriesCompleted) toInsert.push([`Completed Series: ${s.title}`, `You finished the entire series "${s.title}".`, '\u{1F3C5}', `series_completed_${s.id}`]);
  const highScoreClasses = get('SELECT COUNT(*) as c FROM test_results WHERE user_id = ? AND is_passed = 1 AND score >= 0.8', [userId]).c;
  if (highScoreClasses >= 5 && !existing.includes('high_score_5')) toInsert.push(['Scored 80%+ in 5 classes', 'Excellence in understanding God\'s Word!', '\u{1F4AF}', 'high_score_5']);
  for (const [title, desc, icon, type] of toInsert) {
    run('INSERT INTO milestones (user_id, title, description, badge_icon, type) VALUES (?, ?, ?, ?, ?)', [userId, title, desc, icon, type]);
    saveDb();
  }
}

function checkCertificate(userId, seriesId) {
  const totalPublished = get('SELECT COUNT(*) as c FROM classes WHERE series_id = ? AND is_published = 1', [seriesId]).c;
  if (totalPublished === 0) return;
  const passed = get('SELECT COUNT(*) as c FROM test_results tr JOIN classes c ON c.id = tr.class_id WHERE tr.user_id = ? AND c.series_id = ? AND tr.is_passed = 1', [userId, seriesId]).c;
  if (passed >= totalPublished) {
    const existing = get('SELECT id FROM certificates WHERE user_id = ? AND series_id = ?', [userId, seriesId]);
    if (!existing) {
      const series = get('SELECT title FROM series WHERE id = ?', [seriesId]);
      const certTitle = `Certificate of Completion \u2013 ${series.title}`;
      run('INSERT INTO certificates (user_id, series_id, title) VALUES (?, ?, ?)', [userId, seriesId, certTitle]);
      saveDb();
    }
  }
}

function generatePDFCert(cert, outputPath) {
  const doc = new PDFDocument({ layout: 'landscape', size: 'A4' });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);
  const w = doc.page.width;
  const h = doc.page.height;
  doc.rect(0, 0, w, h).fill('#f8fafc');
  doc.rect(20, 20, w - 40, h - 40).lineWidth(3).stroke('#1e40af');
  doc.rect(30, 30, w - 60, h - 60).lineWidth(1).stroke('#3b82f6');
  doc.fontSize(14).fillColor('#1e40af').text('Christian Life Embassy Church', 0, 80, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#64748b').text('CLE Discipleship Pathway', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(28).fillColor('#1e3a8a').text('Certificate of Completion', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(14).fillColor('#334155').text('This is to certify that', { align: 'center' });
  doc.moveDown(1.5);
  doc.fontSize(32).fillColor('#1e40af').text(cert.disciple_name, { align: 'center' });
  doc.moveDown(1.5);
  doc.fontSize(14).fillColor('#334155').text('has successfully completed the series', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(22).fillColor('#1e3a8a').text(cert.series_title, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(11).fillColor('#64748b').text(`Issued on: ${new Date(cert.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#94a3b8').text('"Go and make disciples of all nations" \u2014 Matthew 28:19', { align: 'center' });
  doc.fontSize(9).fillColor('#94a3b8').text('Christian Life Embassy Church', 0, h - 80, { align: 'center' });
  doc.end();
}

main().catch(err => { console.error('Failed to start:', err); process.exit(1); });
