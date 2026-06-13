import type { ReactNode } from 'react';

export interface FormTab {
  id: string;
  label: string;
}

interface FormTabsProps {
  tabs: FormTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  idPrefix: string;
  ariaLabel: string;
}

export default function FormTabs({ tabs, activeTab, onChange, idPrefix, ariaLabel }: FormTabsProps) {
  return (
    <div className="border-b border-[var(--color-border)] px-4 sm:px-6" role="tablist" aria-label={ariaLabel}>
      <div className="form-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${idPrefix}-tab-${tab.id}`}
            id={`${idPrefix}-tab-btn-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`form-tab ${activeTab === tab.id ? 'form-tab--active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface FormTabPanelProps {
  id: string;
  labelledBy: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}

export function FormTabPanel({ id, labelledBy, active, children, className = '' }: FormTabPanelProps) {
  if (!active) return null;

  return (
    <div id={id} role="tabpanel" aria-labelledby={labelledBy} className={`form-tab-panel space-y-4 ${className}`}>
      {children}
    </div>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="form-actions">{children}</div>;
}
