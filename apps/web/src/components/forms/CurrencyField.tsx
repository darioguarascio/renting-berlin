import type { InputHTMLAttributes } from 'react';

interface CurrencyFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
}

export default function CurrencyField({ id, label, className = '', ...inputProps }: CurrencyFieldProps) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="field-currency">
        <input
          id={id}
          type="number"
          className={`field-input field-currency__input ${className}`.trim()}
          {...inputProps}
        />
        <span className="field-currency__suffix" aria-hidden="true">€</span>
      </div>
    </div>
  );
}
