import {
  ForeignKeyConstraintError,
  RepositoryError,
  UniqueConstraintError,
} from "./errors.js";

/**
 * Extract the raw D1 error message from an unknown thrown value.
 *
 * Handles two shapes:
 * - A plain `Error` whose `message` starts with `D1_ERROR:` or `D1_EXEC_ERROR:`
 * - A `DrizzleQueryError` that wraps the original D1 error in `error.cause`
 *
 * Returns `null` when the value is not a recognisable D1 error.
 */
function extractD1Message(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  // DrizzleQueryError wraps the original D1 error in cause
  const cause = (error as Error & { cause?: unknown }).cause;
  const raw = cause instanceof Error ? cause.message : error.message;

  if (raw.startsWith("D1_ERROR:") || raw.startsWith("D1_EXEC_ERROR:")) {
    return raw;
  }
  return null;
}

/**
 * Parse a raw Cloudflare D1 error (or a Drizzle-wrapped D1 error) into a
 * typed error class suitable for `instanceof` checks.
 *
 * The original error is always preserved as `result.cause` so that stack
 * traces and raw messages remain accessible.
 *
 * | D1 message pattern | Returned class |
 * |--------------------|----------------|
 * | `UNIQUE constraint failed: <table>.<col>` | {@link UniqueConstraintError} |
 * | `FOREIGN KEY constraint failed` | {@link ForeignKeyConstraintError} |
 * | anything else (NOT NULL, CHECK, schema errors, …) | {@link RepositoryError} |
 *
 * @param error - The value caught in a `catch` block. Accepts `unknown` so it
 *   can be passed directly without narrowing.
 *
 * @example
 * ```ts
 * import { parseD1Error, UniqueConstraintError, ForeignKeyConstraintError } from "drizzle-d1-errors";
 *
 * try {
 *   await db.insert(users).values({ email });
 * } catch (e) {
 *   throw parseD1Error(e);
 * }
 *
 * // In a higher-level handler:
 * } catch (e) {
 *   if (e instanceof UniqueConstraintError) {
 *     return Response.json({ error: `${e.field} already exists` }, { status: 409 });
 *   }
 *   if (e instanceof ForeignKeyConstraintError) {
 *     return Response.json({ error: "Referenced resource not found" }, { status: 422 });
 *   }
 *   throw e; // re-throw RepositoryError for unexpected errors
 * }
 * ```
 */
export function parseD1Error(
  error: unknown,
): UniqueConstraintError | ForeignKeyConstraintError | RepositoryError {
  const message = extractD1Message(error);
  const cause = error instanceof Error ? error : undefined;

  if (message === null) {
    return new RepositoryError(
      error instanceof Error ? error.message : "Unknown database error",
      { cause },
    );
  }

  // UNIQUE constraint failed: <table>.<col>: SQLITE_CONSTRAINT
  const uniqueMatch = message.match(
    /UNIQUE constraint failed: ([^:]+): SQLITE_CONSTRAINT/,
  );
  if (uniqueMatch) {
    return new UniqueConstraintError(uniqueMatch[1].trim(), { cause });
  }

  // FOREIGN KEY constraint failed: SQLITE_CONSTRAINT
  if (message.includes("FOREIGN KEY constraint failed")) {
    return new ForeignKeyConstraintError({ cause });
  }

  return new RepositoryError(message, { cause });
}
