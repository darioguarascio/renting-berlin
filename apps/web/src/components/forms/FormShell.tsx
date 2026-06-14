import type { FormEvent, ReactNode } from 'react';

export interface FormNoticeProps {
  variant?: 'brand' | 'accent' | 'warning';
  title: string;
  children?: ReactNode;
}

export function FormNotice({ variant = 'brand', title, children }: FormNoticeProps) {
  const variantClass =
    variant === 'accent'
      ? 'form-banner--accent'
      : variant === 'warning'
        ? 'form-banner--warning'
        : 'form-banner--brand';

  return (
    <div className={`form-banner ${variantClass}`}>
      <p className="form-banner__title">{title}</p>
      {children && <div className="form-banner__body">{children}</div>}
    </div>
  );
}

interface FormShellProps {
  error?: string;
  notice?: FormNoticeProps;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  footer?: ReactNode;
  extra?: ReactNode;
}

export default function FormShell({ error, notice, onSubmit, children, footer, extra }: FormShellProps) {
  return (
    <form onSubmit={onSubmit} className="form-shell">
      {error && (
        <div className="form-banner form-banner--error">
          <p className="form-banner__title">{error}</p>
        </div>
      )}

      {notice && <FormNotice {...notice} />}

      {children}

      {footer && <div className="form-footer">{footer}</div>}

      {extra}
    </form>
  );
}
