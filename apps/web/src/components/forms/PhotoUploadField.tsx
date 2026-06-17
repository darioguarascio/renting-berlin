import { useState } from 'react';

interface PhotoUploadFieldProps {
  photoUrls: string[];
  onChange: (urls: string[]) => void;
  maxPhotos: number;
  hint: string;
  uploading: boolean;
  uploadProgress?: number;
  onUpload: (files: FileList | null) => void;
}

export default function PhotoUploadField({
  photoUrls,
  onChange,
  maxPhotos,
  hint,
  uploading,
  uploadProgress,
  onUpload,
}: PhotoUploadFieldProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex !== null && dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...photoUrls];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    onChange(next);
    setDragIndex(null);
    setDragOverIndex(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-ink-muted)]">{hint}</p>
      {photoUrls.length > 0 && (
        <>
          {photoUrls.length > 1 && (
            <p className="text-xs text-[var(--color-ink-muted)]">Drag to reorder · first photo is the cover</p>
          )}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photoUrls.map((url, index) => (
              <div
                key={url}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                className={[
                  'relative aspect-square overflow-hidden rounded-lg cursor-grab active:cursor-grabbing select-none transition-opacity',
                  dragIndex === index ? 'opacity-40' : 'opacity-100',
                  dragOverIndex === index && dragIndex !== index
                    ? 'ring-2 ring-[var(--color-brand)] ring-offset-1'
                    : '',
                ].join(' ')}
              >
                <img src={url} alt="" className="size-full object-cover pointer-events-none" />
                {index === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onChange(photoUrls.filter((_, i) => i !== index))}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={(event) => onUpload(event.target.files)}
        disabled={uploading || photoUrls.length >= maxPhotos}
        className="text-sm"
      />
      {uploading && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[var(--color-brand)] transition-[width] duration-150 ease-out"
              style={{ width: `${uploadProgress ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-[var(--color-ink-muted)]">
            {uploadProgress !== undefined && uploadProgress < 100
              ? `Uploading… ${uploadProgress}%`
              : 'Processing…'}
          </p>
        </div>
      )}
    </div>
  );
}

export async function uploadPhotosToApi(
  files: FileList | null,
  currentCount: number,
  maxPhotos: number,
  onProgress?: (pct: number) => void,
): Promise<string[]> {
  if (!files || files.length === 0) return [];
  if (currentCount + files.length > maxPhotos) {
    throw new Error(`Maximum ${maxPhotos} photos allowed`);
  }

  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('files', file));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { urls: string[] };
          resolve(data.urls);
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        reject(new Error(xhr.responseText || 'Upload failed'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.send(formData);
  });
}
