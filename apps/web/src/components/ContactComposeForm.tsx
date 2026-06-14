import { useState } from 'react';
import type { MessageTemplateKind } from '../types/message-template';
import { trackEvent } from '../lib/rybbit';
import MessageComposer, { type ComposerPayload } from './MessageComposer';

export interface ContactTarget {
  listingId?: string;
  tenantRequestId?: string;
  recipientName: string;
  contextTitle: string;
  contextSubtitle?: string;
  contextHref: string;
  contextImage?: string | null;
  backHref: string;
}

interface Props {
  target: ContactTarget;
  templateKind: MessageTemplateKind;
  submitLabel: string;
}

export default function ContactComposeForm({ target, templateKind, submitLabel }: Props) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(payload: ComposerPayload) {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: target.listingId,
          tenantRequestId: target.tenantRequestId,
          body: payload.body,
          attachments: payload.attachments,
          saveAsTemplate: payload.saveAsTemplate,
          templateLabel: payload.saveAsTemplate ? payload.templateLabel : undefined,
          templateKind,
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        setError(message || 'Could not send message');
        return;
      }

      const data = (await res.json()) as { id: string };
      trackEvent('Conversation Started', {
        context: target.listingId ? 'listing' : 'seeker',
      });
      window.location.href = `/messages/${data.id}`;
    } catch {
      setError('Could not send message');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-[var(--color-border)] p-6 sm:p-8">
        <a href={target.backHref} className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
          ← Back
        </a>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-[var(--color-ink)]">{submitLabel}</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Your first message goes directly to {target.recipientName}.
        </p>
      </div>

      <div className="flex items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-paper)] p-6 sm:p-8">
        {target.contextImage ? (
          <img src={target.contextImage} alt="" className="size-14 rounded-xl object-cover" />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-lg font-bold text-[var(--color-accent)]">
            {target.recipientName[0]}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-[var(--color-ink)]">{target.recipientName}</p>
          <a href={target.contextHref} className="mt-0.5 block truncate text-sm text-[var(--color-accent)] hover:underline">
            {target.contextTitle}
          </a>
          {target.contextSubtitle && (
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{target.contextSubtitle}</p>
          )}
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <MessageComposer
          templateKind={templateKind}
          onSend={handleSend}
          sending={sending}
          placeholder="Introduce yourself and explain what you are looking for…"
          variant="chat"
        />

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
