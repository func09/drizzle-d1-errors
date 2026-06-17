import { RepositoryError, UniqueConstraintError } from "./errors.js";

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

export function parseD1Error(
	error: unknown,
): UniqueConstraintError | RepositoryError {
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

	return new RepositoryError(message, { cause });
}
