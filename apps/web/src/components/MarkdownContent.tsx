import ReactMarkdown from 'react-markdown';

interface Props {
  markdown: string;
  className?: string;
}

export default function MarkdownContent({ markdown, className = '' }: Props) {
  return (
    <div className={`markdown-document ${className}`.trim()}>
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
