'use client';
import { forwardRef, useState, type InputHTMLAttributes } from 'react';

import './styles.css';

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
}

/**
 * PasswordInput — input[type=password] with a visibility toggle. The
 * toggle button is keyboard-operable and exposes aria-pressed.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ size = 'md', invalid = false, className, disabled, ...rest }, ref) {
    const [visible, setVisible] = useState(false);
    const classes = [
      'ff-input',
      'ff-input--password',
      `ff-input--${size}`,
      invalid ? 'ff-input--invalid' : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <span className="ff-input-wrapper">
        <input
          {...rest}
          ref={ref}
          type={visible ? 'text' : 'password'}
          disabled={disabled}
          className={classes}
          autoComplete="current-password"
        />
        <button
          type="button"
          className="ff-input__toggle"
          disabled={disabled}
          aria-pressed={visible}
          aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? 'Gizle' : 'Göster'}
        </button>
      </span>
    );
  },
);
