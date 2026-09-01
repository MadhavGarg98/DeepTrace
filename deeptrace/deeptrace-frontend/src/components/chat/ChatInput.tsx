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
    <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--color-border)] bg-gray-50/60">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? "Analyzing..." : "Ask about a supplier or risk..."}
          className="w-full bg-white border border-[var(--color-border)] rounded-lg py-2.5 pl-3.5 pr-11 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-tier1)]/20 focus:border-[var(--color-tier1)]/40 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
        />
        <button 
          type="submit" 
          disabled={!value.trim() || disabled}
          className="absolute right-1.5 w-7 h-7 rounded-md flex items-center justify-center bg-[var(--color-tier1)] text-white disabled:opacity-30 disabled:bg-gray-300 hover:bg-[var(--color-tier1)]/90 active:scale-95 transition-all duration-150 shadow-sm"
        >
          <Send size={13} />
        </button>
      </div>
    </form>
  );
};
