import { useState } from 'react';
import FormShell from './forms/FormShell';
import FormSections, { FormActions, FormSection } from './forms/FormSections';
import PhotoUploadField, { uploadPhotosToApi } from './forms/PhotoUploadField';
import CurrencyField from './forms/CurrencyField';
import {
  BERLIN_NEIGHBORHOODS,
  CATEGORY_LABELS,
  LISTING_CATEGORIES,
  NEIGHBORHOOD_LABELS,
  RENT_TYPE_LABELS,
  RENT_TYPES,
} from '../types/listing';
import {
  HOUSEHOLD_LABELS,
  HOUSEHOLD_TYPES,
  LANGUAGE_LABELS,
  NATIONALITY_LABELS,
  NATIONALITY_OPTIONS,
  SPOKEN_LANGUAGES,
} from '../types/tenant-request';
import type { Nationality } from '../types/tenant-request';
import {
  SEEKER_VISIBILITY_DESCRIPTIONS,
  SEEKER_VISIBILITY_LABELS,
  SEEKER_VISIBILITY_OPTIONS,
  type SeekerVisibility,
} from '../lib/seeker-profile-access';
import { accountProfileHref } from '../lib/urls';

const defaultNeighborhoods = ['kreuzberg', 'neukolln', 'friedrichshain'];

const SECTIONS = [
  { label: 'Basics' },
  { label: 'About you' },
  { label: 'Budget & documents' },
  { label: 'Requirements' },
  { label: 'Lifestyle' },
  { label: 'Photos' },
] as const;

export default function SeekerRequestForm() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<(typeof LISTING_CATEGORIES)[number]>('shared_room');
  const [rentType, setRentType] = useState<(typeof RENT_TYPES)[number]>('long_term');
  const [householdType, setHouseholdType] = useState<(typeof HOUSEHOLD_TYPES)[number]>('single');
  const [budgetMax, setBudgetMax] = useState('900');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [neighborhoods, setNeighborhoods] = useState<string[]>(defaultNeighborhoods);
  const [availableFrom, setAvailableFrom] = useState('');
  const [description, setDescription] = useState('');
  const [anmeldungNeeded, setAnmeldungNeeded] = useState(true);
  const [hasSchufa, setHasSchufa] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [isSmoker, setIsSmoker] = useState(false);
  const [needsBedLinens, setNeedsBedLinens] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [nationality, setNationality] = useState<Nationality | ''>('');
  const [birthYear, setBirthYear] = useState('');
  const [occupation, setOccupation] = useState('');
  const [languages, setLanguages] = useState<string[]>(['english']);
  const [roomsMin, setRoomsMin] = useState('');
  const [sizeMin, setSizeMin] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<SeekerVisibility>('everyone');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleNeighborhood(slug: string) {
    setNeighborhoods((prev) =>
      prev.includes(slug) ? prev.filter((n) => n !== slug) : [...prev, slug],
    );
  }

  function toggleLanguage(code: string) {
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const urls = await uploadPhotosToApi(files, photoUrls.length, 10);
      setPhotoUrls((prev) => [...prev, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          rentType,
          householdType,
          budgetMax: Number(budgetMax),
          monthlyIncome: monthlyIncome ? Number(monthlyIncome) : null,
          desiredNeighborhoods: neighborhoods,
          availableFrom: availableFrom || new Date().toISOString().slice(0, 10),
          roomsMin: roomsMin ? Number(roomsMin) : null,
          sizeMin: sizeMin ? Number(sizeMin) : null,
          anmeldungNeeded,
          hasSchufa,
          hasPets,
          isSmoker,
          needsBedLinens,
          isStudent,
          nationality: nationality || null,
          birthYear: birthYear ? Number(birthYear) : null,
          occupation: occupation || null,
          spokenLanguages: languages,
          description,
          photoUrls,
          visibility,
          status: 'active',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to publish profile');
      }

      const data: { handle: string } = await res.json();
      window.location.href = accountProfileHref(data.handle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  const canPublish = title.length >= 5 && description.length >= 20 && neighborhoods.length > 0;

  return (
    <FormShell
      error={error || undefined}
      notice={{
        variant: 'brand',
        title: 'Post your seeker profile',
        children: (
          <>
            All profile details are optional — but the more you add, the easier it is for landlords to find you.
          </>
        ),
      }}
      onSubmit={handleSubmit}
      footer={
        <FormActions className="form-actions--end">
          <button type="submit" className="btn-brand" disabled={loading || uploading || !canPublish}>
            {loading ? 'Publishing…' : 'Publish seeker profile'}
          </button>
        </FormActions>
      }
    >
      <FormSections>
        <FormSection title={SECTIONS[0].label} step={1}>
          <div>
            <label className="field-label" htmlFor="title">Headline</label>
            <input
              id="title"
              className="field-input"
              required
              minLength={5}
              maxLength={120}
              placeholder="e.g. Professional looking for room in Kreuzberg"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="field-label" htmlFor="category">Looking for</label>
              <select id="category" className="field-input" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                {LISTING_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="rentType">Rent type</label>
              <select id="rentType" className="field-input" value={rentType} onChange={(e) => setRentType(e.target.value as typeof rentType)}>
                {RENT_TYPES.map((c) => <option key={c} value={c}>{RENT_TYPE_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="householdType">Household</label>
              <select id="householdType" className="field-input" value={householdType} onChange={(e) => setHouseholdType(e.target.value as typeof householdType)}>
                {HOUSEHOLD_TYPES.map((c) => <option key={c} value={c}>{HOUSEHOLD_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
        </FormSection>

        <FormSection title={SECTIONS[1].label} step={2}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="field-label" htmlFor="birthYear">Year of birth</label>
              <input id="birthYear" type="number" className="field-input" min={1920} max={new Date().getFullYear()} placeholder="e.g. 1995" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="nationality">Nationality</label>
              <select id="nationality" className="field-input" value={nationality} onChange={(e) => setNationality(e.target.value as Nationality | '')}>
                <option value="">Select…</option>
                {NATIONALITY_OPTIONS.map((c) => <option key={c} value={c}>{NATIONALITY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="occupation">Occupation / job</label>
              <input id="occupation" className="field-input" maxLength={120} placeholder="e.g. Software engineer" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isStudent} onChange={(e) => setIsStudent(e.target.checked)} className="size-4 rounded border-[var(--color-border)]" />
            I am a student
          </label>
          <div>
            <label className="field-label">Spoken languages</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SPOKEN_LANGUAGES.map((code) => (
                <button key={code} type="button" onClick={() => toggleLanguage(code)} className={`chip ${languages.includes(code) ? 'chip-active' : ''}`}>
                  {LANGUAGE_LABELS[code]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="description">About you</label>
            <textarea
              id="description"
              className="field-input min-h-[140px]"
              required
              minLength={20}
              maxLength={5000}
              placeholder="Tell landlords about yourself, your situation, lifestyle, and what you're looking for…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </FormSection>

        <FormSection title={SECTIONS[2].label} step={3}>
          <div className="grid gap-4 sm:grid-cols-2">
            <CurrencyField
              id="budgetMax"
              label="Budget / mo"
              required
              min={1}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
            />
            <CurrencyField
              id="monthlyIncome"
              label="Monthly income"
              min={0}
              placeholder="Optional"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={anmeldungNeeded} onChange={(e) => setAnmeldungNeeded(e.target.checked)} className="size-4 rounded border-[var(--color-border)]" />
              Need Anmeldung
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hasSchufa} onChange={(e) => setHasSchufa(e.target.checked)} className="size-4 rounded border-[var(--color-border)]" />
              Have SCHUFA
            </label>
          </div>
        </FormSection>

        <FormSection title={SECTIONS[3].label} step={4}>
          <div>
            <label className="field-label">Desired areas</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {BERLIN_NEIGHBORHOODS.map((slug) => (
                <button key={slug} type="button" onClick={() => toggleNeighborhood(slug)} className={`chip ${neighborhoods.includes(slug) ? 'chip-active' : ''}`}>
                  {NEIGHBORHOOD_LABELS[slug]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="field-label" htmlFor="availableFrom">Available from</label>
              <input id="availableFrom" type="date" className="field-input" required value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="roomsMin">Min rooms</label>
              <input id="roomsMin" type="number" className="field-input" min={1} value={roomsMin} onChange={(e) => setRoomsMin(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="sizeMin">Min size (m²)</label>
              <input id="sizeMin" type="number" className="field-input" min={5} value={sizeMin} onChange={(e) => setSizeMin(e.target.value)} />
            </div>
          </div>
        </FormSection>

        <FormSection title={SECTIONS[4].label} step={5}>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hasPets} onChange={(e) => setHasPets(e.target.checked)} className="size-4 rounded border-[var(--color-border)]" />
              Have pets
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isSmoker} onChange={(e) => setIsSmoker(e.target.checked)} className="size-4 rounded border-[var(--color-border)]" />
              Smoker
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={needsBedLinens} onChange={(e) => setNeedsBedLinens(e.target.checked)} className="size-4 rounded border-[var(--color-border)]" />
              Need bed linens & towels
            </label>
          </div>
        </FormSection>

        <FormSection title={SECTIONS[5].label} step={6}>
          <div>
            <p className="field-label">Who can see your full profile?</p>
            <div className="mt-2 space-y-3">
              {SEEKER_VISIBILITY_OPTIONS.map((option) => (
                <label key={option} className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="radio"
                    name="visibility"
                    className="mt-0.5 size-4 border-[var(--color-border)]"
                    checked={visibility === option}
                    onChange={() => setVisibility(option)}
                  />
                  <span>
                    <span className="font-medium text-[var(--color-ink)]">{SEEKER_VISIBILITY_LABELS[option]}</span>
                    <span className="mt-0.5 block text-[var(--color-ink-muted)]">
                      {SEEKER_VISIBILITY_DESCRIPTIONS[option]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <PhotoUploadField
            photoUrls={photoUrls}
            onChange={setPhotoUrls}
            maxPhotos={10}
            hint={
              visibility === 'everyone'
                ? 'Up to 10 photos. Visible according to your profile visibility setting.'
                : 'Up to 10 photos. Only shown to viewers who match your visibility setting.'
            }
            uploading={uploading}
            onUpload={uploadPhotos}
          />
        </FormSection>
      </FormSections>
    </FormShell>
  );
}
