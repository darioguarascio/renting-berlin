import { useCallback, useEffect, useState } from 'react';

interface Props {
  photos: string[];
  title: string;
}

export default function ListingGallery({ photos, title }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const showPrevious = useCallback(() => {
    setLightboxIndex((index) => (index === null || photos.length === 0 ? null : (index - 1 + photos.length) % photos.length));
  }, [photos.length]);

  const showNext = useCallback(() => {
    setLightboxIndex((index) => (index === null || photos.length === 0 ? null : (index + 1) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') showPrevious();
      if (event.key === 'ArrowRight') showNext();
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxIndex, closeLightbox, showPrevious, showNext]);

  if (photos.length === 0) return null;

  const openAt = (index: number) => setLightboxIndex(index);

  return (
    <>
      <div className="listing-gallery">
        {photos.length === 1 && (
          <button type="button" className="listing-gallery__cell listing-gallery__cell--hero" onClick={() => openAt(0)}>
            <img src={photos[0]} alt={`${title} — photo 1`} />
          </button>
        )}

        {photos.length === 2 && (
          <div className="listing-gallery__grid listing-gallery__grid--two">
            {photos.map((url, index) => (
              <button
                key={url}
                type="button"
                className="listing-gallery__cell"
                onClick={() => openAt(index)}
              >
                <img src={url} alt={`${title} — photo ${index + 1}`} />
              </button>
            ))}
          </div>
        )}

        {photos.length >= 3 && (
          <div className="listing-gallery__grid listing-gallery__grid--multi">
            <button type="button" className="listing-gallery__cell listing-gallery__cell--hero" onClick={() => openAt(0)}>
              <img src={photos[0]} alt={`${title} — photo 1`} />
            </button>
            <div className="listing-gallery__side">
              {photos.slice(1, 5).map((url, index) => (
                <button
                  key={url}
                  type="button"
                  className="listing-gallery__cell"
                  onClick={() => openAt(index + 1)}
                >
                  <img src={url} alt={`${title} — photo ${index + 2}`} />
                </button>
              ))}
            </div>
            {photos.length > 5 && (
              <button type="button" className="listing-gallery__all" onClick={() => openAt(0)}>
                Show all {photos.length} photos
              </button>
            )}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <div className="listing-lightbox" role="dialog" aria-modal="true" aria-label={`${title} photos`}>
          <button type="button" className="listing-lightbox__close" onClick={closeLightbox} aria-label="Close gallery">
            ×
          </button>
          {photos.length > 1 && (
            <>
              <button type="button" className="listing-lightbox__nav listing-lightbox__nav--prev" onClick={showPrevious} aria-label="Previous photo">
                ‹
              </button>
              <button type="button" className="listing-lightbox__nav listing-lightbox__nav--next" onClick={showNext} aria-label="Next photo">
                ›
              </button>
            </>
          )}
          <img src={photos[lightboxIndex]} alt={`${title} — photo ${lightboxIndex + 1}`} className="listing-lightbox__image" />
          <p className="listing-lightbox__counter">
            {lightboxIndex + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  );
}
