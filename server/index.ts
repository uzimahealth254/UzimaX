import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Server } from 'http';
import { authRouter, apiRouter } from './routes/api.js';
import { apiRateLimit, authRateLimit, initRateLimitStore } from './middleware/rateLimit.js';
import { AppError } from './lib/errors.js';
import { writeAudit } from './middleware/audit.js';
import { assertSecurityConfig } from './lib/security.js';
import { pgClient } from './db/client.js';

assertSecurityConfig();

const app = express();
const PORT = Number(process.env.PORT) || 8787;
const isProd = process.env.NODE_ENV === 'production';
const distPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const serveSpa = isProd && fs.existsSync(path.join(distPath, 'index.html'));

app.set('trust proxy', 1);
app.disable('x-powered-by');

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }
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

app.get('/api/v1/health', async (_req, res) => {
  try {
    await pgClient`SELECT 1 as ok`;
    res.json({
      status: 'ok',
      service: 'uzima-api',
      version: '2.0.0',
      db: 'up',
      time: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[health] database unreachable', e);
    res.status(503).json({
      status: 'degraded',
      service: 'uzima-api',
      version: '2.0.0',
      db: 'down',
      time: new Date().toISOString(),
    });
  }
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1', apiRouter);

// Single Render service: API + built marketing/portal (https://uzimax.onrender.com)
if (serveSpa) {
  app.use(express.static(distPath, { index: false, maxAge: '1h' }));
  // Express 5 / path-to-regexp: use named splat, not bare '*'
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error: err.code,
      message: err.message,
    };
    if (!isProd && err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: 'Internal server error' });
});

let server: Server | null = null;

async function shutdown(signal: string) {
  console.info(`[shutdown] ${signal} received`);
  if (server) {
    await new Promise<void>((resolve) => {
      server!.close(() => resolve());
      setTimeout(resolve, 10_000).unref();
    });
  }
  try {
    await pgClient.end({ timeout: 5 });
  } catch (e) {
    console.warn('[shutdown] pg close', e);
  }
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  void shutdown('uncaughtException');
});

void initRateLimitStore().then(() => {
  server = app.listen(PORT, () => {
    console.log(`IOU Exchange API listening on :${PORT} (${isProd ? 'production' : 'development'})`);
  });
});
