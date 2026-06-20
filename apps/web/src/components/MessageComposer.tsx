import { useEffect, useRef, useState } from 'react';
import type { MessageAttachment } from '../types/message';
import type { MessageTemplate, MessageTemplateKind } from '../types/message-template';
import { defaultTemplateLabel } from '../types/message-template';

export interface ComposerPayload {
  body: string;
  attachments: MessageAttachment[];
  saveAsTemplate: boolean;
  templateLabel: string;
}

interface Props {
  templateKind: MessageTemplateKind;
  onSend: (payload: ComposerPayload) => void | Promise<void>;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  variant?: 'default' | 'chat';
}

const MAX_ATTACHMENTS = 5;

const MAX_TEXTAREA_HEIGHT = 144;

function resizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  const next = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT);
  el.style.height = `${next}px`;
  // Only show the scrollbar once the content actually overflows the cap.
  el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
}

function AttachIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <path fillRule="evenodd" d="M12.971 3.971a3.75 3.75 0 0 0-5.303 0L4.697 6.94a.75.75 0 1 0 1.06 1.06l3.071-3.07a2.25 2.25 0 1 1 3.182 3.182l-3.07 3.07a3.75 3.75 0 0 0 5.304 5.304l3.071-3.07a.75.75 0 1 0-1.061-1.06l-3.07 3.07a2.25 2.25 0 0 1-3.182-3.182l3.07-3.07a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 0 1 3.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875Zm9 3.75V9a1.5 1.5 0 0 0 1.5 1.5h1.875a.375.375 0 0 1 .375.375V18.375a.375.375 0 0 1-.375.375H5.625a.375.375 0 0 1-.375-.375V3.375a.375.375 0 0 1 .375-.375h9Z" clipRule="evenodd" />
      <path d="M14.25 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 16.5 7.5h-1.875a.375.375 0 0 1-.375-.375V5.25Z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
    </svg>
  );
}

export default function MessageComposer({
  templateKind,
  onSend,
  sending = false,
  disabled = false,
  placeholder = 'Type a message',
  variant = 'chat',
}: Props) {
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateLabel, setTemplateLabel] = useState('');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/message-templates?kind=${templateKind}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: { items: MessageTemplate[] }) => setTemplates(data.items))
      .catch(() => setTemplates([]));
  }, [templateKind]);

  useEffect(() => {
    if (saveAsTemplate && !templateLabel.trim() && body.trim()) {
      setTemplateLabel(defaultTemplateLabel(body));
    }
  }, [saveAsTemplate, body, templateLabel]);

  useEffect(() => {
    if (textareaRef.current) resizeTextarea(textareaRef.current);
  }, [body]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function applyTemplate(template: MessageTemplate) {
    setBody(template.body);
    setMenuOpen(false);
    textareaRef.current?.focus();
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setUploadError(`Maximum ${MAX_ATTACHMENTS} attachments per message`);
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      Array.from(files).forEach((file) => fd.append('files', file));
      fd.append('context', 'message');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data: { urls: string[] } = await res.json();
      const uploaded = data.urls.map((url, i) => ({
        url,
        name: files[i]?.name ?? 'Attachment',
        mimeType: files[i]?.type ?? 'application/octet-stream',
      }));
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const canSend = (body.trim().length > 0 || attachments.length > 0) && !sending && !uploading && !disabled;

  async function handleSend() {
    if (!canSend) return;
    await onSend({ body, attachments, saveAsTemplate, templateLabel });
    setBody('');
    setAttachments([]);
    setSaveAsTemplate(false);
    setTemplateLabel('');
    setMenuOpen(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.overflowY = 'hidden';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSend();
    }
  }

  if (variant === 'default') {
    return (
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          rows={3}
          placeholder={placeholder}
          className="field-input min-h-[5rem] resize-y"
        />
        <button type="button" onClick={() => void handleSend()} disabled={!canSend} className="btn-brand">
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    );
  }

  return (
    <div className="chat-compose">
      {attachments.length > 0 && (
        <div className="chat-compose__attachments">
          {attachments.map((file) => (
            <span key={file.url} className="chat-compose__attachment-chip">
              <span className="truncate max-w-[10rem]">{file.name}</span>
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((a) => a.url !== file.url))}
                disabled={sending}
                className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {uploadError && <p className="px-1 pb-1 text-xs text-red-600">{uploadError}</p>}

      <div className="chat-compose__bar">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending || uploading || attachments.length >= MAX_ATTACHMENTS}
          className="chat-compose__icon-btn"
          aria-label="Attach file"
        >
          <AttachIcon />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => void uploadFiles(e.target.files)}
        />

        {templates.length > 0 && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={disabled || sending}
              className="chat-compose__icon-btn"
              aria-label="Insert template"
            >
              <TemplateIcon />
            </button>
            {menuOpen && (
              <div className="chat-compose__menu">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="chat-compose__menu-item"
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="chat-compose__input-wrap">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            rows={1}
            placeholder={placeholder}
            className="chat-compose__input"
          />
        </div>

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!canSend}
          className="chat-compose__send"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>

      <div className="chat-compose__extras">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--color-ink-muted)]">
          <input
            type="checkbox"
            checked={saveAsTemplate}
            onChange={(e) => setSaveAsTemplate(e.target.checked)}
            disabled={disabled || sending || !body.trim()}
            className="size-3.5"
          />
          Save as template
        </label>
        {saveAsTemplate && (
          <input
            type="text"
            value={templateLabel}
            onChange={(e) => setTemplateLabel(e.target.value)}
            disabled={disabled || sending}
            placeholder="Template name"
            className="max-w-[10rem] rounded-lg border-none bg-white px-2.5 py-1 text-xs shadow-sm outline-none"
          />
        )}
        <span className="chat-compose__hint ml-auto text-[10px] text-[var(--color-ink-muted)]">Ctrl+Enter to send</span>
      </div>
    </div>
  );
}
