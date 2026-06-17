/**
 * Base error class for unexpected or unclassified database errors.
 *
 * Thrown by {@link parseD1Error} when the error does not match any known
 * D1 constraint pattern (e.g. NOT NULL violation, CHECK violation, schema
 * errors such as "no such table").
 *
 * @example
 * ```ts
 * try {
 *   await db.insert(users).values(data);
 * } catch (e) {
 *   const err = parseD1Error(e);
 *   if (err instanceof RepositoryError) {
 *     console.error("Unexpected DB error:", err.message);
 *   }
 * }
 * ```
 */
export class RepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RepositoryError";
  }
}

/**
 * Thrown when a `UNIQUE` constraint or `PRIMARY KEY` duplicate is detected.
 *
 * SQLite treats PRIMARY KEY violations as UNIQUE constraint failures, so both
 * cases are represented by this class.
 *
 * The {@link field} property contains the `<table>.<column>` string extracted
 * from the D1 error message (e.g. `"users.email"`). It is `undefined` only
 * if the field could not be parsed.
 *
 * @example
 * ```ts
 * } catch (e) {
 *   const err = parseD1Error(e);
 *   if (err instanceof UniqueConstraintError) {
 *     if (err.field === "users.email") {
 *       return Response.json({ error: "Email already in use" }, { status: 409 });
 *     }
 *   }
 * }
 * ```
 */
export class UniqueConstraintError extends Error {
  /** `<table>.<column>` that caused the violation, e.g. `"users.email"`. */
  readonly field?: string;

  constructor(field?: string, options?: ErrorOptions) {
    super(
      field ? `Unique constraint failed: ${field}` : "Unique constraint failed",
      options,
    );
    this.name = "UniqueConstraintError";
    this.field = field;
  }
}

/**
 * Thrown when a `FOREIGN KEY` constraint is violated.
 *
 * Indicates that a referenced record does not exist. D1 does not include the
 * column name in the error message, so no additional properties are available.
 *
 * @example
 * ```ts
 * } catch (e) {
 *   const err = parseD1Error(e);
 *   if (err instanceof ForeignKeyConstraintError) {
 *     return Response.json({ error: "Referenced resource not found" }, { status: 422 });
 *   }
 * }
 * ```
 */
export class ForeignKeyConstraintError extends Error {
  constructor(options?: ErrorOptions) {
    super("Foreign key constraint failed", options);
    this.name = "ForeignKeyConstraintError";
  }
}

/**
 * Utility error class for application-level "not found" cases.
 *
 * D1 does **not** throw when a query returns no rows — it returns an empty
 * array. This class is provided for callers who prefer to unify their error
 * handling with a thrown error rather than a null/empty-array check.
 *
 * The optional {@link entity} property names the resource that was not found
 * (e.g. `"User"`).
 *
 * @example
 * ```ts
 * const rows = await db.select().from(users).where(eq(users.id, id));
 * if (rows.length === 0) throw new RecordNotFoundError("User");
 * ```
 */
export class RecordNotFoundError extends Error {
  /** Human-readable name of the entity that was not found, e.g. `"User"`. */
  readonly entity?: string;

  constructor(entity?: string, options?: ErrorOptions) {
    super(entity ? `Record not found: ${entity}` : "Record not found", options);
    this.name = "RecordNotFoundError";
    this.entity = entity;
  }
}
