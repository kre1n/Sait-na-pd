import bcrypt from 'bcryptjs'
import { legacyTests, legacyTestQuestions } from './legacyContent.js'

const DEFAULT_DOCUMENTS = [
  { title: 'Положение о системе управления охраной труда', category: 'Политика', doc_date: '2024-01-15' },
  { title: 'Инструкция по пожарной безопасности', category: 'Инструкции', doc_date: '2024-02-20' },
  { title: 'Правила внутреннего трудового распорядка', category: 'Нормативы', doc_date: '2024-01-10' },
  { title: 'Инструкция по электробезопасности', category: 'Инструкции', doc_date: '2024-03-01' },
  { title: 'Перечень СИЗ по профессиям', category: 'СИЗ', doc_date: '2024-02-15' }
]

const DEFAULT_TRAININGS = [
  { name: 'Вводный инструктаж', description: 'Проводится при приеме на работу для всех работников', frequency: 'Один раз при приеме' },
  { name: 'Первичный инструктаж', description: 'На рабочем месте перед началом работы', frequency: 'При приеме на работу' },
  { name: 'Повторный инструктаж', description: 'Периодическое напоминание требований безопасности', frequency: 'Не реже 1 раза в 6 месяцев' },
  { name: 'Внеплановый инструктаж', description: 'При изменении условий труда или после несчастного случая', frequency: 'По необходимости' },
  { name: 'Обучение по охране труда', description: 'Профессиональная подготовка специалистов', frequency: 'Раз в 3 года' }
]

export async function seedDemoUser(pool) {
  const demoEmail = 'demo@example.com'
  const demoPassword = '123456'
  const demoName = 'Демо пользователь'

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [demoEmail])
  if (existing.rowCount > 0) return

  const passwordHash = await bcrypt.hash(demoPassword, 10)
  await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
    [demoName, demoEmail, passwordHash, 'user']
  )
}

export async function seedAdminUser(pool) {
  const email = process.env.ADMIN_EMAIL || 'admin@admin.local'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const name = process.env.ADMIN_NAME || 'Администратор'

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rowCount > 0) return

  const passwordHash = await bcrypt.hash(password, 10)
  await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
    [name, email, passwordHash, 'admin']
  )
}

export async function seedDefaultContent(pool) {
  const { rows: tc } = await pool.query('SELECT COUNT(*)::int AS c FROM tests')
  if (tc[0].c === 0) {
    for (const t of legacyTests) {
      const qs = legacyTestQuestions[t.id]
      if (!qs) continue
      await pool.query(
        `INSERT INTO tests (id, title, description, category, questions_count, passing_score, time_limit_minutes, questions_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
        [t.id, t.title, t.description, t.category, t.questions, t.passingScore, t.timeLimit, JSON.stringify(qs)]
      )
    }
    await pool.query(
      `SELECT setval(
        pg_get_serial_sequence('tests', 'id'),
        COALESCE((SELECT MAX(id) FROM tests), 1)
      )`
    )
  }

  const { rows: dc } = await pool.query('SELECT COUNT(*)::int AS c FROM documents')
  if (dc[0].c === 0) {
    for (const d of DEFAULT_DOCUMENTS) {
      await pool.query(
        'INSERT INTO documents (title, category, doc_date) VALUES ($1, $2, $3)',
        [d.title, d.category, d.doc_date]
      )
    }
  }

  const { rows: trc } = await pool.query('SELECT COUNT(*)::int AS c FROM trainings')
  if (trc[0].c === 0) {
    for (const t of DEFAULT_TRAININGS) {
      await pool.query(
        'INSERT INTO trainings (name, description, frequency) VALUES ($1, $2, $3)',
        [t.name, t.description, t.frequency]
      )
    }
  }
}
