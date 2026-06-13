import { useEffect, useState } from 'react';
import type { ConversationSummary } from '../types/listing';

interface Props {
  selectedId?: string;
}

export default function ConversationList({ selectedId }: Props) {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/conversations');
    if (res.ok) {
      const data: { items: ConversationSummary[] } = await res.json();
      setItems(data.items);
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-[#667781]">Loading…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-[#667781]">No chats yet.</p>
        <a href="/offers" className="mt-3 text-sm font-medium text-[var(--color-brand)] hover:underline">
          Browse listings
        </a>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {items.map((conv) => {
        const active = conv.id === selectedId;
        return (
          <div
            key={conv.id}
            role="link"
            tabIndex={0}
            className={`chat-row ${active ? 'chat-row--active' : ''}`}
            onClick={() => {
              window.location.href = `/messages/${conv.id}`;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                window.location.href = `/messages/${conv.id}`;
              }
            }}
          >
            {conv.otherUserImage ? (
              <img src={conv.otherUserImage} alt="" className="chat-row__avatar" />
            ) : (
              <span className="chat-row__avatar-fallback">{conv.otherUserName[0]}</span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[1.0625rem] font-normal text-[#111b21]">{conv.otherUserName}</p>
                <time className="shrink-0 text-xs text-[#667781]">{formatListTime(conv.lastMessageAt)}</time>
              </div>
              <p className="truncate text-sm text-[#667781]">
                {conv.lastMessage ?? 'No messages yet'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatListTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const isThisYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString([], isThisYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}
