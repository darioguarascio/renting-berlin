import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AccountNavLinks } from './AccountNav';

interface Props {
  currentPath: string;
}

function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

export default function AccountMobileMenu({ currentPath }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  const drawer = open && mounted ? (
    <div className="account-menu-overlay lg:hidden">
      <button
        type="button"
        className="account-menu-backdrop"
        aria-label="Close menu"
        onClick={() => setOpen(false)}
      />
      <aside className="account-menu-drawer" aria-label="Account navigation">
        <div className="account-menu-drawer__header">
          <p className="account-menu-drawer__label">Menu</p>
          <button
            type="button"
            className="account-menu-btn"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>
        <nav className="link-rows account-menu-drawer__nav" aria-label="Account">
          <AccountNavLinks currentPath={currentPath} onNavigate={() => setOpen(false)} />
        </nav>
      </aside>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        className="account-menu-btn lg:hidden"
        aria-label="Open account menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>
      {drawer && createPortal(drawer, document.body)}
    </>
  );
}
