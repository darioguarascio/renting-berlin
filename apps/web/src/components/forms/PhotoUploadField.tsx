interface PhotoUploadFieldProps {
  photoUrls: string[];
  onChange: (urls: string[]) => void;
  maxPhotos: number;
  hint: string;
  uploading: boolean;
  onUpload: (files: FileList | null) => void;
}

export default function PhotoUploadField({
  photoUrls,
  onChange,
  maxPhotos,
  hint,
  uploading,
  onUpload,
}: PhotoUploadFieldProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-ink-muted)]">{hint}</p>
      {photoUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photoUrls.map((url, index) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-lg">
              <img src={url} alt="" className="size-full object-cover" />
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
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={(event) => onUpload(event.target.files)}
        disabled={uploading || photoUrls.length >= maxPhotos}
        className="text-sm"
      />
      {uploading && <p className="text-sm text-[var(--color-ink-muted)]">Uploading…</p>}
    </div>
  );
}

export async function uploadPhotosToApi(
  files: FileList | null,
  currentCount: number,
  maxPhotos: number,
): Promise<string[]> {
  if (!files || files.length === 0) return [];
  if (currentCount + files.length > maxPhotos) {
    throw new Error(`Maximum ${maxPhotos} photos allowed`);
  }

  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('files', file));
  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!response.ok) throw new Error(await response.text());
  const data: { urls: string[] } = await response.json();
  return data.urls;
}
