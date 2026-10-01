import { forwardRef, type InputHTMLAttributes } from 'react';

import './styles.css';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
  invalid?: boolean;
  loading?: boolean;
}

/**
 * Canonical Input primitive.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'md', invalid = false, loading = false, className, disabled, ...rest },
  ref,
) {
  const classes = [
    'ff-input',
    `ff-input--${size}`,
    invalid ? 'ff-input--invalid' : '',
    loading ? 'ff-input--loading' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return <input {...rest} ref={ref} disabled={disabled || loading} className={classes} />;
});
