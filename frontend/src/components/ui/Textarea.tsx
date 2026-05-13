import { type TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-[var(--radius-md)]
            bg-[var(--color-bg-input)] border border-[var(--color-border)]
            text-[var(--color-text-primary)] text-sm
            font-[var(--font-mono)]
            placeholder:text-[var(--color-text-muted)]
            focus:outline-none focus:border-[var(--color-border-focus)]
            focus:ring-1 focus:ring-[var(--color-border-focus)]
            transition-colors duration-200
            resize-none
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
