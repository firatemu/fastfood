'use client';

import {
  useCallback,
  useId,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';

import './styles.css';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  label?: string;
  autoComplete?: string;
}

/**
 * OtpInput — digit group for verification codes. Keyboard and paste friendly.
 */
export function OtpInput(props: OtpInputProps) {
  const {
    length = 6,
    value,
    onChange,
    disabled = false,
    invalid = false,
    label = 'Doğrulama kodu',
    autoComplete = 'one-time-code',
  } = props;
  const baseId = useId();
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const setDigit = useCallback(
    (index: number, digit: string) => {
      const next = digits.map((d, i) => (i === index ? digit : d));
      onChange(next.join('').slice(0, length));
    },
    [digits, length, onChange],
  );

  const onDigitChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setDigit(index, '');
      return;
    }
    const char = raw.slice(-1);
    setDigit(index, char);
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted.padEnd(Math.min(pasted.length, length), '').slice(0, length));
    const focusIndex = Math.min(pasted.length, length - 1);
    refs.current[focusIndex]?.focus();
  };

  return (
    <div
      role="group"
      aria-label={label}
      className={`ff-otp${invalid ? ' ff-otp--invalid' : ''}${disabled ? ' ff-otp--disabled' : ''}`}
    >
      {digits.map((digit, index) => (
        <input
          key={`${baseId}-${index}`}
          ref={(el) => {
            refs.current[index] = el;
          }}
          id={`${baseId}-${index}`}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? autoComplete : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`${label} ${index + 1}`}
          className="ff-otp__digit"
          onChange={(e) => onDigitChange(index, e)}
          onKeyDown={(e) => onKeyDown(index, e)}
          onPaste={onPaste}
        />
      ))}
    </div>
  );
}
