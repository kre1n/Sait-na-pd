import pg from 'pg'

const { Pool } = pg

export function createPoolFromEnv() {
  const {
    PGHOST = 'localhost',
    PGPORT = '5432',
    PGDATABASE = 'ohrana_truda',
    PGUSER = 'ohrana_user',
    PGPASSWORD
  } = process.env

  if (!PGPASSWORD) {
    throw new Error('PGPASSWORD не задан. Создайте server/.env (см. server/.env.example).')
  }

  return new Pool({
    host: PGHOST,
    port: Number(PGPORT),
    database: PGDATABASE,
    user: PGUSER,
    password: PGPASSWORD
  })
}

export async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tests (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      questions_count INTEGER NOT NULL DEFAULT 0,
      passing_score INTEGER NOT NULL DEFAULT 70,
      time_limit_minutes INTEGER NOT NULL DEFAULT 30,
      questions_json JSONB NOT NULL DEFAULT '[]'::jsonb
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      doc_date DATE NOT NULL,
      file_path TEXT,
      original_filename TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trainings (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      frequency TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_results (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      test_id INTEGER NOT NULL,
      score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
      passed BOOLEAN NOT NULL,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      time_spent INTEGER NOT NULL CHECK (time_spent >= 0)
    );
  `)

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id);`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_test_results_user_test_id ON test_results(user_id, test_id);`)
}

