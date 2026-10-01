import { forwardRef, type InputHTMLAttributes } from 'react';

import './styles.css';

export interface CurrencyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  /** ISO 4217 currency label shown as suffix (display only). */
  currency?: string;
  /** Optional prefix (e.g. ₺). Defaults to currency-aware symbol for TRY. */
  prefix?: string;
}

/**
 * CurrencyInput — major-unit text entry for Ops money fields.
 * Canonical persistence remains minor-unit bigint at the API boundary;
 * this control is presentation/entry only.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    {
      size = 'md',
      invalid = false,
      currency = 'TRY',
      prefix,
      className,
      disabled,
      inputMode = 'decimal',
      'aria-label': ariaLabel,
      ...rest
    },
    ref,
  ) {
    const symbol = prefix ?? (currency === 'TRY' ? '₺' : currency);
    const classes = [
      'ff-input',
      'ff-input--currency',
      `ff-input--${size}`,
      invalid ? 'ff-input--invalid' : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <span className="ff-currency-input">
        <span className="ff-currency-input__prefix" aria-hidden="true">
          {symbol}
        </span>
        <input
          {...rest}
          ref={ref}
          type="text"
          inputMode={inputMode}
          disabled={disabled}
          className={classes}
          aria-label={ariaLabel ?? `Tutar (${currency})`}
        />
        <span className="ff-currency-input__suffix sr-only">{currency}</span>
      </span>
    );
  },
);
