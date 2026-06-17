import { useCallback, useEffect, useRef, useState } from 'react';
import AddressMapPicker, { type LocationValue } from './AddressMapPicker';
import ListingCheckoutModal, { type CheckoutIntent } from './ListingCheckoutModal';
import FormShell from './forms/FormShell';
import FormSections, { FormActions, FormSection } from './forms/FormSections';
import PhotoUploadField, { uploadPhotosToApi } from './forms/PhotoUploadField';
import CurrencyField from './forms/CurrencyField';
import {
  BERLIN_NEIGHBORHOODS,
  CATEGORY_LABELS,
  DOCUMENT_LABELS,
  EQUIPMENT_LABELS,
  RENT_TYPE_LABELS,
  REQUIRED_DOCUMENTS,
  EQUIPMENT,
  LISTING_CATEGORIES,
  RENT_TYPES,
  FLOOR_LEVEL_OPTIONS,
} from '../types/listing';
import type { Equipment, FloorLevel, ListingCategory, RentType, RequiredDocument } from '../types/listing';
import type { ListingFieldErrors } from '../lib/listing-form-validation';
import { trackEvent } from '../lib/rybbit';
import {
  formatListingApiError,
  pickValidListingPatch,
  validateListingPayload,
} from '../lib/listing-form-validation';

interface FormState {
  title: string;
  category: ListingCategory;
  rentType: RentType;
  availableFrom: string;
  availableTo: string;
  sizeSqm: number;
  rooms: number;
  floorLevel: FloorLevel | null;
  onlineViewingAvailable: boolean;
  anmeldungAvailable: boolean;
  schufaRequired: boolean;
  location: LocationValue;
  costs: {
    rentPerMonth: number;
    utilities: number;
    deposit: number;
    equipmentFee: number;
    other: number;
  };
  descriptions: {
    apartment: string;
    location: string;
    misc: string;
  };
  requiredDocuments: RequiredDocument[];
  requiredDocumentsOther: string;
  equipment: Equipment[];
  photoUrls: string[];
  hidePublisherName: boolean;
}

const SECTIONS = [
  { label: 'Basics' },
  { label: 'Location' },
  { label: 'Property & costs' },
  { label: 'Description' },
  { label: 'Requirements' },
  { label: 'Photos' },
] as const;

const AUTO_SAVE_DELAY_MS = 800;
const DRAFT_TITLE_PLACEHOLDER = 'Draft listing';
const DRAFT_ADDRESS_PLACEHOLDER = 'Berlin, Germany';

const defaultLocation: LocationValue = {
  address: '',
  neighborhood: BERLIN_NEIGHBORHOODS[0],
  lat: 52.52,
  lng: 13.405,
  approximateLocation: false,
};

const initialState: FormState = {
  title: '',
  category: 'full_flat',
  rentType: 'long_term',
  availableFrom: new Date().toISOString().slice(0, 10),
  availableTo: '',
  sizeSqm: 50,
  rooms: 2,
  floorLevel: 2,
  onlineViewingAvailable: false,
  anmeldungAvailable: false,
  schufaRequired: false,
  location: defaultLocation,
  costs: { rentPerMonth: 0, utilities: 0, deposit: 0, equipmentFee: 0, other: 0 },
  descriptions: { apartment: '', location: '', misc: '' },
  requiredDocuments: [],
  requiredDocumentsOther: '',
  equipment: [],
  photoUrls: [],
  hidePublisherName: false,
};

export default function ListingForm({ listingId, reactivate = false }: { listingId?: string; reactivate?: boolean }) {
  const [form, setForm] = useState<FormState>(initialState);
  const [savedListingId, setSavedListingId] = useState<string | undefined>(listingId);
  const [currentStatus, setCurrentStatus] = useState<string>('draft');
  const [loadingListing, setLoadingListing] = useState(Boolean(listingId));
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [fieldErrors, setFieldErrors] = useState<ListingFieldErrors>({});
  const [error, setError] = useState('');
  const [showCheckout, setShowCheckout] = useState<CheckoutIntent | null>(null);
  const [copyrightConfirmed, setCopyrightConfirmed] = useState(false);
  const skipAutoSaveRef = useRef(true);
  const hasEditedRef = useRef(false);
  const autoSaveRequestRef = useRef(0);

  const usesAutoSave = !listingId || currentStatus === 'draft';

  useEffect(() => {
    if (!listingId) return;
    fetch(`/api/listings/${listingId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Listing not found');
        return r.json();
      })
      .then((row) => {
        setCurrentStatus(row.status);
        setForm({
          title: row.title,
          category: row.category,
          rentType: row.rentType,
          availableFrom: row.availableFrom.slice(0, 10),
          availableTo: row.availableTo ? row.availableTo.slice(0, 10) : '',
          sizeSqm: row.sizeSqm,
          rooms: row.rooms,
          floorLevel: row.floorLevel ?? null,
          onlineViewingAvailable: row.onlineViewingAvailable,
          anmeldungAvailable: row.anmeldungAvailable,
          schufaRequired: row.schufaRequired,
          location: {
            address: row.address,
            neighborhood: row.neighborhood,
            lat: row.lat,
            lng: row.lng,
            approximateLocation: row.approximateLocation,
          },
          hidePublisherName: row.hidePublisherName,
          costs: {
            rentPerMonth: row.costs.rentPerMonth,
            utilities: row.costs.utilities ?? 0,
            deposit: row.costs.deposit ?? 0,
            equipmentFee: row.costs.equipmentFee ?? 0,
            other: row.costs.other ?? 0,
          },
          descriptions: row.descriptions,
          requiredDocuments: (row.requiredDocuments as string[]).filter((doc): doc is RequiredDocument =>
            (REQUIRED_DOCUMENTS as readonly string[]).includes(doc),
          ),
          requiredDocumentsOther: row.requiredDocumentsOther ?? '',
          equipment: row.equipment,
          photoUrls: row.photoUrls,
        });
      })
      .catch(() => setError('Could not load listing'))
      .finally(() => {
        setLoadingListing(false);
        skipAutoSaveRef.current = false;
      });
  }, [listingId]);

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function markEdited() {
    hasEditedRef.current = true;
    skipAutoSaveRef.current = false;
  }

  function fieldInputClass(fieldKey: string) {
    return fieldErrors[fieldKey] ? 'field-input border-red-400' : 'field-input';
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    markEdited();
    clearFieldError(String(key));
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateLocation(location: LocationValue) {
    markEdited();
    clearFieldError('address');
    setForm((prev) => ({ ...prev, location }));
  }

  function toggleDoc(doc: RequiredDocument) {
    markEdited();
    setForm((prev) => ({
      ...prev,
      requiredDocuments: prev.requiredDocuments.includes(doc)
        ? prev.requiredDocuments.filter((d) => d !== doc)
        : [...prev.requiredDocuments, doc],
    }));
  }

  function toggleEquip(item: Equipment) {
    markEdited();
    setForm((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter((e) => e !== item)
        : [...prev.equipment, item],
    }));
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');
    try {
      const urls = await uploadPhotosToApi(files, form.photoUrls.length, 20, setUploadProgress);
      update('photoUrls', [...form.photoUrls, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function buildPayload(status?: 'draft' | 'active') {
    const payload = {
      title: form.title,
      category: form.category,
      rentType: form.rentType,
      availableFrom: form.availableFrom,
      availableTo: form.availableTo || null,
      sizeSqm: form.sizeSqm,
      rooms: form.rooms,
      floorLevel: form.floorLevel,
      onlineViewingAvailable: form.onlineViewingAvailable,
      anmeldungAvailable: form.anmeldungAvailable,
      schufaRequired: form.schufaRequired,
      address: form.location.address,
      neighborhood: form.location.neighborhood,
      lat: form.location.lat,
      lng: form.location.lng,
      approximateLocation: form.location.approximateLocation,
      hidePublisherName: form.hidePublisherName,
      costs: {
        rentPerMonth: form.costs.rentPerMonth,
        utilities: form.costs.utilities || undefined,
        deposit: form.costs.deposit || undefined,
        equipmentFee: form.costs.equipmentFee || undefined,
        other: form.costs.other || undefined,
      },
      descriptions: form.descriptions,
      requiredDocuments: form.requiredDocuments,
      requiredDocumentsOther: form.requiredDocumentsOther.trim() || null,
      equipment: form.equipment,
      photoUrls: form.photoUrls,
    };
    return status ? { ...payload, status } : payload;
  }

  function buildCreateDraftPayload() {
    const payload = buildPayload('draft');
    return {
      ...payload,
      title: payload.title.length >= 5 ? payload.title : DRAFT_TITLE_PLACEHOLDER,
      address: payload.address.length >= 5 ? payload.address : DRAFT_ADDRESS_PLACEHOLDER,
    };
  }

  function buildAutosaveBody() {
    if (!savedListingId) {
      return buildCreateDraftPayload();
    }
    return pickValidListingPatch(buildPayload());
  }

  const autoSaveDraft = useCallback(async () => {
    if (!usesAutoSave || loadingListing || uploading || submitting) return;

    const body = buildAutosaveBody();
    if (savedListingId && Object.keys(body).length === 0) {
      setAutoSaveStatus('idle');
      return;
    }

    const requestId = ++autoSaveRequestRef.current;
    setAutoSaveStatus('saving');

    try {
      const res = savedListingId
        ? await fetch(`/api/listings/${savedListingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

      if (!res.ok) throw new Error(formatListingApiError(await res.text()));

      const data: { id: string; path: string; status: string } = await res.json();
      if (requestId !== autoSaveRequestRef.current) return;

      if (!savedListingId) {
        setSavedListingId(data.id);
        setCurrentStatus(data.status);
        trackEvent('Listing Draft Saved', { category: form.category, rent_type: form.rentType });
        if (!listingId) {
          window.history.replaceState(null, '', `/account/listings/${data.id}/edit`);
        }
      }

      setAutoSaveStatus('saved');
    } catch {
      if (requestId === autoSaveRequestRef.current) {
        setAutoSaveStatus('error');
      }
    }
  }, [form, loadingListing, uploading, submitting, savedListingId, usesAutoSave, listingId]);

  useEffect(() => {
    if (!usesAutoSave || skipAutoSaveRef.current || !hasEditedRef.current || loadingListing || uploading || submitting) {
      return;
    }

    setAutoSaveStatus((status) => (status === 'saving' ? status : 'idle'));
    const timer = window.setTimeout(() => {
      void autoSaveDraft();
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [form, usesAutoSave, loadingListing, uploading, submitting, autoSaveDraft]);

  async function saveChanges(status?: 'draft' | 'active') {
    const id = savedListingId ?? listingId;
    if (!id) return;

    const payload = buildPayload(status);
    const validation = validateListingPayload(payload, { partial: true });
    if (!validation.success) {
      setFieldErrors(validation.fieldErrors);
      setError(validation.message);
      return;
    }

    setSubmitting(true);
    setError('');
    setFieldErrors({});
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(formatListingApiError(await res.text()));
      const data: { path: string; status: string } = await res.json();
      if (status === 'active' && currentStatus === 'paused') {
        trackEvent('Listing Reactivated', { category: form.category, rent_type: form.rentType });
      } else {
        trackEvent('Listing Updated', { category: form.category, rent_type: form.rentType });
      }
      if (status === 'active') {
        window.location.href = `/listings/${data.path}`;
      } else {
        window.location.href = '/account/listings';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save listing');
    } finally {
      setSubmitting(false);
    }
  }

  async function publishListing() {
    const id = savedListingId ?? listingId;
    const payload = buildPayload('active');
    const validation = validateListingPayload(payload);
    if (!validation.success) {
      setFieldErrors(validation.fieldErrors);
      setError(validation.message);
      return;
    }

    setSubmitting(true);
    setError('');
    setFieldErrors({});
    try {
      const res = id
        ? await fetch(`/api/listings/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error(formatListingApiError(await res.text()));
      const data: { path: string; status: string } = await res.json();
      trackEvent('Listing Published', { category: form.category, rent_type: form.rentType });
      window.location.href = `/listings/${data.path}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish listing');
    } finally {
      setSubmitting(false);
    }
  }

  async function submit() {
    await publishListing();
  }

  const canPublish = validateListingPayload(buildPayload('active')).success;
  const needsCopyrightConfirm = !savedListingId || currentStatus === 'paused';
  const autoSaveLabel =
    autoSaveStatus === 'saving'
      ? 'Saving draft…'
      : autoSaveStatus === 'saved'
        ? 'Draft saved'
        : autoSaveStatus === 'error'
          ? 'Draft not saved'
          : usesAutoSave
            ? 'Draft saves automatically'
            : null;

  if (loadingListing) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading listing…</p>;
  }

  return (
    <>
      {showCheckout && savedListingId && (
        <ListingCheckoutModal
          listingId={savedListingId}
          listingTitle={form.title}
          intent={showCheckout}
          onComplete={(status) => {
            if (showCheckout === 'close') {
              window.location.href = '/account/listings';
            } else {
              setCurrentStatus(status);
              setShowCheckout(null);
            }
          }}
          onCancel={() => setShowCheckout(null)}
        />
      )}
      <FormShell
        error={error || undefined}
        notice={
          reactivate && currentStatus === 'paused'
            ? {
                variant: 'warning',
                title: 'Review your listing before reactivating',
                children: 'Update any details below, then reactivate when everything looks good.',
              }
            : undefined
        }
        onSubmit={(e) => {
          e.preventDefault();
          if (needsCopyrightConfirm && !copyrightConfirmed) return;
          void submit();
        }}
        footer={
          listingId && currentStatus !== 'draft' ? (
            <FormActions className="form-actions--end">
              {currentStatus === 'paused' ? (
                <>
                  <button
                    type="button"
                    onClick={() => saveChanges('active')}
                    disabled={submitting || uploading || (needsCopyrightConfirm && !copyrightConfirmed)}
                    className="btn-brand"
                  >
                    {submitting ? 'Reactivating…' : 'Reactivate listing'}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveChanges()}
                    disabled={submitting || uploading}
                    className="btn-ghost"
                  >
                    {submitting ? 'Saving…' : 'Save without reactivating'}
                  </button>
                </>
              ) : (
                <button type="submit" disabled={submitting || uploading || !canPublish} className="btn-brand">
                  {submitting ? 'Saving…' : 'Save changes'}
                </button>
              )}
              {currentStatus === 'active' && (
                <button type="button" onClick={() => setShowCheckout('unlist')} disabled={submitting} className="btn-ghost">
                  Deactivate listing
                </button>
              )}
              <a href="/account/listings" className="btn-ghost">Cancel</a>
            </FormActions>
          ) : (
            <FormActions className="form-actions--split">
              {autoSaveLabel && (
                <p className="text-sm text-[var(--color-ink-muted)]" aria-live="polite">
                  {autoSaveLabel}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting || uploading || (needsCopyrightConfirm && !copyrightConfirmed)}
                className="btn-brand"
              >
                {submitting ? 'Publishing…' : 'Publish listing'}
              </button>
            </FormActions>
          )
        }
        extra={
          savedListingId && currentStatus !== 'closed' ? (
            <section className="form-danger-section">
              <p className="form-danger-section__title">Close permanently</p>
              <p className="form-danger-section__body">
                Remove this listing for good. It will be hidden from search and cannot be reactivated.
              </p>
              <button
                type="button"
                onClick={() => setShowCheckout('close')}
                disabled={submitting}
                className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Close permanently
              </button>
            </section>
          ) : undefined
        }
      >
        <FormSections>
          <FormSection title={SECTIONS[0].label} step={1}>
              <div>
                <label className="field-label" htmlFor="title">Title</label>
                <input
                  id="title"
                  type="text"
                  className={fieldInputClass('title')}
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="Bright 2-room flat in Kreuzberg"
                  required
                  minLength={5}
                  aria-invalid={Boolean(fieldErrors.title)}
                  aria-describedby={fieldErrors.title ? 'title-error' : undefined}
                />
                {fieldErrors.title && (
                  <p id="title-error" className="mt-1 text-xs text-red-600">
                    {fieldErrors.title}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="category">Category</label>
                  <select id="category" className="field-input" value={form.category} onChange={(e) => update('category', e.target.value as ListingCategory)}>
                    {LISTING_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="rentType">Rent type</label>
                  <select id="rentType" className="field-input" value={form.rentType} onChange={(e) => update('rentType', e.target.value as RentType)}>
                    {RENT_TYPES.map((r) => <option key={r} value={r}>{RENT_TYPE_LABELS[r]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="availableFrom">Available from</label>
                  <input id="availableFrom" type="date" className="field-input" value={form.availableFrom} onChange={(e) => update('availableFrom', e.target.value)} />
                </div>
                <div>
                  <label className="field-label" htmlFor="availableTo">Available until (optional)</label>
                  <input id="availableTo" type="date" className="field-input" value={form.availableTo} onChange={(e) => update('availableTo', e.target.value)} />
                </div>
              </div>
          </FormSection>

          <FormSection title={SECTIONS[1].label} step={2} className="space-y-0">
            <AddressMapPicker
              value={form.location}
              onChange={updateLocation}
              addressError={fieldErrors.address}
            />
            <div className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-muted)]">Privacy</p>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.hidePublisherName}
                  onChange={(e) => update('hidePublisherName', e.target.checked)}
                  className="size-4 rounded border-[var(--color-border)]"
                />
                Hide my name — show "landlord" instead on the public listing
              </label>
            </div>
          </FormSection>

          <FormSection title={SECTIONS[2].label} step={3}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="field-label" htmlFor="sizeSqm">Size (m²)</label>
                  <input id="sizeSqm" type="number" min={5} className="field-input" value={form.sizeSqm} onChange={(e) => update('sizeSqm', Number(e.target.value))} />
                </div>
                <div>
                  <label className="field-label" htmlFor="rooms">Rooms</label>
                  <input id="rooms" type="number" min={1} className="field-input" value={form.rooms} onChange={(e) => update('rooms', Number(e.target.value))} />
                </div>
                <div>
                  <label className="field-label" htmlFor="floorLevel">Floor</label>
                  <select
                    id="floorLevel"
                    className="field-input"
                    value={form.floorLevel ?? ''}
                    onChange={(e) => update('floorLevel', e.target.value ? Number(e.target.value) as FloorLevel : null)}
                  >
                    <option value="">Please select</option>
                    {FLOOR_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <CurrencyField
                  id="rentPerMonth"
                  label="Rent per month"
                  min={0}
                  value={form.costs.rentPerMonth || ''}
                  onChange={(e) => update('costs', { ...form.costs, rentPerMonth: Number(e.target.value) })}
                />
                <CurrencyField
                  id="utilities"
                  label="Utilities / mo"
                  min={0}
                  value={form.costs.utilities || ''}
                  onChange={(e) => update('costs', { ...form.costs, utilities: Number(e.target.value) })}
                />
                <CurrencyField
                  id="deposit"
                  label="Deposit"
                  min={0}
                  value={form.costs.deposit || ''}
                  onChange={(e) => update('costs', { ...form.costs, deposit: Number(e.target.value) })}
                />
                <CurrencyField
                  id="equipmentFee"
                  label="Equipment fee"
                  min={0}
                  value={form.costs.equipmentFee || ''}
                  onChange={(e) => update('costs', { ...form.costs, equipmentFee: Number(e.target.value) })}
                />
                <CurrencyField
                  id="other"
                  label="Other costs"
                  min={0}
                  value={form.costs.other || ''}
                  onChange={(e) => update('costs', { ...form.costs, other: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.onlineViewingAvailable} onChange={(e) => update('onlineViewingAvailable', e.target.checked)} className="size-4 rounded border-[var(--color-border)]" />
                  Online viewing available
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.anmeldungAvailable} onChange={(e) => update('anmeldungAvailable', e.target.checked)} className="size-4 rounded border-[var(--color-border)]" />
                  Anmeldung available
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.schufaRequired} onChange={(e) => update('schufaRequired', e.target.checked)} className="size-4 rounded border-[var(--color-border)]" />
                  SCHUFA required
                </label>
              </div>
          </FormSection>

          <FormSection title={SECTIONS[3].label} step={4}>
              <div>
                <label className="field-label" htmlFor="apartmentDesc">About the apartment</label>
                <textarea id="apartmentDesc" className="field-input min-h-[120px]" rows={4} value={form.descriptions.apartment} onChange={(e) => update('descriptions', { ...form.descriptions, apartment: e.target.value })} placeholder="Describe the flat, room layout, condition…" />
              </div>
              <div>
                <label className="field-label" htmlFor="locationDesc">About the location</label>
                <textarea id="locationDesc" className="field-input min-h-[100px]" rows={3} value={form.descriptions.location} onChange={(e) => update('descriptions', { ...form.descriptions, location: e.target.value })} placeholder="Neighborhood, transport, nearby amenities…" />
              </div>
              <div>
                <label className="field-label" htmlFor="miscDesc">Miscellaneous notes</label>
                <textarea id="miscDesc" className="field-input min-h-[80px]" rows={3} value={form.descriptions.misc} onChange={(e) => update('descriptions', { ...form.descriptions, misc: e.target.value })} placeholder="Anything else tenants should know" />
              </div>
              <div>
                <label className="field-label">Equipment & amenities</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EQUIPMENT.map((item) => (
                    <button key={item} type="button" onClick={() => toggleEquip(item)} className={`chip ${form.equipment.includes(item) ? 'chip-active' : ''}`}>
                      {EQUIPMENT_LABELS[item]}
                    </button>
                  ))}
                </div>
              </div>
          </FormSection>

          <FormSection title={SECTIONS[4].label} step={5}>
              <div>
                <label className="field-label">Documents required from tenant</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {REQUIRED_DOCUMENTS.map((doc) => (
                    <button key={doc} type="button" onClick={() => toggleDoc(doc)} className={`chip ${form.requiredDocuments.includes(doc) ? 'chip-active' : ''}`}>
                      {DOCUMENT_LABELS[doc]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="requiredDocumentsOther">Other requirements</label>
                <textarea
                  id="requiredDocumentsOther"
                  className="field-input mt-2 min-h-[80px]"
                  rows={3}
                  value={form.requiredDocumentsOther}
                  onChange={(e) => update('requiredDocumentsOther', e.target.value)}
                  placeholder="Any other documents or requirements not listed above"
                />
              </div>
          </FormSection>

          <FormSection title={SECTIONS[5].label} step={6}>
            <PhotoUploadField
              photoUrls={form.photoUrls}
              onChange={(urls) => update('photoUrls', urls)}
              maxPhotos={20}
              hint="Up to 20 photos. First photo is used as the cover image."
              uploading={uploading}
              uploadProgress={uploadProgress}
              onUpload={uploadPhotos}
            />
            {needsCopyrightConfirm && (
              <label className="form-disclaimer">
                <input
                  type="checkbox"
                  checked={copyrightConfirmed}
                  onChange={(e) => setCopyrightConfirmed(e.target.checked)}
                  className="form-disclaimer__checkbox"
                />
                <span>
                  I confirm that the photos and map in this listing are my own or properly licensed,
                  and do not include copyrighted third-party material (such as Google Maps screenshots).
                </span>
              </label>
            )}
          </FormSection>
        </FormSections>
      </FormShell>
    </>
  );
}
