import { useEffect, useRef, useState } from 'react';
import type { ListingSummary } from '../types/listing';
import { CATEGORY_LABELS, NEIGHBORHOOD_LABELS, RENT_TYPE_LABELS } from '../types/listing';
import {
  LISTING_TABLE_COLUMNS,
  type ListingTableColumnId,
  loadTableColumns,
  saveTableColumns,
} from '../lib/listing-table-columns';
import type { ListingLockedReason } from '../lib/listing-access';

interface DisplayRow {
  listing: ListingSummary;
  canViewFull: boolean;
  lockedReason: ListingLockedReason | null;
}

interface Props {
  rows: DisplayRow[];
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function cellValue(listing: ListingSummary, columnId: ListingTableColumnId): string {
  switch (columnId) {
    case 'title':
      return listing.title;
    case 'neighborhood':
      return NEIGHBORHOOD_LABELS[listing.neighborhood as keyof typeof NEIGHBORHOOD_LABELS] ?? listing.neighborhood;
    case 'category':
      return CATEGORY_LABELS[listing.category];
    case 'rentType':
      return RENT_TYPE_LABELS[listing.rentType];
    case 'rentPerMonth':
      return formatPrice(listing.rentPerMonth);
    case 'sizeSqm':
      return String(listing.sizeSqm);
    case 'rooms':
      return String(listing.rooms);
    case 'availableFrom':
      return formatDate(listing.availableFrom);
    case 'availableTo':
      return formatDate(listing.availableTo);
    case 'anmeldungAvailable':
      return listing.anmeldungAvailable ? 'Yes' : 'No';
    case 'schufaRequired':
      return listing.schufaRequired ? 'Required' : 'Not required';
    case 'onlineViewingAvailable':
      return listing.onlineViewingAvailable ? 'Yes' : 'No';
    case 'createdAt':
      return formatDate(listing.createdAt.slice(0, 10));
    default:
      return '—';
  }
}

export default function ListingTable({ rows }: Props) {
  const [visibleColumns, setVisibleColumns] = useState<ListingTableColumnId[]>(() => loadTableColumns());
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveTableColumns(visibleColumns);
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

  function toggleColumn(id: ListingTableColumnId) {
    const col = LISTING_TABLE_COLUMNS.find((c) => c.id === id);
    if (col?.required) return;
    setVisibleColumns((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== id);
      }
      const order = LISTING_TABLE_COLUMNS.map((c) => c.id);
      return [...prev, id].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    });
  }

  const columnMeta = LISTING_TABLE_COLUMNS.filter((c) => visibleColumns.includes(c.id));

  return (
    <div className="card">
      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--color-ink-muted)]">
          {rows.length} listing{rows.length !== 1 ? 's' : ''}
        </p>
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
            aria-expanded={pickerOpen}
            aria-haspopup="true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-[var(--color-brand)]">
              <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm0 8.25A.75.75 0 0 1 2.75 11h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 11.25ZM2 15.75a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
            Columns
            <span className="rounded-full bg-[var(--color-brand-muted)] px-2 py-0.5 text-xs font-bold text-[var(--color-brand-deep)]">
              {visibleColumns.length}
            </span>
          </button>
          {pickerOpen && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-float)]">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-muted)]">Show columns</p>
              <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                {LISTING_TABLE_COLUMNS.map((col) => {
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
                          className="size-4 rounded border-[var(--color-border)] text-[var(--color-brand)] focus:ring-[var(--color-brand)] disabled:opacity-50"
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
              <tr
                key={row.listing.id}
                className="group transition hover:bg-[var(--color-brand-muted)]/40"
              >
                {columnMeta.map((col) => (
                  <td
                    key={col.id}
                    className={`px-4 py-3 whitespace-nowrap ${
                      col.id === 'title' ? 'font-semibold text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)]'
                    }`}
                  >
                    {col.id === 'title' ? (
                      <a
                        href={`/listings/${row.listing.path}`}
                        className="text-[var(--color-brand-deep)] group-hover:text-[var(--color-brand)] hover:underline"
                      >
                        {row.listing.title}
                        {!row.canViewFull && row.lockedReason === 'login' && (
                          <span className="ml-2 text-xs font-normal text-[var(--color-ink-muted)]">· log in</span>
                        )}
                      </a>
                    ) : col.id === 'rentPerMonth' ? (
                      <span className="font-semibold text-[var(--color-brand-deep)]">{cellValue(row.listing, col.id)}</span>
                    ) : (
                      cellValue(row.listing, col.id)
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
