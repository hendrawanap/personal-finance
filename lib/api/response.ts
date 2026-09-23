import type { ApiEnvelope } from "../../types/auth/auth.ts";

export function apiSuccess<T>(
  data: T,
  message?: string,
  status: number = 200,
): Response {
  return Response.json(
    {
      data,
      errors: null,
      meta: {
        success: true,
        ...(message ? { message } : {}),
      },
    },
    { status },
  );
}

export function apiError(
  message: string,
  status: number = 400,
  errors: Array<{ code?: string; message: string }> | null = null,
): Response {
  return Response.json(
    {
      data: null,
      errors: errors || [{ message }],
      meta: {
        success: false,
        message,
      },
    },
    { status },
  );
}

export function apiUnauthorized(
  message: string = "Unauthorized. Please sign in.",
): Response {
  return apiError(message, 401);
}

export function apiNotFound(
  message: string = "Resource not found.",
): Response {
  return apiError(message, 404);
}
