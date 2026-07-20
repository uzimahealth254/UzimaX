export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

export function assertFound<T>(value: T | null | undefined, message = 'Not found'): T {
  if (value == null) throw new AppError(404, 'not_found', message);
  return value;
}
