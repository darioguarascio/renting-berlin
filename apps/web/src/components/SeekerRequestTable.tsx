import { useEffect, useRef, useState } from 'react';
import type { TenantRequestFull } from '../types/tenant-request';
import {
  formatBudget,
  formatNeighborhoodList,
  HOUSEHOLD_LABELS,
  toPublicProfile,
} from '../types/tenant-request';
import { CATEGORY_LABELS, RENT_TYPE_LABELS } from '../types/listing';
import { seekerProfileHref } from '../lib/urls';
import type { SeekerProfileLockedReason } from '../lib/seeker-profile-access';
import {
  REQUEST_TABLE_COLUMNS,
  type RequestTableColumnId,
  loadRequestTableColumns,
  saveRequestTableColumns,
} from '../lib/request-table-columns';

interface DisplayRow {
  request: TenantRequestFull;
  canViewFull: boolean;
  lockedReason: SeekerProfileLockedReason | null;
}

interface Props {
  rows: DisplayRow[];
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function cellValue(row: DisplayRow, columnId: RequestTableColumnId): string {
  const { request, canViewFull, lockedReason } = row;
  const publicProfile = toPublicProfile(request);

  switch (columnId) {
    case 'handle':
      return `@${request.handle}`;
    case 'title':
      return request.title;
    case 'category':
      return CATEGORY_LABELS[request.category];
    case 'rentType':
      return RENT_TYPE_LABELS[request.rentType];
    case 'budget':
      return formatBudget(publicProfile.budgetMax);
    case 'neighborhoods':
      if (!canViewFull) {
        return lockedReason === 'landlords' ? 'Landlords only' : 'Log in to view';
      }
      return formatNeighborhoodList(request.desiredNeighborhoods);
    case 'householdType':
      return HOUSEHOLD_LABELS[publicProfile.householdType];
    case 'availableFrom':
      return formatDate(request.availableFrom);
    case 'availableTo':
      return formatDate(request.availableTo);
    case 'anmeldungNeeded':
      return request.anmeldungNeeded ? 'Needed' : 'No';
    case 'hasSchufa':
      return request.hasSchufa ? 'Yes' : 'No';
    case 'isStudent':
      return request.isStudent ? 'Yes' : 'No';
    case 'hasPets':
      return request.hasPets ? 'Yes' : 'No';
    case 'landlordsOnly':
      return request.landlordsOnly ? 'Yes' : 'No';
    case 'createdAt':
      return formatDate(request.createdAt.slice(0, 10));
    default:
      return '—';
  }
}

export default function SeekerRequestTable({ rows }: Props) {
  const [visibleColumns, setVisibleColumns] = useState<RequestTableColumnId[]>(() => loadRequestTableColumns());
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveRequestTableColumns(visibleColumns);
  }, [visibleColumns]);

  useEffect(() => {
    if (!pickerOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [pickerOpen]);

  function toggleColumn(id: RequestTableColumnId) {
    const col = REQUEST_TABLE_COLUMNS.find((c) => c.id === id);
    if (col?.required) return;
    setVisibleColumns((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== id);
      }
      const order = REQUEST_TABLE_COLUMNS.map((c) => c.id);
      return [...prev, id].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    });
  }

  const columnMeta = REQUEST_TABLE_COLUMNS.filter((c) => visibleColumns.includes(c.id));

  return (
    <div className="card">
      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--color-ink-muted)]">
          {rows.length} profile{rows.length !== 1 ? 's' : ''}
        </p>
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            aria-expanded={pickerOpen}
            aria-haspopup="true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-[var(--color-accent)]">
              <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm0 8.25A.75.75 0 0 1 2.75 11h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 11.25ZM2 15.75a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
            Columns
            <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--color-accent-hover)]">
              {visibleColumns.length}
            </span>
          </button>
          {pickerOpen && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-float)]">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-muted)]">Show columns</p>
              <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                {REQUEST_TABLE_COLUMNS.map((col) => {
                  const checked = visibleColumns.includes(col.id);
                  return (
                    <li key={col.id}>
                      <label
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                          col.required ? 'text-[var(--color-ink-muted)]' : 'cursor-pointer hover:bg-[var(--color-paper)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={col.required}
                          onChange={() => toggleColumn(col.id)}
                          className="size-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] disabled:opacity-50"
                        />
                        <span className={checked ? 'font-medium text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)]'}>
                          {col.label}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto overflow-hidden rounded-b-2xl">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              {columnMeta.map((col) => (
                <th
                  key={col.id}
                  className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--color-ink-muted)] whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {rows.map((row) => (
              <tr key={row.request.id} className="group transition hover:bg-[var(--color-accent-soft)]/40">
                {columnMeta.map((col) => (
                  <td
                    key={col.id}
                    className={`px-4 py-3 whitespace-nowrap ${
                      col.id === 'handle' ? 'font-semibold text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)]'
                    }`}
                  >
                    {col.id === 'handle' ? (
                      <a
                        href={seekerProfileHref(row.request.handle)}
                        className="text-[var(--color-accent-hover)] group-hover:text-[var(--color-accent)] hover:underline"
                      >
                        @{row.request.handle}
                      </a>
                    ) : col.id === 'budget' ? (
                      <span className="font-semibold text-[var(--color-brand-deep)]">{cellValue(row, col.id)}</span>
                    ) : (
                      cellValue(row, col.id)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
