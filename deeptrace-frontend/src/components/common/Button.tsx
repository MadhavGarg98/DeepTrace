import React from 'react';
import { cn } from './ConfidenceBadge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-border)] disabled:pointer-events-none disabled:opacity-50",
          {
            'bg-[var(--color-text-primary)] text-white hover:bg-[var(--color-text-primary)]/90 shadow-sm': variant === 'primary',
            'bg-white text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-gray-50 shadow-sm': variant === 'secondary',
            'hover:bg-gray-100 text-[var(--color-text-secondary)]': variant === 'ghost',
          },
          className
        )}
        {...props}
      >
        {isLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export const Spinner = ({ className }: { className?: string }) => (
  <svg
    className={cn("animate-spin text-current", className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);
