import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { AppError } from '../lib/errors.js';
import { ALLOWED_UPLOAD_EXTS, ALLOWED_UPLOAD_MIMES } from '../lib/security.js';

const LOCAL_ROOT = path.resolve(process.env.STORAGE_LOCAL_PATH || './storage');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function useS3() {
  return !!(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

async function s3Client() {
  const { S3Client, PutObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
  return { client, PutObjectCommand, GetObjectCommand };
}

function assertSafeUpload(originalName: string, mimeType?: string) {
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_UPLOAD_EXTS.has(ext)) {
    throw new AppError(400, 'invalid_file', 'Only PDF and images (PNG/JPEG) are allowed');
  }
  if (mimeType && !ALLOWED_UPLOAD_MIMES.has(mimeType)) {
    throw new AppError(400, 'invalid_file', 'Unsupported file type');
  }
}

export async function storeFile(opts: {
  orgId: string;
  originalName: string;
  buffer: Buffer;
  mimeType?: string;
}): Promise<{ key: string; url: string; size: number }> {
  assertSafeUpload(opts.originalName, opts.mimeType);
  const ext = path.extname(opts.originalName).toLowerCase();
  const key = `${opts.orgId}/${crypto.randomUUID()}${ext}`;

  if (useS3()) {
    const bucket = process.env.S3_BUCKET || 'uzima-documents';
    const { client, PutObjectCommand } = await s3Client();
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: opts.buffer,
      ContentType: opts.mimeType || 'application/octet-stream',
    }));
    return {
      key,
      url: `/api/v1/documents/download?key=${encodeURIComponent(key)}`,
      size: opts.buffer.length,
    };
  }

  const full = path.resolve(LOCAL_ROOT, key);
  if (!full.startsWith(LOCAL_ROOT + path.sep) && full !== LOCAL_ROOT) {
    throw new AppError(400, 'invalid_path', 'Invalid file path');
  }
  await ensureDir(path.dirname(full));
  await fs.writeFile(full, opts.buffer);
  return {
    key,
    url: `/api/v1/documents/download?key=${encodeURIComponent(key)}`,
    size: opts.buffer.length,
  };
}

export async function readStoredFile(key: string): Promise<{ buffer: Buffer; fullPath: string }> {
  const normalised = key.replace(/\\/g, '/').replace(/\0/g, '');
  if (normalised.includes('..') || normalised.startsWith('/') || normalised.includes(':')) {
    throw new AppError(400, 'invalid_path', 'Invalid file path');
  }

  if (useS3()) {
    const bucket = process.env.S3_BUCKET || 'uzima-documents';
    const { client, GetObjectCommand } = await s3Client();
    const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: normalised }));
    const bytes = await out.Body?.transformToByteArray();
    if (!bytes) throw new AppError(404, 'not_found', 'File not found');
    return { buffer: Buffer.from(bytes), fullPath: normalised };
  }

  const full = path.resolve(LOCAL_ROOT, normalised);
  if (!full.startsWith(LOCAL_ROOT + path.sep)) {
    throw new AppError(400, 'invalid_path', 'Invalid file path');
  }
  try {
    const buffer = await fs.readFile(full);
    return { buffer, fullPath: full };
  } catch {
    throw new AppError(404, 'not_found', 'File not found');
  }
}

export function storageRoot() {
  return LOCAL_ROOT;
}

export function orgIdFromStorageKey(key: string): string | null {
  const part = key.replace(/\\/g, '/').split('/')[0];
  return part || null;
}
