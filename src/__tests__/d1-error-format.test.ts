import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { afterAll, beforeAll, describe, test } from "vitest";

declare module "cloudflare:test" {
	interface ProvidedEnv {
		DB: D1Database;
	}
}

// --- schema for Drizzle tests ---

const users = sqliteTable("users", {
	id: integer("id").primaryKey(),
	email: text("email").notNull().unique(),
	name: text("name").notNull(),
});

const posts = sqliteTable("posts", {
	id: integer("id").primaryKey(),
	userId: integer("user_id")
		.notNull()
		.references(() => users.id),
	title: text("title").notNull(),
});

// --- setup ---

beforeAll(async () => {
	await env.DB.exec(
		"CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL)",
	);
	await env.DB.exec(
		"CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL)",
	);
	await env.DB.exec(
		"CREATE TABLE items (id INTEGER PRIMARY KEY, quantity INTEGER NOT NULL CHECK (quantity >= 0))",
	);
	await env.DB.exec("PRAGMA foreign_keys = ON");
});

afterAll(async () => {
	await env.DB.exec(
		"DROP TABLE IF EXISTS posts; DROP TABLE IF EXISTS items; DROP TABLE IF EXISTS users;",
	);
});

// --- raw D1 ---

describe("raw D1", () => {
	test("UNIQUE constraint violation", async () => {
		await env.DB.prepare(
			"INSERT INTO users (id, email, name) VALUES (1, 'alice@example.com', 'Alice')",
		).run();
		try {
			await env.DB.prepare(
				"INSERT INTO users (id, email, name) VALUES (2, 'alice@example.com', 'Alice2')",
			).run();
		} catch (e) {
			console.log(
				"[RAW][UNIQUE] constructor:",
				(e as Error)?.constructor?.name,
			);
			console.log("[RAW][UNIQUE] message:", (e as Error)?.message);
		}
	});

	test("NOT NULL constraint violation", async () => {
		try {
			await env.DB.prepare(
				"INSERT INTO users (id, email, name) VALUES (3, NULL, 'Charlie')",
			).run();
		} catch (e) {
			console.log(
				"[RAW][NOT NULL] constructor:",
				(e as Error)?.constructor?.name,
			);
			console.log("[RAW][NOT NULL] message:", (e as Error)?.message);
		}
	});

	test("PRIMARY KEY duplicate", async () => {
		await env.DB.prepare(
			"INSERT INTO users (id, email, name) VALUES (10, 'pk@example.com', 'PK')",
		).run();
		try {
			await env.DB.prepare(
				"INSERT INTO users (id, email, name) VALUES (10, 'pk2@example.com', 'PK2')",
			).run();
		} catch (e) {
			console.log(
				"[RAW][PK DUP] constructor:",
				(e as Error)?.constructor?.name,
			);
			console.log("[RAW][PK DUP] message:", (e as Error)?.message);
		}
	});

	test("FOREIGN KEY constraint violation", async () => {
		try {
			await env.DB.prepare(
				"INSERT INTO posts (id, user_id, title) VALUES (1, 999, 'Ghost post')",
			).run();
		} catch (e) {
			console.log("[RAW][FK] constructor:", (e as Error)?.constructor?.name);
			console.log("[RAW][FK] message:", (e as Error)?.message);
		}
	});

	test("CHECK constraint violation", async () => {
		try {
			await env.DB.prepare(
				"INSERT INTO items (id, quantity) VALUES (1, -1)",
			).run();
		} catch (e) {
			console.log("[RAW][CHECK] constructor:", (e as Error)?.constructor?.name);
			console.log("[RAW][CHECK] message:", (e as Error)?.message);
		}
	});

	test("no such table", async () => {
		try {
			await env.DB.prepare("SELECT * FROM nonexistent").run();
		} catch (e) {
			console.log(
				"[RAW][NO TABLE] constructor:",
				(e as Error)?.constructor?.name,
			);
			console.log("[RAW][NO TABLE] message:", (e as Error)?.message);
		}
	});

	test("no such column", async () => {
		try {
			await env.DB.prepare("SELECT xyz FROM users").run();
		} catch (e) {
			console.log(
				"[RAW][NO COL] constructor:",
				(e as Error)?.constructor?.name,
			);
			console.log("[RAW][NO COL] message:", (e as Error)?.message);
		}
	});

	test("via batch()", async () => {
		await env.DB.prepare(
			"INSERT INTO users (id, email, name) VALUES (20, 'batch@example.com', 'Batch')",
		).run();
		try {
			await env.DB.batch([
				env.DB.prepare(
					"INSERT INTO users (id, email, name) VALUES (21, 'batch2@example.com', 'Batch2')",
				),
				env.DB.prepare(
					// duplicate of id=20 to trigger error inside batch
					"INSERT INTO users (id, email, name) VALUES (20, 'batch3@example.com', 'Batch3')",
				),
			]);
		} catch (e) {
			console.log("[RAW][BATCH] constructor:", (e as Error)?.constructor?.name);
			console.log("[RAW][BATCH] message:", (e as Error)?.message);
		}
	});
});

// --- Drizzle ORM ---

describe("drizzle ORM", () => {
	function logError(prefix: string, e: unknown) {
		const err = e as Error & { cause?: unknown };
		console.log(`${prefix} constructor:`, err?.constructor?.name);
		console.log(`${prefix} message:`, err?.message);
		console.log(
			`${prefix} cause constructor:`,
			(err?.cause as Error)?.constructor?.name,
		);
		console.log(`${prefix} cause message:`, (err?.cause as Error)?.message);
	}

	test("UNIQUE constraint violation", async () => {
		const db = drizzle(env.DB);
		await db
			.insert(users)
			.values({ id: 100, email: "drizzle@example.com", name: "Drizzle" });
		try {
			await db
				.insert(users)
				.values({ id: 101, email: "drizzle@example.com", name: "Drizzle2" });
		} catch (e) {
			logError("[DZ][UNIQUE]", e);
		}
	});

	test("NOT NULL constraint violation", async () => {
		const db = drizzle(env.DB);
		try {
			await db.insert(users).values({
				id: 102,
				email: null as unknown as string,
				name: "NullEmail",
			});
		} catch (e) {
			logError("[DZ][NOT NULL]", e);
		}
	});

	test("FOREIGN KEY constraint violation", async () => {
		const db = drizzle(env.DB);
		try {
			await db.insert(posts).values({ id: 200, userId: 9999, title: "Ghost" });
		} catch (e) {
			logError("[DZ][FK]", e);
		}
	});

	test("record not found (select returns empty)", async () => {
		const db = drizzle(env.DB);
		const { eq } = await import("drizzle-orm");
		const result = await db.select().from(users).where(eq(users.id, 999999));
		console.log("[DZ][NOT FOUND] result:", result);
		console.log("[DZ][NOT FOUND] length:", result.length);
	});
});
