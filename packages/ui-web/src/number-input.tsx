import { forwardRef, type InputHTMLAttributes } from 'react';

import './styles.css';

export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
}

/**
 * NumberInput — canonical numeric field for Ops forms (counts, limits).
 * Prefer CurrencyInput for money; prefer Quantity for cart steppers.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { size = 'md', invalid = false, className, disabled, inputMode = 'numeric', ...rest },
  ref,
) {
  const classes = [
    'ff-input',
    'ff-input--number',
    `ff-input--${size}`,
    invalid ? 'ff-input--invalid' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <input
      {...rest}
      ref={ref}
      type="number"
      inputMode={inputMode}
      disabled={disabled}
      className={classes}
    />
  );
});
