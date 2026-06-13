import { Fragment } from 'react';
import type { SearchViewMode } from '../types/search-view';

interface Props {
  view: SearchViewMode;
  buildUrl: (view: SearchViewMode) => string;
  modes?: SearchViewMode[];
}

const activeClass = 'bg-[var(--color-brand)] text-white';
const inactiveClass =
  'text-[var(--color-ink-muted)] hover:bg-[var(--color-brand-muted)] hover:text-[var(--color-brand-deep)]';

const ALL_VIEWS: { id: SearchViewMode; label: string; title: string; icon: React.ReactNode }[] = [
    {
      id: 'cards',
      label: 'Cards',
      title: 'Cards view',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      id: 'list',
      label: 'List',
      title: 'List view',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      id: 'table',
      label: 'Table',
      title: 'Table view',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M1.75 3A.75.75 0 0 1 2.5 2.25h15a.75.75 0 0 1 0 1.5H2.5A.75.75 0 0 1 1.75 3ZM1.75 7.25A.75.75 0 0 1 2.5 6.5h15a.75.75 0 0 1 0 1.5H2.5a.75.75 0 0 1-.75-.75ZM1.75 11.5a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5H2.5a.75.75 0 0 1-.75-.75Zm0 4.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5H2.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      id: 'map',
      label: 'Map',
      title: 'Map view',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M8.157 2.176a1.5 1.5 0 0 0-1.147 0l-4.084 1.69A1.5 1.5 0 0 0 2 5.25v10.877a.75.75 0 0 0 1.067.672l3.996-1.654 4.144 1.712a1.5 1.5 0 0 0 1.147 0l4.083-1.69A1.5 1.5 0 0 0 17.5 13.75V2.873a.75.75 0 0 0-1.067-.672l-3.996 1.654L8.293 2.143a1.5 1.5 0 0 0-.136-.033V2.176ZM6.5 4.397v9.995L4 15.342V5.25l2.5-1.038V4.397Zm1.5 9.993L12 16.106V6.11L8 4.395v9.995Zm5.5 1.712V5.75l2.5-1.035v10.092l-2.5 1.035Z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

export default function SearchViewSwitcher({ view, buildUrl, modes = ['cards', 'list', 'table', 'map'] }: Props) {
  const views = ALL_VIEWS.filter((item) => modes.includes(item.id));

  return (
    <div className="inline-flex overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
      {views.map((item, index) => (
        <Fragment key={item.id}>
          {index > 0 && <div className="w-px bg-[var(--color-border)]" />}
          <a
            href={buildUrl(item.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition sm:px-5 ${view === item.id ? activeClass : inactiveClass}`}
            title={item.title}
          >
            {item.icon}
            <span className="hidden sm:inline">{item.label}</span>
          </a>
        </Fragment>
      ))}
    </div>
  );
}
