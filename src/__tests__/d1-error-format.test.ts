import { env } from 'cloudflare:test'
import { afterAll, beforeAll, test } from 'vitest'

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DB: D1Database
  }
}

beforeAll(async () => {
  await env.DB.exec(
    'CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL)'
  )
  await env.DB.exec(
    'CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL)'
  )
  await env.DB.exec('PRAGMA foreign_keys = ON')
})

afterAll(async () => {
  await env.DB.exec('DROP TABLE IF EXISTS posts; DROP TABLE IF EXISTS users;')
})

test('UNIQUE constraint violation', async () => {
  await env.DB.prepare(
    "INSERT INTO users (id, email, name) VALUES (1, 'alice@example.com', 'Alice')"
  ).run()
  try {
    await env.DB.prepare(
      "INSERT INTO users (id, email, name) VALUES (2, 'alice@example.com', 'Alice2')"
    ).run()
  } catch (e) {
    console.log('[UNIQUE] constructor:', (e as Error)?.constructor?.name)
    console.log('[UNIQUE] message:', (e as Error)?.message)
  }
})

test('NOT NULL constraint violation', async () => {
  try {
    await env.DB.prepare(
      "INSERT INTO users (id, email, name) VALUES (3, NULL, 'Charlie')"
    ).run()
  } catch (e) {
    console.log('[NOT NULL] constructor:', (e as Error)?.constructor?.name)
    console.log('[NOT NULL] message:', (e as Error)?.message)
  }
})

test('PRIMARY KEY duplicate', async () => {
  await env.DB.prepare(
    "INSERT INTO users (id, email, name) VALUES (10, 'pk@example.com', 'PK')"
  ).run()
  try {
    await env.DB.prepare(
      "INSERT INTO users (id, email, name) VALUES (10, 'pk2@example.com', 'PK2')"
    ).run()
  } catch (e) {
    console.log('[PK DUP] constructor:', (e as Error)?.constructor?.name)
    console.log('[PK DUP] message:', (e as Error)?.message)
  }
})

test('FOREIGN KEY constraint violation', async () => {
  // D1 enables FK enforcement per-statement with PRAGMA; behavior may vary
  try {
    await env.DB.prepare(
      "INSERT INTO posts (id, user_id, title) VALUES (1, 999, 'Ghost post')"
    ).run()
  } catch (e) {
    console.log('[FK] constructor:', (e as Error)?.constructor?.name)
    console.log('[FK] message:', (e as Error)?.message)
  }
})

test('via batch()', async () => {
  await env.DB.prepare(
    "INSERT INTO users (id, email, name) VALUES (20, 'batch@example.com', 'Batch')"
  ).run()
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO users (id, email, name) VALUES (21, 'batch2@example.com', 'Batch2')"
      ),
      env.DB.prepare(
        // duplicate of id=20 to trigger error inside batch
        "INSERT INTO users (id, email, name) VALUES (20, 'batch3@example.com', 'Batch3')"
      ),
    ])
  } catch (e) {
    console.log('[BATCH] constructor:', (e as Error)?.constructor?.name)
    console.log('[BATCH] message:', (e as Error)?.message)
  }
})
