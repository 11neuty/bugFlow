export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export function badRequest(message: string) {
  return new AppError(message, 400);
}

export function unauthorized(message = "Unauthorized") {
  return new AppError(message, 401);
}

export function forbidden(message = "Access denied") {
  return new AppError(message, 403);
}

export function notFound(message = "Resource not found") {
  return new AppError(message, 404);
}

export function conflict(message = "Conflict detected") {
  return new AppError(message, 409);
}
