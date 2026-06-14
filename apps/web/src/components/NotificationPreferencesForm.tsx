import { useEffect, useState } from 'react';
import type { EmailDigest, NotificationPreferences } from '../lib/notification-preferences';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start justify-between gap-4 py-4 ${disabled ? 'opacity-50' : ''}`}>
      <span>
        <span className="block text-sm font-semibold text-[var(--color-ink)]">{label}</span>
        <span className="mt-0.5 block text-sm text-[var(--color-ink-muted)]">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 shrink-0 rounded border-[var(--color-border)]"
      />
    </label>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-4">
        <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">{title}</h2>
        {description && <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{description}</p>}
      </div>
      <div className="divide-y divide-[var(--color-border)] px-6">{children}</div>
    </section>
  );
}

export default function NotificationPreferencesForm() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/notification-preferences')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setPrefs(data.preferences))
      .catch(() => setError('Could not load your preferences.'))
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) {
    setPrefs((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function save() {
    if (!prefs) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPrefs(data.preferences);
      setSaved(true);
    } catch {
      setError('Could not save. Check quiet-hour times use HH:MM format.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>;
  }

  if (!prefs) {
    return <p className="text-sm text-red-600">{error || 'Something went wrong.'}</p>;
  }

  const channelsOff = !prefs.inAppEnabled && !prefs.emailEnabled;

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <Section title="Delivery channels" description="Choose how renting.berlin can reach you.">
        <ToggleRow
          label="In-app notifications"
          description="Bell alerts on saved searches and activity while you are signed in."
          checked={prefs.inAppEnabled}
          onChange={(v) => update('inAppEnabled', v)}
        />
        <ToggleRow
          label="Email"
          description="Messages and digests sent to your account email."
          checked={prefs.emailEnabled}
          onChange={(v) => update('emailEnabled', v)}
        />
      </Section>

      <Section title="Notification types" description="Fine-tune what each channel should include.">
        <ToggleRow
          label="New messages"
          description="When someone replies in a conversation about a listing."
          checked={prefs.notifyMessages}
          onChange={(v) => update('notifyMessages', v)}
          disabled={channelsOff}
        />
        <ToggleRow
          label="Saved search matches"
          description="New listings or seeker profiles that match your saved filters."
          checked={prefs.notifySavedSearches}
          onChange={(v) => update('notifySavedSearches', v)}
          disabled={channelsOff}
        />
        <ToggleRow
          label="Profile views"
          description="When a signed-in landlord views your seeker profile (email when available)."
          checked={prefs.notifyProfileViews}
          onChange={(v) => update('notifyProfileViews', v)}
          disabled={channelsOff}
        />
        <ToggleRow
          label="Your listing activity"
          description="Status changes and inquiries on listings you publish."
          checked={prefs.notifyListingUpdates}
          onChange={(v) => update('notifyListingUpdates', v)}
          disabled={channelsOff}
        />
        <ToggleRow
          label="Product news"
          description="Occasional updates about new features on renting.berlin."
          checked={prefs.notifyProductNews}
          onChange={(v) => update('notifyProductNews', v)}
          disabled={channelsOff}
        />
      </Section>

      <Section title="Email timing" description="For non-urgent alerts when email is enabled.">
        <div className="py-4">
          <label className="block text-sm font-semibold text-[var(--color-ink)]">Email frequency</label>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">Messages stay instant when enabled.</p>
          <select
            value={prefs.emailDigest}
            disabled={!prefs.emailEnabled}
            onChange={(e) => update('emailDigest', e.target.value as EmailDigest)}
            className="mt-3 w-full max-w-xs rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm disabled:opacity-50"
          >
            <option value="instant">Instant — as things happen</option>
            <option value="daily">Daily digest — once per day</option>
            <option value="weekly">Weekly digest — once per week</option>
          </select>
        </div>
        <ToggleRow
          label="Quiet hours"
          description="Hold non-urgent emails overnight (Berlin time). They are sent when quiet hours end."
          checked={prefs.quietHoursEnabled}
          onChange={(v) => update('quietHoursEnabled', v)}
          disabled={!prefs.emailEnabled}
        />
        {prefs.quietHoursEnabled && prefs.emailEnabled && (
          <div className="grid gap-4 pb-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold text-[var(--color-ink)]">From</span>
              <input
                type="time"
                value={prefs.quietHoursStart ?? '22:00'}
                onChange={(e) => update('quietHoursStart', e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-[var(--color-ink)]">Until</span>
              <input
                type="time"
                value={prefs.quietHoursEnd ?? '08:00'}
                onChange={(e) => update('quietHoursEnd', e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5"
              />
            </label>
          </div>
        )}
      </Section>

      <Section title="Contact preferences" description="Tell others when you are open to messages.">
        <ToggleRow
          label="Accept new inquiries"
          description="Allow other users to start a conversation with you about your listings or profile."
          checked={prefs.acceptInquiries}
          onChange={(v) => update('acceptInquiries', v)}
        />
        <div className="py-4">
          <label className="block text-sm font-semibold text-[var(--color-ink)]">Preferred contact hours</label>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
            Optional note shown on your listings and seeker profile — e.g. &quot;Weekdays after 18:00&quot;.
          </p>
          <input
            type="text"
            maxLength={200}
            value={prefs.preferredContactHours ?? ''}
            onChange={(e) => update('preferredContactHours', e.target.value || null)}
            placeholder="Weekdays after 6pm, weekends anytime"
            className="mt-3 w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm"
          />
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="btn-brand">
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
        {saved && <span className="text-sm font-medium text-[var(--color-success)]">Saved</span>}
      </div>
    </div>
  );
}
