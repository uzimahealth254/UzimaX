import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { authRouter, apiRouter } from './routes/api.js';
import { apiRateLimit, authRateLimit, initRateLimitStore } from './middleware/rateLimit.js';
import { AppError } from './lib/errors.js';
import { writeAudit } from './middleware/audit.js';
import { assertSecurityConfig } from './lib/security.js';

assertSecurityConfig();

const app = express();
const PORT = Number(process.env.PORT) || 8787;

app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
}));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));

app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buf) => {
    (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
  },
}));
app.use(cookieParser());
app.use('/api/v1', apiRateLimit);
app.use('/api/v1/auth', authRateLimit);

/** Audit all mutating API calls (fire-and-forget after response) */
app.use('/api/v1', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  if (req.path === '/health' || req.path.startsWith('/auth/login') || req.path.startsWith('/auth/refresh')) {
    return next();
  }
  const start = Date.now();
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    void writeAudit({
      actorId: req.user?.userId || null,
      actorEmail: req.user?.email || req.apiClient?.label || null,
      action: `${req.method.toLowerCase()}.${req.path.replace(/\//g, '.').replace(/^\./, '') || 'root'}`,
      resourceType: 'http',
      resourceId: (req.params as { id?: string })?.id || null,
      details: { status: res.statusCode, ms: Date.now() - start, path: req.originalUrl },
      ipAddress: req.ip,
    });
  });
  next();
});

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'uzima-api',
    version: '2.0.0',
    time: new Date().toISOString(),
  });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1', apiRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error: err.code,
      message: err.message,
    };
    if (process.env.NODE_ENV !== 'production' && err.details) {
      body.details = err.details;
    }
    return res.status(err.statusCode).json(body);
  }
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: 'Internal server error' });
});

void initRateLimitStore().then(() => {
  app.listen(PORT, () => {
    console.log(`Uzima API listening on http://localhost:${PORT}`);
  });
});
