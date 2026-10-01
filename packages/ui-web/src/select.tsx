import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';

import './styles.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  options: SelectOption[];
  placeholder?: string;
  children?: ReactNode;
}

/**
 * Select — native <select> with consistent token-based styling.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = 'md', invalid = false, options, placeholder, className, disabled, children, ...rest },
  ref,
) {
  const classes = [
    'ff-select',
    `ff-select--${size}`,
    invalid ? 'ff-select--invalid' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <select {...rest} ref={ref} disabled={disabled} className={classes}>
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
      {children}
    </select>
  );
});
