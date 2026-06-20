import { useEffect, useRef, useState } from 'react';
import AgreementModal from './AgreementModal';
import ConversationContextLink from './ConversationContextLink';
import MessageComposer, { type ComposerPayload } from './MessageComposer';
import MessageContent from './MessageContent';
import MessageReceipt, { receiptStatusFromReadAt } from './MessageReceipt';
import { trackEvent } from '../lib/rybbit';
import { otherUserProfileSubtitle } from '../lib/user-profile-display';
import type { ConversationOtherUser } from '../types/listing';
import type { MessageAttachment, MessageMetadata } from '../types/message';

interface Message {
  id: string;
  body: string;
  attachments?: MessageAttachment[];
  metadata?: MessageMetadata | null;
  senderId: string;
  isMine: boolean;
  createdAt: string;
  readAt?: string | null;
}

const AGREEMENT_CARD: Record<
  MessageMetadata['event'],
  { icon: string; title: string }
> = {
  proposed: { icon: '📄', title: 'Rental agreement' },
  signed: { icon: '✅', title: 'Agreement signed' },
  declined: { icon: '❌', title: 'Agreement declined' },
  withdrawn: { icon: '↩️', title: 'Agreement withdrawn' },
};

interface ThreadData {
  id: string;
  contextKind: 'listing' | 'seeker';
  listing: { id: string; title: string; slug: string; photoUrl: string | null } | null;
  seekerProfile: { id: string; title: string; href: string } | null;
  otherUser: ConversationOtherUser | null;
  messages: Message[];
}

interface Props {
  conversationId: string;
  embedded?: boolean;
  showMobileBack?: boolean;
  onBack?: () => void;
}

function withGrouping(messages: Message[]) {
  return messages.map((msg, index) => {
    const prev = messages[index - 1];
    const isGrouped = !!prev && prev.isMine === msg.isMine;
    return { ...msg, isGrouped };
  });
}

interface AgreementSummary {
  agreement: {
    status: 'proposed' | 'signed' | 'declined' | 'withdrawn';
    title: string;
    viewerIsProposer: boolean;
  } | null;
  conversation: { otherUserName: string };
}

export default function MessageThread({ conversationId, embedded = false, showMobileBack = false, onBack }: Props) {
  const [data, setData] = useState<ThreadData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementSummary, setAgreementSummary] = useState<AgreementSummary | null>(null);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);
  const isNearBottom = useRef(true);
  const lastSignature = useRef('');

  const templateKind =
    data?.contextKind === 'seeker' ? 'outreach' : data?.contextKind === 'listing' ? 'inquiry' : 'general';

  function scrollToBottom(behavior: ScrollBehavior) {
    bottomRef.current?.scrollIntoView({ behavior });
    isNearBottom.current = true;
    setShowNewMessages(false);
  }

  function handleScroll() {
    const el = messagesRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    isNearBottom.current = nearBottom;
    if (nearBottom) setShowNewMessages(false);
  }

  async function load() {
    const res = await fetch(`/api/conversations/${conversationId}`);
    if (!res.ok) {
      setLoadError(true);
      return;
    }
    const json = (await res.json()) as ThreadData;
    setLoadError(false);
    // Skip the state update when nothing changed (id + read state) to avoid
    // a re-render on every 5s poll.
    const signature = json.messages.map((m) => `${m.id}:${m.readAt ?? ''}`).join('|');
    if (signature === lastSignature.current) return;
    lastSignature.current = signature;
    setData(json);
  }

  async function loadAgreement() {
    const res = await fetch(`/api/conversations/${conversationId}/agreement`);
    if (res.ok) setAgreementSummary(await res.json());
  }

  useEffect(() => {
    setData(null);
    setLoadError(false);
    setShowNewMessages(false);
    didInitialScroll.current = false;
    isNearBottom.current = true;
    lastSignature.current = '';
    load();
    loadAgreement();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    if (!data) return;
    // Jump straight to the latest message when a conversation first opens.
    if (!didInitialScroll.current) {
      scrollToBottom('auto');
      didInitialScroll.current = true;
      return;
    }
    // Afterwards, only follow new messages if the reader is already at the
    // bottom (or sent the message themselves); otherwise surface a pill.
    const last = data.messages[data.messages.length - 1];
    if (isNearBottom.current || last?.isMine) {
      scrollToBottom('smooth');
    } else {
      setShowNewMessages(true);
    }
  }, [data?.messages.length]);

  async function send(payload: ComposerPayload) {
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: payload.body,
          attachments: payload.attachments,
          saveAsTemplate: payload.saveAsTemplate,
          templateLabel: payload.saveAsTemplate ? payload.templateLabel : undefined,
        }),
      });
      if (res.ok) {
        const sent = (await res.json()) as Message;
        trackEvent('Message Sent', { context: templateKind });
        setData((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, { ...sent, isMine: true, readAt: null, attachments: sent.attachments ?? [] }],
              }
            : prev,
        );
      }
    } finally {
      setSending(false);
    }
  }

  async function deleteChat() {
    if (deleting) return;
    const confirmed = window.confirm(
      'Delete this conversation? All messages will be removed and cannot be recovered.',
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        if (onBack) {
          onBack();
        } else {
          window.location.href = '/messages';
        }
      }
    } finally {
      setDeleting(false);
    }
  }

  if (loadError) {
    return (
      <div className={`flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center ${embedded ? '' : 'py-16'}`}>
        {showMobileBack && onBack && (
          <button type="button" className="chat-compose__icon-btn self-start lg:hidden" aria-label="Back to chats" onClick={onBack}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <p className="text-sm text-[var(--color-ink-muted)]">Couldn&apos;t load this conversation.</p>
        <button type="button" className="btn-ghost text-sm" onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`flex flex-1 items-center justify-center ${embedded ? '' : 'py-16'}`}>
        <p className="text-[var(--color-ink-muted)]">Loading…</p>
      </div>
    );
  }

  const listingContext = data.listing
    ? { id: data.listing.id, title: data.listing.title, href: data.listing.slug, photoUrl: data.listing.photoUrl }
    : null;

  const groupedMessages = withGrouping(data.messages);
  const profileSubtitle =
    data.otherUser?.profileHref && data.otherUser.handle
      ? otherUserProfileSubtitle(data.otherUser)
      : null;

  const avatar = data.otherUser?.image ? (
    <img src={data.otherUser.image} alt="" className="chat-thread-header__avatar" />
  ) : (
    <span className="chat-thread-header__avatar-fallback">{data.otherUser?.name?.[0] ?? '?'}</span>
  );

  return (
    <div className={embedded ? 'flex h-full min-h-0 flex-col' : 'flex h-full flex-col'}>
      <header className="chat-thread-header">
        {showMobileBack && (
          onBack ? (
            <button type="button" className="chat-compose__icon-btn lg:hidden" aria-label="Back to chats" onClick={onBack}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <a href="/messages" className="chat-compose__icon-btn lg:hidden" aria-label="Back to chats">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z" clipRule="evenodd" />
              </svg>
            </a>
          )
        )}

        {data.otherUser?.profileHref ? (
          <a href={data.otherUser.profileHref} className="shrink-0" aria-label={`View ${data.otherUser.name}'s profile`}>
            {avatar}
          </a>
        ) : (
          avatar
        )}

        <div className="min-w-0 flex-1">
          {data.otherUser?.profileHref ? (
            <a
              href={data.otherUser.profileHref}
              className="truncate text-base font-medium text-[var(--color-ink)] hover:text-[var(--color-brand)] hover:underline"
            >
              {data.otherUser.name}
            </a>
          ) : (
            <p className="truncate text-base font-medium text-[var(--color-ink)]">{data.otherUser?.name}</p>
          )}
          {profileSubtitle && <p className="truncate text-xs text-[var(--color-ink-muted)]">{profileSubtitle}</p>}
        </div>

        <button
          type="button"
          className="chat-compose__icon-btn text-[var(--color-ink-muted)] hover:text-[var(--color-brand-deep)]"
          aria-label="Rental agreement"
          title="Rental agreement (beta)"
          onClick={() => setAgreementOpen(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </button>

        <button
          type="button"
          className="chat-compose__icon-btn text-[var(--color-ink-muted)] hover:text-red-600"
          aria-label="Delete conversation"
          title="Delete conversation"
          disabled={deleting}
          onClick={deleteChat}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </header>

      <ConversationContextLink listing={listingContext} seekerProfile={data.seekerProfile} variant="bar" />

      {agreementSummary?.agreement &&
        (agreementSummary.agreement.status === 'proposed' ||
          agreementSummary.agreement.status === 'signed') && (
          <button
            type="button"
            onClick={() => setAgreementOpen(true)}
            className="flex w-full items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-brand-muted)] px-4 py-2 text-left text-sm text-[var(--color-brand-deep)] hover:bg-[var(--color-brand-light)]"
          >
            <span aria-hidden>{agreementSummary.agreement.status === 'signed' ? '✅' : '📄'}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">
              {agreementSummary.agreement.status === 'signed'
                ? `Agreement signed: ${agreementSummary.agreement.title}`
                : agreementSummary.agreement.viewerIsProposer
                  ? `Agreement sent — waiting for ${agreementSummary.conversation.otherUserName} to sign`
                  : `${agreementSummary.conversation.otherUserName} proposed an agreement`}
            </span>
            <span className="shrink-0 text-xs font-bold underline">
              {agreementSummary.agreement.status === 'proposed' && !agreementSummary.agreement.viewerIsProposer
                ? 'Review & sign'
                : 'Open'}
            </span>
          </button>
        )}

      {agreementOpen && (
        <AgreementModal
          conversationId={conversationId}
          onClose={() => setAgreementOpen(false)}
          onChanged={() => {
            void load();
            void loadAgreement();
          }}
        />
      )}

      <div className="chat-thread-body">
        <div className="chat-thread-messages" ref={messagesRef} onScroll={handleScroll}>
        {groupedMessages.map((msg) => {
          if (msg.metadata?.type === 'agreement') {
            const card = AGREEMENT_CARD[msg.metadata.event];
            const canSign = msg.metadata.event === 'proposed' && !msg.isMine;
            return (
              <div key={msg.id} className="my-3 flex justify-center px-2">
                <div className="w-full max-w-sm rounded-2xl border border-[var(--color-brand-light)] bg-[var(--color-brand-muted)] p-4 text-center shadow-sm">
                  <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-white text-xl">
                    <span aria-hidden>{card.icon}</span>
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{card.title}</p>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{msg.body}</p>
                  <button
                    type="button"
                    className={`mt-3 w-full text-sm ${canSign ? 'btn-brand' : 'btn-ghost'}`}
                    onClick={() => setAgreementOpen(true)}
                  >
                    {canSign ? 'Review & sign' : 'View agreement'}
                  </button>
                  <time className="mt-2 block text-[10px] text-[var(--color-ink-muted)]">
                    {new Date(msg.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`chat-bubble-wrap ${msg.isMine ? 'chat-bubble-wrap--mine' : 'chat-bubble-wrap--theirs'} ${msg.isGrouped ? '' : 'chat-bubble-wrap--gap'}`}
            >
              <div
                className={`chat-bubble ${msg.isMine ? 'chat-bubble--out' : 'chat-bubble--in'} ${msg.isGrouped ? 'chat-bubble--grouped' : ''}`}
              >
                <MessageContent
                  body={msg.body}
                  attachments={msg.attachments ?? []}
                  isMine={msg.isMine}
                />
                <span className="chat-bubble__meta">
                  <time>{new Date(msg.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time>
                  {msg.isMine && <MessageReceipt status={receiptStatusFromReadAt(msg.readAt)} />}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
        </div>

        {showNewMessages && (
          <button
            type="button"
            className="chat-thread-jump"
            onClick={() => scrollToBottom('smooth')}
          >
            New messages
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v15.19l5.47-5.47a.75.75 0 1 1 1.06 1.06l-6.75 6.75a.75.75 0 0 1-1.06 0l-6.75-6.75a.75.75 0 1 1 1.06-1.06l5.47 5.47V3a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      <MessageComposer templateKind={templateKind} onSend={send} sending={sending} variant="chat" />
    </div>
  );
}
