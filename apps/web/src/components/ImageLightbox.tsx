import { useCallback, useEffect, useState } from 'react';

interface LightboxImage {
  url: string;
  alt: string;
}

interface Props {
  images: LightboxImage[];
  initialIndex?: number;
  onClose: () => void;
  label?: string;
}

export default function ImageLightbox({ images, initialIndex = 0, onClose, label = 'Image preview' }: Props) {
  const [index, setIndex] = useState(initialIndex);

  const showPrevious = useCallback(() => {
    setIndex((current) => (images.length === 0 ? 0 : (current - 1 + images.length) % images.length));
  }, [images.length]);

  const showNext = useCallback(() => {
    setIndex((current) => (images.length === 0 ? 0 : (current + 1) % images.length));
  }, [images.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') showPrevious();
      if (event.key === 'ArrowRight') showNext();
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, showPrevious, showNext]);

  if (images.length === 0) return null;

  const image = images[index] ?? images[0];

  return (
    <div
      className="listing-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
    >
      <button
        type="button"
        className="listing-lightbox__back"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        aria-label="Back to chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
          <path
            fillRule="evenodd"
            d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            className="listing-lightbox__nav listing-lightbox__nav--prev"
            onClick={(event) => {
              event.stopPropagation();
              showPrevious();
            }}
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            type="button"
            className="listing-lightbox__nav listing-lightbox__nav--next"
            onClick={(event) => {
              event.stopPropagation();
              showNext();
            }}
            aria-label="Next image"
          >
            ›
          </button>
        </>
      )}

      <img
        src={image.url}
        alt={image.alt}
        className="listing-lightbox__image"
        onClick={(event) => event.stopPropagation()}
      />

      {images.length > 1 && (
        <p className="listing-lightbox__counter">
          {index + 1} / {images.length}
        </p>
      )}
    </div>
  );
}
