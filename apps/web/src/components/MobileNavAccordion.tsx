import { useState, type ReactNode } from 'react';

export interface MobileNavAccordionLink {
  href: string;
  label: string;
  active?: boolean;
  trailing?: ReactNode;
}

interface Props {
  label: string;
  ariaLabel: string;
  links: MobileNavAccordionLink[];
  defaultExpanded?: boolean;
  onNavigate: () => void;
}

export default function MobileNavAccordion({
  label,
  ariaLabel,
  links,
  defaultExpanded = false,
  onNavigate,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="mobile-nav-accordion">
      <button
        type="button"
        className={`mobile-nav-accordion__trigger${expanded ? ' mobile-nav-accordion__trigger--expanded' : ''}`}
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        <span>{label}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`mobile-nav-accordion__chevron${expanded ? ' mobile-nav-accordion__chevron--open' : ''}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div className="mobile-nav-accordion__panel" role="region" aria-label={ariaLabel}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`mobile-nav-accordion__link${link.active ? ' mobile-nav-accordion__link--active' : ''}`}
              aria-current={link.active ? 'page' : undefined}
              onClick={onNavigate}
            >
              <span>{link.label}</span>
              {link.trailing}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
