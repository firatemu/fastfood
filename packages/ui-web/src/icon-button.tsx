import type { ButtonHTMLAttributes, ReactNode } from 'react';

import './styles.css';

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  label: string; // accessible label (required for icon-only buttons)
  icon: ReactNode;
  loading?: boolean;
}

/**
 * IconButton — square button that renders only an icon. Requires an
 * explicit accessible label. WCAG 2.2 AA: keyboard-operable, focus-visible.
 */
export function IconButton(props: IconButtonProps) {
  const {
    variant = 'secondary',
    size = 'md',
    label,
    icon,
    loading = false,
    disabled,
    type = 'button',
    className,
    ...rest
  } = props;
  const classes = [
    'ff-icon-btn',
    `ff-icon-btn--${variant}`,
    `ff-icon-btn--${size}`,
    loading ? 'ff-icon-btn--loading' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      aria-busy={loading}
      disabled={disabled || loading}
      className={classes}
    >
      <span className="ff-icon-btn__icon" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}
