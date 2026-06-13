export type MessageReceiptStatus = 'sent' | 'read';

interface Props {
  status: MessageReceiptStatus;
  className?: string;
}

/** Read receipts: single tick = sent, double tick = read. */
export default function MessageReceipt({ status, className = '' }: Props) {
  const isRead = status === 'read';
  const colorClass = isRead ? 'text-[var(--color-brand)]' : 'text-[var(--color-ink-muted)] opacity-70';

  if (!isRead) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 11"
        fill="none"
        className={`inline-block size-4 shrink-0 ${colorClass} ${className}`}
        aria-label="Sent"
      >
        <path
          d="M1 5.5 4.5 9 11 1.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 11"
      fill="none"
      className={`inline-block size-4 shrink-0 ${colorClass} ${className}`}
      aria-label="Read"
    >
      <path
        d="M1 5.5 4 8.5 9.5 1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 5.5 9.5 8.5 15 1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function receiptStatusFromReadAt(readAt: string | null | undefined): MessageReceiptStatus {
  return readAt ? 'read' : 'sent';
}
