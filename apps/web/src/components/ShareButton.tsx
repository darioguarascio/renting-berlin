import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';

interface Props {
  url: string;
  title?: string;
  text?: string;
}

function ShareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.897 9.263a2.503 2.503 0 0 1 0 .474l6.803 4.018a2.5 2.5 0 1 1-.671.892l-6.803-4.018a2.5 2.5 0 1 1 0-3.356l6.803-4.018A2.52 2.52 0 0 1 13 4.5Z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 1 0 5.656 5.656l.5-.5a.75.75 0 0 0-1.06-1.06l-.5.5a2.5 2.5 0 1 1-3.536-3.536l3-3Z" />
      <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138l.547.547a2.5 2.5 0 0 1 0 3.536l-.547.547a.75.75 0 0 0 1.06 1.06l.547-.547a4 4 0 0 0 0-5.656l-.547-.547a.75.75 0 0 0-1.083-.032Z" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2V6h10a2 2 0 0 0-2-2H4Zm2 6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6Zm-2 4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2Zm10-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2Z" clipRule="evenodd" />
    </svg>
  );
}

function QrModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-[var(--color-ink)]/40 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-labelledby="share-qr-title"
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-float)]"
      >
        <div className="border-b border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-4">
          <h2 id="share-qr-title" className="font-display text-lg font-bold text-[var(--color-ink)]">
            Scan to open profile
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">Point a phone camera at the code below</p>
        </div>
        <div className="flex flex-col items-center px-6 py-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
            <QRCode value={url} size={192} />
          </div>
          <p className="mt-4 break-all text-center text-xs text-[var(--color-ink-muted)]">{url}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] px-6 py-4">
          <button type="button" onClick={onClose} className="btn-ghost">
            Close
          </button>
          <button type="button" onClick={() => void copyLink()} className="btn-brand">
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShareButton({ url, title, text }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [menuOpen]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setMenuOpen(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ url, title, text });
      setMenuOpen(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      await copyLink();
    }
  }

  function openQr() {
    setMenuOpen(false);
    setQrOpen(true);
  }

  return (
    <>
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="btn-ghost !px-3 !py-2 text-sm"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <ShareIcon />
          {copied ? 'Copied!' : 'Share'}
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 min-w-[11rem] overflow-hidden rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-[var(--shadow-float)]"
          >
            {canNativeShare && (
              <button
                type="button"
                role="menuitem"
                onClick={() => void nativeShare()}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
              >
                <ShareIcon />
                Share…
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => void copyLink()}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
            >
              <LinkIcon />
              Copy link
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={openQr}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
            >
              <QrIcon />
              QR code
            </button>
          </div>
        )}
      </div>
      {qrOpen && <QrModal url={url} onClose={() => setQrOpen(false)} />}
    </>
  );
}
