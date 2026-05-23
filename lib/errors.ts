import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "INSUFFICIENT_STOCK"
  | "RESERVATION_EXPIRED"
  | "NOT_FOUND"
  | "LOCK_CONFLICT"
  | "VALIDATION_ERROR"
  | "INVALID_STATE"
  | "INTERNAL_ERROR";

export type ApiError = {
  error: string;
  code: ApiErrorCode;
};

export class ApiException extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiException";
  }
}

export function apiError(
  status: number,
  code: ApiErrorCode,
  error: string,
): NextResponse<ApiError> {
  return NextResponse.json({ error, code }, { status });
}

export function exceptionResponse(error: unknown): NextResponse<ApiError> {
  if (error instanceof ApiException) {
    return apiError(error.status, error.code, error.message);
  }

  console.error(error);
  return apiError(500, "INTERNAL_ERROR", "Something went wrong");
}
