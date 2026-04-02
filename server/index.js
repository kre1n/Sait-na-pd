import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import http from 'http'
import { createPoolFromEnv, ensureSchema } from './db.js'
import { seedDemoUser, seedAdminUser, seedDefaultContent } from './seedContent.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const BASE_PORT = Number(process.env.PORT) || 3002

const pool = createPoolFromEnv()

const uploadRoot = path.join(__dirname, 'uploads')
const docUploadDir = path.join(uploadRoot, 'documents')
if (!fs.existsSync(docUploadDir)) {
  fs.mkdirSync(docUploadDir, { recursive: true })
}

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(uploadRoot))

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, docUploadDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${String(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')}`
    cb(null, safe)
  }
})
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } })

function rowToTestMeta(row) {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    category: row.category,
    questions: Number(row.questions_count),
    passingScore: Number(row.passing_score),
    timeLimit: Number(row.time_limit_minutes)
  }
}

async function requireAdmin(req, res, next) {
  const userId = req.headers['x-user-id']
  if (!userId) {
    return res.status(401).json({ error: 'Требуется авторизация' })
  }
  try {
    const r = await pool.query('SELECT id, role FROM users WHERE id = $1', [userId])
    if (r.rowCount === 0 || r.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав' })
    }
    next()
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
}

// API: Регистрация
app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Не заполнены обязательные поля' })
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const created = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, role',
      [name, email, passwordHash]
    )

    res.json({
      message: 'Регистрация успешна',
      user: created.rows[0]
    })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// API: Вход
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Не заполнены обязательные поля' })
  }

  try {
    const found = await pool.query(
      'SELECT id, email, name, password_hash, role FROM users WHERE email = $1',
      [email]
    )

    if (found.rowCount === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' })
    }

    const user = found.rows[0]
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      return res.status(401).json({ error: 'Неверный email или пароль' })
    }

    res.json({
      message: 'Вход успешен',
      user: {
        id: Number(user.id),
        email: user.email,
        name: user.name,
        role: user.role
      },
      token: 'mock-jwt-token'
    })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// API: Проверка авторизации
app.get('/api/auth/check', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  const userId = req.headers['x-user-id']

  if (!token || !userId) {
    return res.status(401).json({ error: 'Не авторизован' })
  }

  try {
    const r = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [userId]
    )
    if (r.rowCount === 0) {
      return res.status(401).json({ error: 'Не авторизован' })
    }
    const u = r.rows[0]
    res.json({
      message: 'Авторизован',
      user: {
        id: Number(u.id),
        email: u.email,
        name: u.name,
        role: u.role
      }
    })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// API: Получение всех тестов
app.get('/api/tests', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, title, description, category, questions_count, passing_score, time_limit_minutes
       FROM tests ORDER BY id`
    )
    res.json({ tests: r.rows.map(rowToTestMeta) })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// API: Получение вопросов для конкретного теста
app.get('/api/test-questions/:testId', async (req, res) => {
  const testId = parseInt(req.params.testId, 10)
  try {
    const r = await pool.query('SELECT questions_json FROM tests WHERE id = $1', [testId])
    if (r.rowCount === 0) {
      return res.status(404).json({ error: 'Вопросы для теста не найдены' })
    }
    const questions = r.rows[0].questions_json
    const arr = Array.isArray(questions) ? questions : []
    const shuffledQuestions = [...arr].sort(() => Math.random() - 0.5)
    res.json({ questions: shuffledQuestions })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// API: Проверка ответов теста
app.post('/api/test-check/:testId', async (req, res) => {
  const testId = parseInt(req.params.testId, 10)
  const { answers } = req.body || {}

  try {
    const t = await pool.query(
      'SELECT passing_score, questions_json FROM tests WHERE id = $1',
      [testId]
    )
    if (t.rowCount === 0) {
      return res.status(404).json({ error: 'Тест не найден' })
    }

    const questions = t.rows[0].questions_json || []
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(404).json({ error: 'Тест не найден' })
    }

    const passingScore = Number(t.rows[0].passing_score)
    let correctCount = 0
    const results = []

    questions.forEach(question => {
      const userAnswer = answers[question.id]
      const correctAnswer = question.correctAnswer

      let isCorrect = false

      if (question.type === 'single') {
        isCorrect = userAnswer === correctAnswer
      } else if (question.type === 'multiple') {
        if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
          isCorrect =
            userAnswer.length === correctAnswer.length &&
            userAnswer.every(a => correctAnswer.includes(a))
        }
      }

      if (isCorrect) correctCount++

      results.push({
        questionId: question.id,
        question: question.question,
        userAnswer,
        correctAnswer,
        isCorrect
      })
    })

    const score = Math.round((correctCount / questions.length) * 100)
    const passed = score >= passingScore

    res.json({
      score,
      passed,
      correctCount,
      totalQuestions: questions.length,
      results,
      passingScore
    })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

async function getTestMetaById(testId) {
  const r = await pool.query(
    `SELECT id, title, description, category, questions_count, passing_score, time_limit_minutes
     FROM tests WHERE id = $1`,
    [testId]
  )
  if (r.rowCount === 0) return null
  return rowToTestMeta(r.rows[0])
}

// API: Получение результатов тестов пользователя
app.get('/api/test-results/:userId', async (req, res) => {
  const userId = Number(req.params.userId)
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ error: 'Некорректный userId' })
  }

  try {
    const rows = await pool.query(
      `SELECT id, user_id, test_id, score, passed, completed_at, time_spent
       FROM test_results
       WHERE user_id = $1
       ORDER BY completed_at DESC`,
      [userId]
    )

    const resultsWithTestInfo = []
    for (const r of rows.rows) {
      const test = await getTestMetaById(Number(r.test_id))
      resultsWithTestInfo.push({
        id: Number(r.id),
        userId: Number(r.user_id),
        testId: Number(r.test_id),
        score: Number(r.score),
        passed: Boolean(r.passed),
        completedAt: r.completed_at,
        timeSpent: Number(r.time_spent),
        test: test || null
      })
    }

    res.json({ results: resultsWithTestInfo })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// API: Сохранение результата теста
app.post('/api/test-results', async (req, res) => {
  const userId = Number(req.body?.userId)
  const testId = Number(req.body?.testId)
  const score = Number(req.body?.score)
  const timeSpent = Number(req.body?.timeSpent)

  if (![userId, testId, score, timeSpent].every(Number.isFinite)) {
    return res.status(400).json({ error: 'Некорректные данные' })
  }

  const test = await getTestMetaById(testId)
  if (!test) {
    return res.status(404).json({ error: 'Тест не найден' })
  }

  const passed = score >= test.passingScore

  try {
    const inserted = await pool.query(
      `INSERT INTO test_results (user_id, test_id, score, passed, time_spent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, test_id, score, passed, completed_at, time_spent`,
      [userId, testId, score, passed, timeSpent]
    )

    const r = inserted.rows[0]
    res.json({
      message: 'Результат сохранен',
      result: {
        id: Number(r.id),
        userId: Number(r.user_id),
        testId: Number(r.test_id),
        score: Number(r.score),
        passed: Boolean(r.passed),
        completedAt: r.completed_at,
        timeSpent: Number(r.time_spent),
        test
      }
    })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// API: Получение статистики пользователя
app.get('/api/user-stats/:userId', async (req, res) => {
  const userId = Number(req.params.userId)
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ error: 'Некорректный userId' })
  }

  try {
    const agg = await pool.query(
      `SELECT
         COUNT(*)::int AS total_tests,
         COALESCE(SUM(CASE WHEN passed THEN 1 ELSE 0 END), 0)::int AS passed_tests,
         COALESCE(AVG(score), 0)::float AS avg_score,
         COALESCE(SUM(time_spent), 0)::int AS total_time_spent
       FROM test_results
       WHERE user_id = $1`,
      [userId]
    )

    const row = agg.rows[0]
    const totalTests = Number(row.total_tests)
    const passedTests = Number(row.passed_tests)
    const failedTests = totalTests - passedTests
    const averageScore = totalTests > 0 ? Math.round(Number(row.avg_score)) : 0
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0

    res.json({
      stats: {
        totalTests,
        passedTests,
        failedTests,
        averageScore,
        passRate,
        totalTimeSpent: Number(row.total_time_spent)
      }
    })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// API: Информация о разделе охраны труда
app.get('/api/about', (_req, res) => {
  res.json({
    title: 'Отдел охраны труда',
    description: 'Обеспечение безопасности и охраны здоровья работников предприятия',
    contacts: {
      phone: '+7 (XXX) XXX-XX-XX',
      email: 'ohrana@enterprise.ru',
      address: 'ул. Примерная, д. 1, каб. 101'
    }
  })
})

// API: Документы по охране труда
app.get('/api/documents', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, title, category, doc_date::text AS date, file_path AS "filePath", original_filename AS "originalFilename"
       FROM documents ORDER BY id`
    )
    res.json({ documents: r.rows })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

app.get('/api/documents/:id/download', async (req, res) => {
  const id = Number(req.params.id)
  try {
    const r = await pool.query(
      'SELECT file_path, original_filename FROM documents WHERE id = $1',
      [id]
    )
    if (r.rowCount === 0 || !r.rows[0].file_path) {
      return res.status(404).json({ error: 'Файл не найден' })
    }
    const full = path.join(uploadRoot, r.rows[0].file_path)
    if (!fs.existsSync(full)) {
      return res.status(404).json({ error: 'Файл не найден' })
    }
    res.download(full, r.rows[0].original_filename || 'document')
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// API: Обучение и инструктажи
app.get('/api/training', async (_req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, name, description, frequency FROM trainings ORDER BY id'
    )
    res.json({ types: r.rows })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// --- Админ API ---

app.post('/api/admin/tests', requireAdmin, async (req, res) => {
  const { title, description, category, passingScore, timeLimit, questions } = req.body || {}
  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Укажите название и хотя бы один вопрос' })
  }

  const normalized = questions.map((q, i) => ({ ...q, id: i + 1 }))
  for (let i = 0; i < normalized.length; i++) {
    const q = normalized[i] || {}
    const qTitle = String(q.question || '').trim()
    if (!qTitle) return res.status(400).json({ error: `Вопрос ${i + 1}: заполните текст` })
    const type = q.type
    if (type !== 'single' && type !== 'multiple') {
      return res.status(400).json({ error: `Вопрос ${i + 1}: неверный тип` })
    }
    const opts = Array.isArray(q.options) ? q.options.map(v => String(v || '').trim()).filter(Boolean) : []
    if (opts.length < 2) return res.status(400).json({ error: `Вопрос ${i + 1}: минимум 2 варианта` })
    if (type === 'single') {
      const ca = Number(q.correctAnswer)
      if (!Number.isInteger(ca) || ca < 0 || ca >= opts.length) {
        return res.status(400).json({ error: `Вопрос ${i + 1}: выберите правильный ответ` })
      }
    }
    if (type === 'multiple') {
      const ca = Array.isArray(q.correctAnswer) ? q.correctAnswer.map(Number).filter(Number.isFinite) : []
      const uniq = Array.from(new Set(ca))
      const ok = uniq.length > 0 && uniq.every(v => Number.isInteger(v) && v >= 0 && v < opts.length)
      if (!ok) return res.status(400).json({ error: `Вопрос ${i + 1}: отметьте правильные ответы` })
    }
  }
  const ps = Number(passingScore)
  const tl = Number(timeLimit)

  try {
    const ins = await pool.query(
      `INSERT INTO tests (title, description, category, questions_count, passing_score, time_limit_minutes, questions_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING id, title, description, category, questions_count, passing_score, time_limit_minutes`,
      [
        title,
        description || '',
        category || '',
        normalized.length,
        Number.isFinite(ps) ? ps : 70,
        Number.isFinite(tl) ? tl : 30,
        JSON.stringify(normalized)
      ]
    )
    res.json({ test: rowToTestMeta(ins.rows[0]) })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

app.delete('/api/admin/tests/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  try {
    await pool.query('DELETE FROM tests WHERE id = $1', [id])
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

app.post('/api/admin/documents', requireAdmin, upload.single('file'), async (req, res) => {
  const { title, category, doc_date: docDate } = req.body || {}
  if (!title || !category || !docDate) {
    return res.status(400).json({ error: 'Заполните название, категорию и дату' })
  }

  const rel = req.file ? `documents/${req.file.filename}` : null
  const orig = req.file ? req.file.originalname : null

  try {
    const ins = await pool.query(
      `INSERT INTO documents (title, category, doc_date, file_path, original_filename)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, category, doc_date::text AS date, file_path AS "filePath", original_filename AS "originalFilename"`,
      [title, category, docDate, rel, orig]
    )
    res.json({ document: ins.rows[0] })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

app.delete('/api/admin/documents/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  try {
    const r = await pool.query('SELECT file_path FROM documents WHERE id = $1', [id])
    if (r.rowCount > 0 && r.rows[0].file_path) {
      const full = path.join(uploadRoot, r.rows[0].file_path)
      if (fs.existsSync(full)) fs.unlinkSync(full)
    }
    await pool.query('DELETE FROM documents WHERE id = $1', [id])
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

app.post('/api/admin/trainings', requireAdmin, async (req, res) => {
  const { name, description, frequency } = req.body || {}
  if (!name || !frequency) {
    return res.status(400).json({ error: 'Укажите название и периодичность' })
  }
  try {
    const ins = await pool.query(
      `INSERT INTO trainings (name, description, frequency)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, frequency`,
      [name, description || '', frequency]
    )
    res.json({ type: ins.rows[0] })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

app.delete('/api/admin/trainings/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  try {
    await pool.query('DELETE FROM trainings WHERE id = $1', [id])
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// Serve static frontend in production (after build)
const distPath = path.join(__dirname, '../client/dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

async function start() {
  await ensureSchema(pool)
  await seedDemoUser(pool)
  await seedAdminUser(pool)
  await seedDefaultContent(pool)

  const port = await listenWithFallback(app, BASE_PORT)
  console.log(`Сервер запущен на http://localhost:${port}`)
}

start().catch(e => {
  console.error('Не удалось запустить сервер:', e?.message || e)
  process.exit(1)
})

function listenWithFallback(app, startPort, maxTries = 10) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app)
    let port = startPort

    const tryListen = () => {
      server.listen(port, () => resolve(port))
    }

    server.on('error', err => {
      if (err?.code !== 'EADDRINUSE' || port >= startPort + maxTries) {
        return reject(err)
      }
      port += 1
      tryListen()
    })

    tryListen()
  })
}
