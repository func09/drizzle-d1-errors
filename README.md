# drizzle-d1-errors

Parse Cloudflare D1 errors thrown by [drizzle-orm](https://orm.drizzle.team/) into typed error classes for `instanceof` checking.

> Raw D1 errors (without Drizzle) are also supported — `DrizzleQueryError` unwrapping is applied automatically when present.

```ts
import { parseD1Error, UniqueConstraintError, ForeignKeyConstraintError } from "drizzle-d1-errors";

try {
  await db.insert(users).values({ email });
} catch (e) {
  throw parseD1Error(e);
}

// In a higher-level handler:
} catch (e) {
  if (e instanceof UniqueConstraintError) {
    return Response.json({ error: `${e.field} already exists` }, { status: 409 });
  }
  if (e instanceof ForeignKeyConstraintError) {
    return Response.json({ error: "Referenced resource not found" }, { status: 422 });
  }
  throw e;
}
```

## Installation

```sh
npm install drizzle-d1-errors
```

## API

### `parseD1Error(error: unknown)`

Parses a raw D1 error (or a Drizzle-wrapped D1 error) and returns a typed error instance.

Works with both raw `env.DB` calls and `drizzle-orm` — Drizzle's `DrizzleQueryError` wrapper is unwrapped automatically.

The original error is always preserved as `result.cause`.

| D1 message pattern | Returned class |
|--------------------|----------------|
| `UNIQUE constraint failed: <table>.<col>` | `UniqueConstraintError` |
| `FOREIGN KEY constraint failed` | `ForeignKeyConstraintError` |
| anything else | `RepositoryError` |

### Error classes

#### `UniqueConstraintError`

Thrown on `UNIQUE` constraint and `PRIMARY KEY` duplicate violations.

```ts
err.field // "users.email" — <table>.<column> from the D1 message
```

#### `ForeignKeyConstraintError`

Thrown on `FOREIGN KEY` constraint violations. No additional properties — D1 does not include column info in the error message.

#### `RepositoryError`

Base class for unclassified DB errors (NOT NULL, CHECK, schema errors, etc.).

#### `RecordNotFoundError`

Utility class for application-level "not found" cases. D1 returns an empty array when no rows match — this class is for callers who prefer to throw rather than check for empty results.

```ts
const rows = await db.select().from(users).where(eq(users.id, id));
if (rows.length === 0) throw new RecordNotFoundError("User");
```

```ts
err.entity // "User" — optional label passed to the constructor
```

## ⚠️ Disclaimer

The D1 error message format is **not officially documented** by Cloudflare.
This library is based on reverse engineering and may silently break
if Cloudflare changes the error format in a future release.

Confirmed patterns are documented in [`docs/d1-error-formats.md`](./docs/d1-error-formats.md).
Contributions to update error patterns are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
