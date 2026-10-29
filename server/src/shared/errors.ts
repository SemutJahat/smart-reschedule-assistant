export type ErrorCode =
  | "BAD_REQUEST"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "AI_SERVICE_UNAVAILABLE"
  | "AI_INVALID_RESPONSE"
  | "CONFIRMATION_MISMATCH"
  | "INTERNAL_SERVER_ERROR";

export interface ErrorDetails {
  [key: string]: unknown;
}

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetails;
  };
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetails;

  constructor(
    code: ErrorCode,
    message: string,
    status = 400,
    details?: ErrorDetails,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function errorEnvelope(
  code: ErrorCode,
  message: string,
  details?: ErrorDetails,
): ErrorEnvelope {
  return {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };
}
