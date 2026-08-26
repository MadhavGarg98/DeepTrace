import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../common/ConfidenceBadge';
import { Bot, User } from 'lucide-react';

export interface MessageProps {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  isError?: boolean;
}

export const ChatMessage: React.FC<{ message: MessageProps }> = ({ message }) => {
  const isAgent = message.sender === 'agent';
  
  return (
    <div className={cn("flex gap-3 mb-6", isAgent ? "flex-row" : "flex-row-reverse")}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
        isAgent ? "bg-gray-100 text-[var(--color-text-secondary)]" : "bg-[var(--color-tier1-bg)] text-[var(--color-tier1)]"
      )}>
        {isAgent ? <Bot size={16} /> : <User size={16} />}
      </div>
      <div className={cn(
        "max-w-[85%] rounded-[var(--radius-card)] p-3 text-sm leading-relaxed overflow-x-auto",
        isAgent 
          ? (message.isError ? "bg-red-50 text-red-700 border border-red-200" : "bg-gray-50 border border-[var(--color-border)] text-[var(--color-text-primary)]")
          : "bg-[var(--color-tier1)] text-white"
      )}>
        {isAgent && !message.isError ? (
          <div className="text-[13px] leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2 [&>ul:last-child]:mb-0 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-1 [&>strong]:font-semibold text-[var(--color-text-primary)]">
            <ReactMarkdown>
              {message.text}
            </ReactMarkdown>
          </div>
        ) : (
          message.text
        )}
      </div>
    </div>
  );
};
