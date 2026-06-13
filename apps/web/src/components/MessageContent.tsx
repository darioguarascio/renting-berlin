import { useMemo, useState } from 'react';
import ImageLightbox from './ImageLightbox';
import type { MessageAttachment } from '../types/message';
import { isImageAttachment } from '../types/message';

interface Props {
  body: string;
  attachments: MessageAttachment[];
  isMine?: boolean;
}

export default function MessageContent({ body, attachments, isMine = false }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const imageAttachments = useMemo(
    () => attachments.filter((file) => isImageAttachment(file.mimeType)),
    [attachments],
  );

  return (
    <>
      {body.trim() && <span className="whitespace-pre-wrap break-words">{body}</span>}
      {attachments.length > 0 && (
        <div className={`${body.trim() ? 'mt-1.5' : ''} space-y-1.5`}>
          {attachments.map((file) => {
            if (isImageAttachment(file.mimeType)) {
              const imageIndex = imageAttachments.findIndex((item) => item.url === file.url);

              return (
                <button
                  key={file.url}
                  type="button"
                  className="block overflow-hidden rounded-md border-0 bg-transparent p-0"
                  onClick={() => setLightboxIndex(imageIndex)}
                >
                  <img
                    src={file.url}
                    alt={file.name}
                    className="max-h-56 max-w-full cursor-pointer rounded-md object-cover"
                  />
                </button>
              );
            }

            return (
              <a
                key={file.url}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
                  isMine ? 'bg-[var(--color-brand-muted)] text-[var(--color-ink)]' : 'bg-[var(--color-paper)] text-[var(--color-ink)]'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 shrink-0">
                  <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h2.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H13.5A1.5 1.5 0 0 1 15 6.5v7a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 2 13.5v-10Z" />
                </svg>
                <span className="max-w-[10rem] truncate">{file.name}</span>
              </a>
            );
          })}
        </div>
      )}

      {lightboxIndex !== null && (
        <ImageLightbox
          images={imageAttachments.map((file) => ({ url: file.url, alt: file.name }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          label="Chat image preview"
        />
      )}
    </>
  );
}
