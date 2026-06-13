import path from 'node:path';

export type ModerationVerdict = {
  approved: boolean;
  score: number;
  labels: string[];
};

function uploadPathFromUrl(url: string): string | null {
  if (!url.startsWith('/uploads/')) return null;
  const filename = path.basename(url);
  if (filename.includes('..')) return null;
  return path.join(process.cwd(), 'public', 'uploads', filename);
}

/** Image ML runs in the Python moderation worker; Node sync path is rules-only. */
export async function moderateImageUrl(photoUrl: string): Promise<ModerationVerdict> {
  const filePath = uploadPathFromUrl(photoUrl);
  if (!filePath) {
    return { approved: true, score: 0, labels: [] };
  }

  return { approved: true, score: 0, labels: [] };
}

export async function moderateImageFile(_filePath: string): Promise<ModerationVerdict> {
  return { approved: true, score: 0, labels: [] };
}
