import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../common/ConfidenceBadge';
import { Bot, User, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import type { Components } from 'react-markdown';

export interface MessageProps {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  isError?: boolean;
}

/* ─── Custom renderers for react-markdown ─── */
const markdownComponents: Components = {
  /* ── Tables ── */
  table: ({ children, ...props }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-[var(--color-border)] shadow-sm">
      <table
        className="w-full border-collapse text-[12.5px] leading-snug"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-gradient-to-r from-slate-100 to-gray-50 border-b border-[var(--color-border-strong)]" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody className="divide-y divide-[var(--color-border)]" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr className="transition-colors hover:bg-blue-50/40" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th
      className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] whitespace-nowrap"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      className="px-3 py-2 text-[var(--color-text-primary)] align-top"
      {...props}
    >
      {children}
    </td>
  ),

  /* ── Headings ── */
  h1: ({ children, ...props }) => (
    <h3 className="text-[15px] font-bold text-[var(--color-text-primary)] mt-4 mb-2 pb-1.5 border-b border-[var(--color-border)]" {...props}>
      {children}
    </h3>
  ),
  h2: ({ children, ...props }) => (
    <h4 className="text-[14px] font-semibold text-[var(--color-text-primary)] mt-3 mb-1.5 flex items-center gap-1.5" {...props}>
      <span className="w-1 h-4 bg-[var(--color-tier1)] rounded-full inline-block shrink-0" />
      {children}
    </h4>
  ),
  h3: ({ children, ...props }) => (
    <h5 className="text-[13px] font-semibold text-[var(--color-text-secondary)] mt-2.5 mb-1" {...props}>
      {children}
    </h5>
  ),

  /* ── Paragraphs ── */
  p: ({ children, ...props }) => (
    <p className="mb-2 last:mb-0 text-[13px] leading-[1.65] text-[var(--color-text-primary)]" {...props}>
      {children}
    </p>
  ),

  /* ── Lists ── */
  ul: ({ children, ...props }) => (
    <ul className="mb-2 last:mb-0 pl-4 space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-2 last:mb-0 pl-4 space-y-1 list-decimal" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="text-[13px] leading-[1.6] text-[var(--color-text-primary)] marker:text-[var(--color-tier1)]" {...props}>
      {children}
    </li>
  ),

  /* ── Inline code ── */
  code: ({ children, className, ...props }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <div className="my-2 rounded-md bg-slate-900 text-slate-100 overflow-x-auto">
          <pre className="p-3 text-[12px] leading-relaxed">
            <code className={className} {...props}>{children}</code>
          </pre>
        </div>
      );
    }
    return (
      <code
        className="px-1.5 py-0.5 rounded text-[12px] bg-[var(--color-tier1-bg)] text-[var(--color-tier1)] font-medium border border-[var(--color-tier1)]/10"
        {...props}
      >
        {children}
      </code>
    );
  },

  /* ── Pre blocks (wrapper) ── */
  pre: ({ children, ...props }) => (
    <>{children}</>
  ),

  /* ── Strong / Em ── */
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-[var(--color-text-primary)]" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-[var(--color-text-secondary)]" {...props}>
      {children}
    </em>
  ),

  /* ── Blockquote ── */
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-2 border-l-[3px] border-[var(--color-tier1)] bg-[var(--color-tier1-bg)]/50 pl-3 py-2 rounded-r-md text-[13px] text-[var(--color-text-secondary)]"
      {...props}
    >
      {children}
    </blockquote>
  ),

  /* ── Horizontal rule ── */
  hr: ({ ...props }) => (
    <hr className="my-3 border-none h-px bg-[var(--color-border)]" {...props} />
  ),

  /* ── Links ── */
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--color-tier1)] underline underline-offset-2 decoration-[var(--color-tier1)]/30 hover:decoration-[var(--color-tier1)] transition-colors"
      {...props}
    >
      {children}
    </a>
  ),
};

export const ChatMessage: React.FC<{ message: MessageProps }> = ({ message }) => {
  const isAgent = message.sender === 'agent';

  return (
    <div className={cn("flex gap-3 mb-5", isAgent ? "flex-row" : "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm",
          isAgent
            ? "bg-gradient-to-br from-slate-100 to-gray-200 text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]"
            : "bg-[var(--color-tier1)] text-white"
        )}
      >
        {isAgent ? <Bot size={15} /> : <User size={15} />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[88%] rounded-xl text-sm leading-relaxed overflow-hidden",
          isAgent
            ? message.isError
              ? "bg-red-50 text-red-700 border border-red-200 p-3.5"
              : "bg-white border border-[var(--color-border)] shadow-sm p-4"
            : "bg-[var(--color-tier1)] text-white px-4 py-2.5 shadow-sm"
        )}
      >
        {isAgent && !message.isError ? (
          <div className="chat-markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        ) : (
          <span className="text-[13.5px]">{message.text}</span>
        )}
      </div>
    </div>
  );
};
