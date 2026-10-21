import { HttpErrorResponse } from '@angular/common/http';

/** A failed API call, with a message that is safe to show the user. status 0 means the server could not be reached. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Turns anything thrown by HttpClient into an ApiError. The backend's own { message } is used when it sent one. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0)
      return new ApiError(0, 'Cannot reach the server. Is the backend running?');
    const sent = typeof err.error?.message === 'string' ? (err.error.message as string) : null;
    if (err.status === 401) return new ApiError(401, sent ?? 'You are not signed in.');
    if (err.status >= 500)
      return new ApiError(err.status, 'Something went wrong on the server. Please try again.');
    return new ApiError(err.status, sent ?? `The request failed (${err.status}).`);
  }
  return new ApiError(0, 'Something went wrong. Please try again.');
}
