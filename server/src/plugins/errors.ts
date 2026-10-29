import type { AnyElysia } from "elysia";
import { AppError, errorEnvelope, type ErrorCode } from "../shared/errors";

function statusToErrorCode(status: number): ErrorCode {
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status >= 400 && status < 500) return "BAD_REQUEST";
  return "INTERNAL_SERVER_ERROR";
}

export const errors = (app: AnyElysia) => app.onError(
  { as: "global" },
  ({ code, error, set }) => {
    if (error instanceof AppError) {
      set.status = error.status;
      return errorEnvelope(error.code, error.message, error.details);
    }

    const status =
      code === "NOT_FOUND"
        ? 404
        : code === "VALIDATION"
          ? 422
          : typeof set.status === "number"
            ? set.status
            : 500;
    const errorCode = code === "VALIDATION" ? "VALIDATION_ERROR" : statusToErrorCode(status);
    const message =
      code === "NOT_FOUND"
        ? "The requested resource was not found"
        : code === "VALIDATION"
          ? "Request validation failed"
          : "An unexpected error occurred";

    set.status = status >= 400 ? status : 500;
    return errorEnvelope(errorCode, message);
  },
);
