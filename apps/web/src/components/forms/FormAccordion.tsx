import { Children, isValidElement, type ReactNode } from 'react';

export interface FormSection {
  id: string;
  label: string;
}

interface FormAccordionProps {
  sections: FormSection[];
  expandedSection: string;
  onExpandedChange: (sectionId: string) => void;
  idPrefix: string;
  ariaLabel: string;
  children: ReactNode;
}

interface FormAccordionPanelProps {
  sectionId: string;
  children: ReactNode;
  className?: string;
}

export function FormAccordionPanel({ children, className = '' }: FormAccordionPanelProps) {
  return <div className={`form-accordion-panel space-y-4 ${className}`}>{children}</div>;
}

function collectPanels(children: ReactNode): Map<string, ReactNode> {
  const map = new Map<string, ReactNode>();

  Children.forEach(children, (child) => {
    if (isValidElement<FormAccordionPanelProps>(child) && child.props.sectionId) {
      map.set(child.props.sectionId, child);
    }
  });

  return map;
}

export default function FormAccordion({
  sections,
  expandedSection,
  onExpandedChange,
  idPrefix,
  ariaLabel,
  children,
}: FormAccordionProps) {
  const panelMap = collectPanels(children);

  return (
    <div className="form-accordion" aria-label={ariaLabel}>
      <div className="form-accordion-steps" role="list">
        {sections.map((section, index) => {
          const isExpanded = expandedSection === section.id;
          const triggerId = `${idPrefix}-section-btn-${section.id}`;

          return (
            <div key={section.id} role="listitem">
              <button
                type="button"
                id={triggerId}
                aria-expanded={isExpanded}
                onClick={() => onExpandedChange(section.id)}
                className={`form-accordion-trigger${isExpanded ? ' form-accordion-trigger--expanded' : ''}`}
              >
                <span className="form-accordion-step" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="form-accordion-label">{section.label}</span>
                <svg
                  className={`form-accordion-chevron${isExpanded ? ' form-accordion-chevron--open' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {sections.map((section) => {
        const isExpanded = expandedSection === section.id;
        const panel = panelMap.get(section.id);
        if (!panel) return null;

        return (
          <div
            key={`panel-${section.id}`}
            id={`${idPrefix}-section-${section.id}`}
            role="region"
            aria-labelledby={`${idPrefix}-section-btn-${section.id}`}
            hidden={!isExpanded}
            className="form-accordion-body"
          >
            {panel}
          </div>
        );
      })}
    </div>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="form-actions">{children}</div>;
}

export function getSectionIndex(sections: FormSection[], sectionId: string) {
  return sections.findIndex((section) => section.id === sectionId);
}
