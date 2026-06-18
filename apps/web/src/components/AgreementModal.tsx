import { useEffect, useState } from 'react';
import { trackEvent } from '../lib/rybbit';

type AgreementStatus = 'proposed' | 'signed' | 'declined' | 'withdrawn';

interface Agreement {
  id: string;
  status: AgreementStatus;
  title: string;
  monthlyRent: number;
  deposit: number | null;
  startDate: string;
  endDate: string | null;
  terms: string | null;
  proposerId: string;
  counterpartyId: string;
  proposerSignatureName: string;
  proposerSignedAt: string;
  counterpartySignatureName: string | null;
  counterpartySignedAt: string | null;
  declineReason: string | null;
  resolvedAt: string | null;
  createdAt: string;
  viewerIsProposer: boolean;
  viewerHasSigned: boolean;
}

interface AgreementContext {
  conversation: {
    id: string;
    contextKind: 'listing' | 'seeker';
    listingId: string | null;
    listingTitle: string | null;
    otherUserName: string;
    viewerIsLandlord: boolean;
  };
  agreement: Agreement | null;
  canPropose: boolean;
  rejectableCount: number;
  defaults: {
    title: string;
    monthlyRent: number;
    deposit: number | null;
    startDate: string;
    endDate: string | null;
  };
}

interface Props {
  conversationId: string;
  onClose: () => void;
  onChanged?: () => void;
}

const DEFAULT_REJECTION =
  'Thank you so much for your interest and for taking the time to reach out. ' +
  'Unfortunately the place has now been promised to someone else, so I have to ' +
  'pass for now. Wishing you all the best with your search! 🙏';

function euro(n: number): string {
  return `€${n.toLocaleString('en-GB')}`;
}

function longDate(iso: string): string {
  return new Date(iso.includes('T') ? iso : `${iso}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function Signature({ name, at }: { name: string; at: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3">
      <p className="font-display text-lg italic text-[var(--color-ink)]">{name}</p>
      <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">Signed {longDate(at)}</p>
    </div>
  );
}

function PendingSlot({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white px-4 py-3">
      <p className="text-sm text-[var(--color-ink-muted)]">Awaiting signature</p>
      <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{label}</p>
    </div>
  );
}

const STATUS_BADGE: Record<AgreementStatus, { label: string; cls: string }> = {
  proposed: { label: 'Awaiting signature', cls: 'badge-signal' },
  signed: { label: 'Binding', cls: 'badge-success' },
  declined: { label: 'Declined', cls: 'badge-brand' },
  withdrawn: { label: 'Withdrawn', cls: 'badge-brand' },
};

export default function AgreementModal({ conversationId, onClose, onChanged }: Props) {
  const [ctx, setCtx] = useState<AgreementContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'view' | 'propose'>('view');

  // propose form
  const [title, setTitle] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [terms, setTerms] = useState('');
  const [proposeName, setProposeName] = useState('');
  const [proposeAgree, setProposeAgree] = useState(false);
  const [rejectOthers, setRejectOthers] = useState(false);
  const [rejectMessage, setRejectMessage] = useState(DEFAULT_REJECTION);

  // sign form
  const [signName, setSignName] = useState('');
  const [signAgree, setSignAgree] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // standalone reject (after signed)
  const [standaloneReject, setStandaloneReject] = useState(false);
  const [standaloneRejectMsg, setStandaloneRejectMsg] = useState(DEFAULT_REJECTION);
  const [rejectDone, setRejectDone] = useState<number | null>(null);

  function applyDefaults(data: AgreementContext) {
    setTitle(data.defaults.title);
    setMonthlyRent(data.defaults.monthlyRent ? String(data.defaults.monthlyRent) : '');
    setDeposit(data.defaults.deposit != null ? String(data.defaults.deposit) : '');
    setStartDate(data.defaults.startDate);
    setEndDate(data.defaults.endDate ?? '');
  }

  async function load(initial = false) {
    const res = await fetch(`/api/conversations/${conversationId}/agreement`);
    if (!res.ok) {
      setError('Could not load the agreement.');
      setLoading(false);
      return;
    }
    const data = (await res.json()) as AgreementContext;
    setCtx(data);
    if (initial) {
      applyDefaults(data);
      setMode(!data.agreement && data.canPropose ? 'propose' : 'view');
    }
    setLoading(false);
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function submitPropose() {
    setError('');
    const rentNum = Number(monthlyRent);
    if (!title.trim()) return setError('Add a short title for the agreement.');
    if (!monthlyRent || Number.isNaN(rentNum) || rentNum < 0) return setError('Enter a valid monthly rent.');
    if (!startDate) return setError('Pick a start date.');
    if (proposeName.trim().length < 2) return setError('Type your full name to sign.');
    if (!proposeAgree) return setError('Please confirm you intend this agreement to be binding.');

    setSubmitting(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          monthlyRent: rentNum,
          deposit: deposit ? Number(deposit) : null,
          startDate,
          endDate: endDate || null,
          terms: terms.trim() || undefined,
          signatureName: proposeName.trim(),
          rejectOthers,
          rejectMessage: rejectOthers ? rejectMessage.trim() || undefined : undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      trackEvent('Agreement Proposed');
      setMode('view');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not propose the agreement.');
    } finally {
      setSubmitting(false);
    }
  }

  async function act(body: Record<string, unknown>, event: string) {
    if (!ctx?.agreement) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/agreements/${ctx.agreement.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      trackEvent(event);
      setDeclining(false);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  }

  function submitSign() {
    if (signName.trim().length < 2) return setError('Type your full name to sign.');
    if (!signAgree) return setError('Please confirm you agree to the terms.');
    void act({ action: 'sign', signatureName: signName.trim() }, 'Agreement Signed');
  }

  async function sendStandaloneRejection() {
    if (!ctx?.conversation.listingId) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/listings/${ctx.conversation.listingId}/reject-others`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exceptConversationId: conversationId,
          message: standaloneRejectMsg.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { count: number };
      trackEvent('Agreement Reject Others', { count: data.count });
      setRejectDone(data.count);
      setStandaloneReject(false);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send declines.');
    } finally {
      setSubmitting(false);
    }
  }

  const agreement = ctx?.agreement ?? null;
  const showProposeForm = mode === 'propose' && ctx?.canPropose;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-[var(--color-ink)]/40 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-labelledby="agreement-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-float)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="agreement-title" className="font-display text-lg font-bold text-[var(--color-ink)]">
                Rental agreement
              </h2>
              <span className="badge badge-accent">Beta</span>
            </div>
            {ctx && (
              <p className="mt-0.5 truncate text-sm text-[var(--color-ink-muted)]">
                with {ctx.conversation.otherUserName}
                {ctx.conversation.listingTitle ? ` · ${ctx.conversation.listingTitle}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L10.94 12l-5.72 5.72a.75.75 0 1 0 1.06 1.06L12 13.06l5.72 5.72a.75.75 0 1 0 1.06-1.06L13.06 12l5.72-5.72a.75.75 0 0 0-1.06-1.06L12 10.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>}

          {!loading && error && !ctx && <p className="text-sm text-red-600">{error}</p>}

          {!loading && ctx && (
            <div className="space-y-5">
              {/* ── Propose form ───────────────────────────── */}
              {showProposeForm ? (
                <>
                  {agreement && (agreement.status === 'declined' || agreement.status === 'withdrawn') && (
                    <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3 text-xs text-[var(--color-ink-muted)]">
                      The previous agreement was {agreement.status}. You can propose a fresh one below.
                    </p>
                  )}

                  <div>
                    <label className="field-label">Title</label>
                    <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Monthly rent</label>
                      <div className="field-currency">
                        <input
                          type="number"
                          className="field-input field-currency__input"
                          value={monthlyRent}
                          onChange={(e) => setMonthlyRent(e.target.value)}
                        />
                        <span className="field-currency__suffix">€</span>
                      </div>
                    </div>
                    <div>
                      <label className="field-label">Deposit</label>
                      <div className="field-currency">
                        <input
                          type="number"
                          className="field-input field-currency__input"
                          value={deposit}
                          onChange={(e) => setDeposit(e.target.value)}
                          placeholder="Optional"
                        />
                        <span className="field-currency__suffix">€</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Start date</label>
                      <input
                        type="date"
                        className="field-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="field-label">End date</label>
                      <input
                        type="date"
                        className="field-input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="field-label">Additional terms</label>
                    <textarea
                      className="field-input min-h-[88px] resize-y"
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      placeholder="House rules, who pays utilities, notice period, anything you both agreed on…"
                    />
                  </div>

                  <div className="rounded-xl border border-[var(--color-brand-light)] bg-[var(--color-brand-muted)] px-4 py-3">
                    <label className="field-label">Your signature</label>
                    <input
                      className="field-input"
                      value={proposeName}
                      onChange={(e) => setProposeName(e.target.value)}
                      placeholder="Type your full legal name"
                    />
                    <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-[var(--color-ink-muted)]">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 accent-[var(--color-brand)]"
                        checked={proposeAgree}
                        onChange={(e) => setProposeAgree(e.target.checked)}
                      />
                      <span>
                        I confirm these terms are correct and I intend this agreement to be binding once{' '}
                        {ctx.conversation.otherUserName} also signs.
                      </span>
                    </label>
                  </div>

                  {ctx.conversation.viewerIsLandlord && ctx.rejectableCount > 0 && (
                    <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
                      <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--color-ink)]">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 accent-[var(--color-brand)]"
                          checked={rejectOthers}
                          onChange={(e) => setRejectOthers(e.target.checked)}
                        />
                        <span>
                          Send a polite decline to the other{' '}
                          <strong>{ctx.rejectableCount}</strong>{' '}
                          {ctx.rejectableCount === 1 ? 'person' : 'people'} who messaged about this listing.
                        </span>
                      </label>
                      {rejectOthers && (
                        <textarea
                          className="field-input mt-3 min-h-[80px] resize-y text-sm"
                          value={rejectMessage}
                          onChange={(e) => setRejectMessage(e.target.value)}
                        />
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* ── View existing agreement ─────────────────── */
                agreement && (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-base font-bold text-[var(--color-ink)]">
                        {agreement.title}
                      </h3>
                      <span className={`badge ${STATUS_BADGE[agreement.status].cls}`}>
                        {STATUS_BADGE[agreement.status].label}
                      </span>
                    </div>

                    <dl className="grid grid-cols-2 gap-3">
                      <div className="detail-cell">
                        <dt>Monthly rent</dt>
                        <dd>{euro(agreement.monthlyRent)}</dd>
                      </div>
                      <div className="detail-cell">
                        <dt>Deposit</dt>
                        <dd>{agreement.deposit != null ? euro(agreement.deposit) : '—'}</dd>
                      </div>
                      <div className="detail-cell">
                        <dt>Start</dt>
                        <dd>{longDate(agreement.startDate)}</dd>
                      </div>
                      <div className="detail-cell">
                        <dt>End</dt>
                        <dd>{agreement.endDate ? longDate(agreement.endDate) : 'Open-ended'}</dd>
                      </div>
                    </dl>

                    {agreement.terms && (
                      <div>
                        <p className="field-label">Additional terms</p>
                        <p className="whitespace-pre-wrap rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3 text-sm text-[var(--color-ink)]">
                          {agreement.terms}
                        </p>
                      </div>
                    )}

                    {/* signatures */}
                    <div className="space-y-2">
                      <p className="field-label">Signatures</p>
                      <Signature name={agreement.proposerSignatureName} at={agreement.proposerSignedAt} />
                      {agreement.counterpartySignatureName && agreement.counterpartySignedAt ? (
                        <Signature
                          name={agreement.counterpartySignatureName}
                          at={agreement.counterpartySignedAt}
                        />
                      ) : agreement.status === 'proposed' ? (
                        <PendingSlot label={`${ctx.conversation.otherUserName} hasn't signed yet`} />
                      ) : null}
                    </div>

                    {agreement.status === 'signed' && (
                      <div className="form-banner form-banner--brand rounded-xl">
                        <p className="form-banner__title">This agreement is binding ✍️</p>
                        <p className="form-banner__body">Both parties have signed. You can revisit it here anytime.</p>
                      </div>
                    )}

                    {agreement.status === 'proposed' && agreement.viewerIsProposer && (
                      <p className="text-sm text-[var(--color-ink-muted)]">
                        Waiting for {ctx.conversation.otherUserName} to review and sign.
                      </p>
                    )}

                    {agreement.status === 'declined' && (
                      <div className="form-banner form-banner--error rounded-xl">
                        <p className="form-banner__title">Agreement declined</p>
                        {agreement.declineReason && (
                          <p className="form-banner__body">“{agreement.declineReason}”</p>
                        )}
                      </div>
                    )}

                    {/* counterparty signing UI */}
                    {agreement.status === 'proposed' && !agreement.viewerIsProposer && !declining && (
                      <div className="rounded-xl border border-[var(--color-brand-light)] bg-[var(--color-brand-muted)] px-4 py-3">
                        <label className="field-label">Sign to make it binding</label>
                        <input
                          className="field-input"
                          value={signName}
                          onChange={(e) => setSignName(e.target.value)}
                          placeholder="Type your full legal name"
                        />
                        <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-[var(--color-ink-muted)]">
                          <input
                            type="checkbox"
                            className="mt-0.5 size-4 accent-[var(--color-brand)]"
                            checked={signAgree}
                            onChange={(e) => setSignAgree(e.target.checked)}
                          />
                          <span>I have read the terms above and agree to be bound by them.</span>
                        </label>
                      </div>
                    )}

                    {agreement.status === 'proposed' && !agreement.viewerIsProposer && declining && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <label className="field-label">Decline this agreement</label>
                        <textarea
                          className="field-input min-h-[72px] resize-y"
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          placeholder="Optional: let them know why"
                        />
                      </div>
                    )}

                    {/* landlord: decline others after binding */}
                    {agreement.status === 'signed' &&
                      ctx.conversation.viewerIsLandlord &&
                      ctx.rejectableCount > 0 && (
                        <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
                          {!standaloneReject ? (
                            <button
                              type="button"
                              className="btn-ghost w-full text-sm"
                              onClick={() => setStandaloneReject(true)}
                            >
                              Decline the other {ctx.rejectableCount}{' '}
                              {ctx.rejectableCount === 1 ? 'applicant' : 'applicants'}
                            </button>
                          ) : (
                            <>
                              <label className="field-label">Message to the other applicants</label>
                              <textarea
                                className="field-input min-h-[80px] resize-y text-sm"
                                value={standaloneRejectMsg}
                                onChange={(e) => setStandaloneRejectMsg(e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn-brand mt-3 w-full text-sm"
                                disabled={submitting}
                                onClick={sendStandaloneRejection}
                              >
                                {submitting ? 'Sending…' : `Send to ${ctx.rejectableCount}`}
                              </button>
                            </>
                          )}
                        </div>
                      )}

                    {rejectDone != null && (
                      <p className="text-sm text-[var(--color-success)]">
                        Sent a decline to {rejectDone} {rejectDone === 1 ? 'person' : 'people'}.
                      </p>
                    )}

                    {(agreement.status === 'declined' || agreement.status === 'withdrawn') &&
                      ctx.canPropose && (
                        <button
                          type="button"
                          className="btn-ghost w-full text-sm"
                          onClick={() => setMode('propose')}
                        >
                          Propose a new agreement
                        </button>
                      )}
                  </>
                )
              )}

              {error && ctx && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <p className="text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
                Beta feature. This records what you both agreed in good faith — it is not legal advice
                and may not replace a formal Mietvertrag.
              </p>
            </div>
          )}
        </div>

        {/* footer actions */}
        {!loading && ctx && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] px-6 py-4">
            {showProposeForm ? (
              <>
                <button type="button" onClick={onClose} disabled={submitting} className="btn-ghost">
                  Cancel
                </button>
                <button type="button" onClick={submitPropose} disabled={submitting} className="btn-brand">
                  {submitting ? 'Sending…' : 'Propose & sign'}
                </button>
              </>
            ) : agreement && agreement.status === 'proposed' && agreement.viewerIsProposer ? (
              <>
                <button type="button" onClick={onClose} disabled={submitting} className="btn-ghost">
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => void act({ action: 'withdraw' }, 'Agreement Withdrawn')}
                  disabled={submitting}
                  className="rounded-xl border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {submitting ? 'Working…' : 'Withdraw'}
                </button>
              </>
            ) : agreement && agreement.status === 'proposed' && !agreement.viewerIsProposer ? (
              declining ? (
                <>
                  <button
                    type="button"
                    onClick={() => setDeclining(false)}
                    disabled={submitting}
                    className="btn-ghost"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void act({ action: 'decline', reason: declineReason || undefined }, 'Agreement Declined')
                    }
                    disabled={submitting}
                    className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {submitting ? 'Working…' : 'Confirm decline'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setDeclining(true)}
                    disabled={submitting}
                    className="rounded-xl border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button type="button" onClick={submitSign} disabled={submitting} className="btn-brand">
                    {submitting ? 'Signing…' : 'Sign agreement'}
                  </button>
                </>
              )
            ) : (
              <button type="button" onClick={onClose} className="btn-ghost">
                Close
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
