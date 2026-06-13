import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MESSAGE_ATTACHMENT_TYPES = new Set([
  ...ALLOWED_TYPES,
  'application/pdf',
]);

export async function saveUpload(file: File): Promise<string> {
  return saveFile(file, ALLOWED_TYPES);
}

export async function saveMessageAttachment(file: File): Promise<string> {
  return saveFile(file, MESSAGE_ATTACHMENT_TYPES);
}

async function saveFile(file: File, allowed: Set<string>): Promise<string> {
  if (!allowed.has(file.type)) {
    throw new Error(
      allowed === MESSAGE_ATTACHMENT_TYPES
        ? 'Invalid file type. Use JPEG, PNG, WebP, GIF, or PDF.'
        : 'Invalid file type. Use JPEG, PNG, WebP, or GIF.',
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 5 MB.');
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const filename = `${nanoid()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return `/uploads/${filename}`;
}
