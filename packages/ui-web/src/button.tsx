import type { ButtonHTMLAttributes, ReactNode } from 'react';

import './styles.css';

export type ButtonVariant = 'primary' | 'secondary' | 'save' | 'danger' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

/**
 * Canonical Button primitive. Phase 0 foundation only — design system
 * expansion happens in Phase 2 per document 38.
 */
export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  } = props;

  const classes = [
    'ff-btn',
    `ff-btn--${variant}`,
    `ff-btn--${size}`,
    fullWidth ? 'ff-btn--full' : '',
    loading ? 'ff-btn--loading' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {leftIcon ? <span className="ff-btn__icon">{leftIcon}</span> : null}
      <span className="ff-btn__label">{children}</span>
      {rightIcon ? <span className="ff-btn__icon">{rightIcon}</span> : null}
    </button>
  );
}
