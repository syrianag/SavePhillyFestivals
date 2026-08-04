import { NextResponse } from "next/server";

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}



export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource changed or is no longer eligible for this operation") {
    super(message, 409);
  }
}

export function handleApiError(error) {
  console.error("API Error:", error);

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, ...(error.errors && { errors: error.errors }) },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
