import type { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  step?: number;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, step, children, className = '' }: FormSectionProps) {
  return (
    <section className="form-section">
      <header className="form-section__header">
        {step != null && (
          <span className="form-section__step" aria-hidden="true">
            {step}
          </span>
        )}
        <h2 className="form-section__title">{title}</h2>
      </header>
      <div className={`form-section__body space-y-4 ${className}`}>{children}</div>
    </section>
  );
}

interface FormSectionsProps {
  children: ReactNode;
  toolbar?: ReactNode;
}

export default function FormSections({ children, toolbar }: FormSectionsProps) {
  return (
    <div className="form-sections">
      {toolbar ? <div className="form-sections__toolbar">{toolbar}</div> : null}
      {children}
    </div>
  );
}

export function FormActions({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`form-actions ${className}`.trim()}>{children}</div>;
}
