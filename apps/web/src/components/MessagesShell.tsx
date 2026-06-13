import ConversationList from './ConversationList';
import MessageThread from './MessageThread';

interface Props {
  conversationId?: string;
}

export default function MessagesShell({ conversationId }: Props) {
  return (
    <div className="chat-app">
      <aside className={`chat-sidebar ${conversationId ? 'hidden lg:flex' : 'flex'}`}>
        <header className="chat-sidebar__header">
          <h1 className="chat-sidebar__title">Chats</h1>
          <a
            href="/dashboard"
            className="text-xs font-semibold text-[#54656f] hover:text-[var(--color-brand-deep)]"
            title="Back to dashboard"
          >
            Dashboard
          </a>
        </header>
        <ConversationList selectedId={conversationId} />
      </aside>

      <main className={`chat-main ${conversationId ? 'flex' : 'hidden lg:flex'}`}>
        {conversationId ? (
          <MessageThread conversationId={conversationId} embedded showMobileBack />
        ) : (
          <div className="chat-empty">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="chat-empty__icon text-[#54656f]">
              <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97Z" clipRule="evenodd" />
            </svg>
            <p className="font-display text-xl font-bold text-[#41525d]">renting.berlin Messages</p>
            <p className="mt-2 max-w-sm text-sm text-[#667781]">
              Select a chat on the left to view your conversation. Send and receive messages about listings and seeker profiles.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
