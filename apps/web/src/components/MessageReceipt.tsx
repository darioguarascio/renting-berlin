export type MessageReceiptStatus = 'sent' | 'read';

interface Props {
  status: MessageReceiptStatus;
  className?: string;
}

/** WhatsApp-style ticks: 1 gray = sent/delivered, 2 blue = read by recipient. */
export default function MessageReceipt({ status, className = '' }: Props) {
  const isRead = status === 'read';
  const stroke = isRead ? 'currentColor' : 'currentColor';
  const colorClass = isRead ? 'text-[#53bdeb]' : 'opacity-70';

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
          stroke={stroke}
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
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 5.5 9.5 8.5 15 1.5"
        stroke={stroke}
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
