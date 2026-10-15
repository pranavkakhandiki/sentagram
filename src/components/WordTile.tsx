import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

interface WordTileProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  accessibleLabel: string;
  placed?: boolean;
  disabled?: boolean;
}

export const WordTile = forwardRef<HTMLButtonElement, WordTileProps>(function WordTile(
  { label, accessibleLabel, placed = false, disabled = false, className = '', ...buttonProps },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`word-tile ${placed ? 'placed-tile' : ''} ${className}`}
      aria-label={accessibleLabel}
      disabled={disabled}
      {...buttonProps}
    >
      {label}
    </button>
  );
});
