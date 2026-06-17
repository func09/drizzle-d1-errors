import { describe, expect, test } from "vitest";
import {
  ForeignKeyConstraintError,
  RecordNotFoundError,
  RepositoryError,
  UniqueConstraintError,
} from "../errors.js";
import { parseD1Error } from "../parse.js";

describe("parseD1Error", () => {
  describe("UNIQUE constraint", () => {
    test("returns UniqueConstraintError with field", () => {
      const err = new Error(
        "D1_ERROR: UNIQUE constraint failed: users.email: SQLITE_CONSTRAINT",
      );
      const result = parseD1Error(err);
      expect(result).toBeInstanceOf(UniqueConstraintError);
      expect((result as UniqueConstraintError).field).toBe("users.email");
    });

    test("extracts field for PRIMARY KEY duplicate", () => {
      const err = new Error(
        "D1_ERROR: UNIQUE constraint failed: users.id: SQLITE_CONSTRAINT",
      );
      const result = parseD1Error(err);
      expect(result).toBeInstanceOf(UniqueConstraintError);
      expect((result as UniqueConstraintError).field).toBe("users.id");
    });

    test("preserves original error as cause", () => {
      const err = new Error(
        "D1_ERROR: UNIQUE constraint failed: users.email: SQLITE_CONSTRAINT",
      );
      const result = parseD1Error(err);
      expect((result as Error & { cause?: unknown }).cause).toBe(err);
    });
  });

  describe("FOREIGN KEY constraint", () => {
    test("returns ForeignKeyConstraintError", () => {
      const err = new Error(
        "D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT",
      );
      expect(parseD1Error(err)).toBeInstanceOf(ForeignKeyConstraintError);
    });

    test("preserves original error as cause", () => {
      const err = new Error(
        "D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT",
      );
      const result = parseD1Error(err);
      expect((result as Error & { cause?: unknown }).cause).toBe(err);
    });
  });

  describe("other constraint violations → RepositoryError", () => {
    test("NOT NULL constraint", () => {
      const err = new Error(
        "D1_ERROR: NOT NULL constraint failed: users.email: SQLITE_CONSTRAINT",
      );
      expect(parseD1Error(err)).toBeInstanceOf(RepositoryError);
    });

    test("CHECK constraint", () => {
      const err = new Error(
        "D1_ERROR: CHECK constraint failed: quantity >= 0: SQLITE_CONSTRAINT",
      );
      expect(parseD1Error(err)).toBeInstanceOf(RepositoryError);
    });

    test("no such table", () => {
      const err = new Error(
        "D1_ERROR: no such table: nonexistent: SQLITE_ERROR",
      );
      expect(parseD1Error(err)).toBeInstanceOf(RepositoryError);
    });
  });

  describe("D1_EXEC_ERROR prefix", () => {
    test("also handled (defensive, not observed in practice)", () => {
      const err = new Error(
        "D1_EXEC_ERROR: UNIQUE constraint failed: users.email: SQLITE_CONSTRAINT",
      );
      const result = parseD1Error(err);
      expect(result).toBeInstanceOf(UniqueConstraintError);
      expect((result as UniqueConstraintError).field).toBe("users.email");
    });
  });

  describe("DrizzleQueryError wrapping", () => {
    test("unwraps cause to get D1 message", () => {
      const cause = new Error(
        "D1_ERROR: UNIQUE constraint failed: users.email: SQLITE_CONSTRAINT",
      );
      const drizzleErr = Object.assign(
        new Error("Failed query: insert into ..."),
        { cause },
      );
      const result = parseD1Error(drizzleErr);
      expect(result).toBeInstanceOf(UniqueConstraintError);
      expect((result as UniqueConstraintError).field).toBe("users.email");
    });

    test("cause is the DrizzleQueryError, not the D1 cause", () => {
      const d1Cause = new Error(
        "D1_ERROR: UNIQUE constraint failed: users.email: SQLITE_CONSTRAINT",
      );
      const drizzleErr = Object.assign(
        new Error("Failed query: insert into ..."),
        { cause: d1Cause },
      );
      const result = parseD1Error(drizzleErr);
      expect((result as Error & { cause?: unknown }).cause).toBe(drizzleErr);
    });
  });

  describe("non-D1 errors → RepositoryError", () => {
    test("plain Error without D1 prefix", () => {
      const err = new Error("something went wrong");
      expect(parseD1Error(err)).toBeInstanceOf(RepositoryError);
    });

    test("non-Error value (string)", () => {
      const result = parseD1Error("something went wrong");
      expect(result).toBeInstanceOf(RepositoryError);
      expect(result.message).toBe("Unknown database error");
    });

    test("null", () => {
      expect(parseD1Error(null)).toBeInstanceOf(RepositoryError);
    });
  });
});

describe("RecordNotFoundError", () => {
  test("can be constructed with entity", () => {
    const err = new RecordNotFoundError("User");
    expect(err).toBeInstanceOf(RecordNotFoundError);
    expect(err.entity).toBe("User");
    expect(err.message).toBe("Record not found: User");
  });

  test("can be constructed without entity", () => {
    const err = new RecordNotFoundError();
    expect(err.entity).toBeUndefined();
    expect(err.message).toBe("Record not found");
  });
});
