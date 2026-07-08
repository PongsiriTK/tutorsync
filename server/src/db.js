import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const DB_PATH = process.env.TS_DB || './data/tutorsync.sqlite'
mkdirSync(dirname(DB_PATH), { recursive: true })

export const db = new Database(DB_PATH, { create: true })
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    email      TEXT PRIMARY KEY,
    name       TEXT NOT NULL DEFAULT '',
    theme      TEXT NOT NULL DEFAULT 'coral',
    onboarded  INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS otps (
    email      TEXT NOT NULL,
    code       TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);

  -- A plan is a server resource; its full content lives in doc (JSON) so the
  -- shape stays identical to the client model. Membership is separate so a
  -- plan can be shared across accounts (real collaboration).
  CREATE TABLE IF NOT EXISTS plans (
    id         TEXT PRIMARY KEY,
    owner      TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    doc        TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    rev        INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS idx_plans_owner ON plans(owner);

  CREATE TABLE IF NOT EXISTS plan_members (
    plan_id   TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    email     TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    role      TEXT NOT NULL DEFAULT 'member',
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (plan_id, email)
  );
  CREATE INDEX IF NOT EXISTS idx_members_email ON plan_members(email);

  CREATE TABLE IF NOT EXISTS invites (
    token      TEXT PRIMARY KEY,
    plan_id    TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS push_subs (
    endpoint   TEXT PRIMARY KEY,
    email      TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_push_email ON push_subs(email);

  -- one row per (user, plan, session, window) so a reminder fires at most once
  CREATE TABLE IF NOT EXISTS reminders_sent (
    key     TEXT PRIMARY KEY,
    sent_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS market (
    id          TEXT PRIMARY KEY,
    doc         TEXT NOT NULL,
    author      TEXT NOT NULL DEFAULT '',
    likes       INTEGER NOT NULL DEFAULT 0,
    uses        INTEGER NOT NULL DEFAULT 0,
    published_by TEXT,
    created_at  INTEGER NOT NULL
  );
`)

// forward-migrate DBs created before a column existed (SQLite lacks ADD COLUMN IF NOT EXISTS)
for (const [table, col, def] of [['users', 'onboarded', 'INTEGER NOT NULL DEFAULT 0']]) {
  const has = db.query(`PRAGMA table_info(${table})`).all().some((c) => c.name === col)
  if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`)
}

export function now() { return Date.now() }
