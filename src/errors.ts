export class RepositoryError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "RepositoryError";
	}
}

export class UniqueConstraintError extends Error {
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

export class ForeignKeyConstraintError extends Error {
	constructor(options?: ErrorOptions) {
		super("Foreign key constraint failed", options);
		this.name = "ForeignKeyConstraintError";
	}
}

export class RecordNotFoundError extends Error {
	readonly entity?: string;

	constructor(entity?: string, options?: ErrorOptions) {
		super(entity ? `Record not found: ${entity}` : "Record not found", options);
		this.name = "RecordNotFoundError";
		this.entity = entity;
	}
}
