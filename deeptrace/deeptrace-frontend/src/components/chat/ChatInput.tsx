import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--color-border)] bg-white">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? "Thinking..." : "Ask about a supplier or risk..."}
          className="w-full bg-gray-50 border border-[var(--color-border)] rounded-[var(--radius-control)] py-2.5 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-border)] disabled:opacity-50"
        />
        <button 
          type="submit" 
          disabled={!value.trim() || disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-tier1)] disabled:opacity-50 disabled:hover:text-[var(--color-text-muted)] transition-colors p-1"
        >
          <Send size={16} />
        </button>
      </div>
    </form>
  );
};
