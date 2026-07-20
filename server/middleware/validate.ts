import type { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../lib/errors.js';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return next(new AppError(400, 'validation_error', 'Validation failed', parsed.error.flatten()));
    }
    (req as Request & { validated: unknown }).validated = parsed.data;
    if (source === 'body') req.body = parsed.data;
    next();
  };
}
