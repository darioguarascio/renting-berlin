import { useEffect, useState } from 'react';
import AddressMapPicker, { type LocationValue } from './AddressMapPicker';
import ListingCheckoutModal, { type CheckoutIntent } from './ListingCheckoutModal';
import FormShell from './forms/FormShell';
import FormAccordion, { FormAccordionPanel, FormActions, getSectionIndex } from './forms/FormAccordion';
import PhotoUploadField, { uploadPhotosToApi } from './forms/PhotoUploadField';
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
} from '../types/listing';
import type { Equipment, ListingCategory, RentType, RequiredDocument } from '../types/listing';

interface FormState {
  title: string;
  category: ListingCategory;
  rentType: RentType;
  availableFrom: string;
  availableTo: string;
  sizeSqm: number;
  rooms: number;
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
  equipment: Equipment[];
  photoUrls: string[];
}

const TABS = [
  { id: 'basics', label: 'Basics' },
  { id: 'location', label: 'Location' },
  { id: 'property', label: 'Property & costs' },
  { id: 'description', label: 'Description' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'photos', label: 'Photos' },
] as const;

type TabId = (typeof TABS)[number]['id'];

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
  onlineViewingAvailable: false,
  anmeldungAvailable: false,
  schufaRequired: false,
  location: defaultLocation,
  costs: { rentPerMonth: 0, utilities: 0, deposit: 0, equipmentFee: 0, other: 0 },
  descriptions: { apartment: '', location: '', misc: '' },
  requiredDocuments: [],
  equipment: [],
  photoUrls: [],
};

export default function ListingForm({ listingId, reactivate = false }: { listingId?: string; reactivate?: boolean }) {
  const [form, setForm] = useState<FormState>(initialState);
  const [expandedSection, setExpandedSection] = useState<TabId>('basics');
  const [currentStatus, setCurrentStatus] = useState<string>('draft');
  const [loadingListing, setLoadingListing] = useState(Boolean(listingId));
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showCheckout, setShowCheckout] = useState<CheckoutIntent | null>(null);

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
          costs: {
            rentPerMonth: row.costs.rentPerMonth,
            utilities: row.costs.utilities ?? 0,
            deposit: row.costs.deposit ?? 0,
            equipmentFee: row.costs.equipmentFee ?? 0,
            other: row.costs.other ?? 0,
          },
          descriptions: row.descriptions,
          requiredDocuments: row.requiredDocuments,
          equipment: row.equipment,
          photoUrls: row.photoUrls,
        });
      })
      .catch(() => setError('Could not load listing'))
      .finally(() => setLoadingListing(false));
  }, [listingId]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDoc(doc: RequiredDocument) {
    setForm((prev) => ({
      ...prev,
      requiredDocuments: prev.requiredDocuments.includes(doc)
        ? prev.requiredDocuments.filter((d) => d !== doc)
        : [...prev.requiredDocuments, doc],
    }));
  }

  function toggleEquip(item: Equipment) {
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
    setError('');
    try {
      const urls = await uploadPhotosToApi(files, form.photoUrls.length, 20);
      update('photoUrls', [...form.photoUrls, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
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
      onlineViewingAvailable: form.onlineViewingAvailable,
      anmeldungAvailable: form.anmeldungAvailable,
      schufaRequired: form.schufaRequired,
      address: form.location.address,
      neighborhood: form.location.neighborhood,
      lat: form.location.lat,
      lng: form.location.lng,
      approximateLocation: form.location.approximateLocation,
      costs: {
        rentPerMonth: form.costs.rentPerMonth,
        utilities: form.costs.utilities || undefined,
        deposit: form.costs.deposit || undefined,
        equipmentFee: form.costs.equipmentFee || undefined,
        other: form.costs.other || undefined,
      },
      descriptions: form.descriptions,
      requiredDocuments: form.requiredDocuments,
      equipment: form.equipment,
      photoUrls: form.photoUrls,
    };
    return status ? { ...payload, status } : payload;
  }

  async function saveChanges(status?: 'draft' | 'active') {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(status)),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: { path: string; status: string } = await res.json();
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

  async function submit(status: 'draft' | 'active') {
    if (listingId) {
      await saveChanges();
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(status)),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: { path: string; status: string } = await res.json();
      window.location.href = status === 'active' ? `/listings/${data.path}` : '/account/listings';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save listing');
    } finally {
      setSubmitting(false);
    }
  }

  const canPublish = form.title.length >= 5 && form.location.address.length >= 5;
  const stepIndex = getSectionIndex([...TABS], expandedSection);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === TABS.length - 1;

  function goToStep(direction: 'next' | 'prev') {
    const nextIndex = direction === 'next' ? stepIndex + 1 : stepIndex - 1;
    if (nextIndex >= 0 && nextIndex < TABS.length) {
      setExpandedSection(TABS[nextIndex].id);
    }
  }

  if (loadingListing) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading listing…</p>;
  }

  return (
    <>
      {showCheckout && listingId && (
        <ListingCheckoutModal
          listingId={listingId}
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
          submit('active');
        }}
        footer={
          <FormActions>
            {listingId ? (
              <>
                {currentStatus === 'paused' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => saveChanges('active')}
                      disabled={submitting || uploading || !canPublish}
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
              </>
            ) : (
              <>
                {!isFirstStep && (
                  <button type="button" onClick={() => goToStep('prev')} disabled={submitting || uploading} className="btn-ghost">
                    Back
                  </button>
                )}
                <button type="button" onClick={() => submit('draft')} disabled={submitting || uploading} className="btn-ghost">
                  Save draft
                </button>
                {!isLastStep ? (
                  <button type="button" onClick={() => goToStep('next')} disabled={submitting || uploading} className="btn-brand">
                    Continue
                  </button>
                ) : (
                  <button type="submit" disabled={submitting || uploading || !canPublish} className="btn-brand">
                    {submitting ? 'Publishing…' : 'Publish listing'}
                  </button>
                )}
              </>
            )}
          </FormActions>
        }
        extra={
          listingId && currentStatus !== 'closed' ? (
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
        <FormAccordion
          sections={[...TABS]}
          expandedSection={expandedSection}
          onExpandedChange={setExpandedSection}
          idPrefix="listing"
          ariaLabel="Listing sections"
        >
          <FormAccordionPanel sectionId="basics">
              <div>
                <label className="field-label" htmlFor="title">Title</label>
                <input
                  id="title"
                  type="text"
                  className="field-input"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="Bright 2-room flat in Kreuzberg"
                  required
                  minLength={5}
                />
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
          </FormAccordionPanel>

          <FormAccordionPanel sectionId="location" className="space-y-0">
            <AddressMapPicker value={form.location} onChange={(loc) => update('location', loc)} />
          </FormAccordionPanel>

          <FormAccordionPanel sectionId="property">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="sizeSqm">Size (m²)</label>
                  <input id="sizeSqm" type="number" min={5} className="field-input" value={form.sizeSqm} onChange={(e) => update('sizeSqm', Number(e.target.value))} />
                </div>
                <div>
                  <label className="field-label" htmlFor="rooms">Rooms</label>
                  <input id="rooms" type="number" min={1} className="field-input" value={form.rooms} onChange={(e) => update('rooms', Number(e.target.value))} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="field-label" htmlFor="rentPerMonth">Rent per month (€)</label>
                  <input id="rentPerMonth" type="number" min={0} className="field-input" value={form.costs.rentPerMonth || ''} onChange={(e) => update('costs', { ...form.costs, rentPerMonth: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="field-label" htmlFor="utilities">Utilities (€/mo)</label>
                  <input id="utilities" type="number" min={0} className="field-input" value={form.costs.utilities || ''} onChange={(e) => update('costs', { ...form.costs, utilities: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="field-label" htmlFor="deposit">Deposit (€)</label>
                  <input id="deposit" type="number" min={0} className="field-input" value={form.costs.deposit || ''} onChange={(e) => update('costs', { ...form.costs, deposit: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="field-label" htmlFor="equipmentFee">Equipment fee (€)</label>
                  <input id="equipmentFee" type="number" min={0} className="field-input" value={form.costs.equipmentFee || ''} onChange={(e) => update('costs', { ...form.costs, equipmentFee: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="field-label" htmlFor="other">Other costs (€)</label>
                  <input id="other" type="number" min={0} className="field-input" value={form.costs.other || ''} onChange={(e) => update('costs', { ...form.costs, other: Number(e.target.value) })} />
                </div>
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
          </FormAccordionPanel>

          <FormAccordionPanel sectionId="description">
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
          </FormAccordionPanel>

          <FormAccordionPanel sectionId="requirements">
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
                <label className="field-label">Equipment & amenities</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EQUIPMENT.map((item) => (
                    <button key={item} type="button" onClick={() => toggleEquip(item)} className={`chip ${form.equipment.includes(item) ? 'chip-active' : ''}`}>
                      {EQUIPMENT_LABELS[item]}
                    </button>
                  ))}
                </div>
              </div>
          </FormAccordionPanel>

          <FormAccordionPanel sectionId="photos">
            <PhotoUploadField
              photoUrls={form.photoUrls}
              onChange={(urls) => update('photoUrls', urls)}
              maxPhotos={20}
              hint="Up to 20 photos. First photo is used as the cover image."
              uploading={uploading}
              onUpload={uploadPhotos}
            />
          </FormAccordionPanel>
        </FormAccordion>
      </FormShell>
    </>
  );
}
