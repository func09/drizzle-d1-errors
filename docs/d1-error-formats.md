# D1 Error Formats

Confirmed error message patterns observed via Miniflare (local D1).  
Source: `src/__tests__/d1-error-format.test.ts`

## Format

All D1 errors follow this shape:

```
D1_ERROR: <SQLite message>: <SQLITE_CODE>
```

> **Note:** The prefix `D1_EXEC_ERROR` was predicted in early documentation but was **not observed** in practice. All errors — including those triggered via `batch()` — use `D1_ERROR`.

## Patterns

### UNIQUE constraint failed

```
D1_ERROR: UNIQUE constraint failed: <table>.<column>: SQLITE_CONSTRAINT
```

Examples:
- `D1_ERROR: UNIQUE constraint failed: users.email: SQLITE_CONSTRAINT`
- `D1_ERROR: UNIQUE constraint failed: users.id: SQLITE_CONSTRAINT`

Applies to both `UNIQUE` columns and `PRIMARY KEY` duplicates (SQLite treats PK as a unique index).

### NOT NULL constraint failed

```
D1_ERROR: NOT NULL constraint failed: <table>.<column>: SQLITE_CONSTRAINT
```

Example:
- `D1_ERROR: NOT NULL constraint failed: users.email: SQLITE_CONSTRAINT`

### FOREIGN KEY constraint failed

```
D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT
```

No table or column name is included.

### CHECK constraint failed

```
D1_ERROR: CHECK constraint failed: <expression>: SQLITE_CONSTRAINT
```

Example:
- `D1_ERROR: CHECK constraint failed: quantity >= 0: SQLITE_CONSTRAINT`

### Schema errors (SQLITE_ERROR)

```
D1_ERROR: no such table: <name>: SQLITE_ERROR
D1_ERROR: no such column: <name> at offset <N>: SQLITE_ERROR
```

## Drizzle ORM

When using `drizzle-orm` with D1, errors are wrapped as `DrizzleQueryError`.  
The original D1 message is accessible via `error.cause.message`.

```
DrizzleQueryError: Failed query: insert into "users" ...
  cause: Error: D1_ERROR: UNIQUE constraint failed: users.email: SQLITE_CONSTRAINT
```

Parsers must unwrap `DrizzleQueryError` before inspecting the message.

## Record Not Found

D1 does **not** throw when a record is not found. Queries return an empty array (`[]`).  
`RecordNotFoundError` is intended for application-level use — callers check for empty results and throw it themselves.
