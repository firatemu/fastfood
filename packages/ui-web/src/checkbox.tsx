import { forwardRef, type InputHTMLAttributes } from 'react';

import './styles.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  invalid?: boolean;
}

/**
 * Checkbox — accessible label-required checkbox.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, invalid = false, className, disabled, ...rest },
  ref,
) {
  const classes = ['ff-checkbox', invalid ? 'ff-checkbox--invalid' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <label className={classes}>
      <input
        {...rest}
        ref={ref}
        type="checkbox"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className="ff-checkbox__input"
      />
      <span className="ff-checkbox__label">{label}</span>
    </label>
  );
});
