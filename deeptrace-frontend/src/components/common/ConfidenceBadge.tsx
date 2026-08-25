import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ConfidenceBadgeProps {
  confidence: number;
  source: string;
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence, source, className }) => {
  const isConfirmed = source === 'erp_direct' || confidence >= 0.99;
  
  return (
    <span 
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap border",
        isConfirmed 
          ? "bg-[var(--color-tier1-bg)] text-[var(--color-tier1)] border-[var(--color-tier1)]/20" 
          : "bg-[var(--color-risk-bg)] text-[var(--color-risk)] border-[var(--color-risk)]/20",
        className
      )}
    >
      {isConfirmed ? 'Confirmed' : `Inferred · ${Math.round(confidence * 100)}%`}
    </span>
  );
};
