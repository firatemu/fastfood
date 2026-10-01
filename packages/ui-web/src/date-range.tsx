import { forwardRef, type InputHTMLAttributes } from 'react';

import './styles.css';
import { DateTime } from './date-time.js';

export interface DateRangeValue {
  from?: string;
  to?: string;
}

export interface DateRangeProps {
  id?: string;
  fromLabel?: string;
  toLabel?: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  disabled?: boolean;
  invalid?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * DateRange — paired date inputs for Ops filters (list / report ranges).
 */
export function DateRange(props: DateRangeProps) {
  const {
    id = 'date-range',
    fromLabel = 'Başlangıç',
    toLabel = 'Bitiş',
    value,
    onChange,
    disabled = false,
    invalid = false,
    size = 'md',
  } = props;

  return (
    <div
      role="group"
      aria-label={`${fromLabel} – ${toLabel}`}
      className={`ff-date-range${invalid ? ' ff-date-range--invalid' : ''}`}
    >
      <label className="ff-date-range__field" htmlFor={`${id}-from`}>
        <span className="ff-date-range__label">{fromLabel}</span>
        <DateTime
          id={`${id}-from`}
          kind="date"
          size={size}
          disabled={disabled}
          invalid={invalid}
          value={value.from ?? ''}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </label>
      <span className="ff-date-range__sep" aria-hidden="true">
        –
      </span>
      <label className="ff-date-range__field" htmlFor={`${id}-to`}>
        <span className="ff-date-range__label">{toLabel}</span>
        <DateTime
          id={`${id}-to`}
          kind="date"
          size={size}
          disabled={disabled}
          invalid={invalid}
          value={value.to ?? ''}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          min={value.from}
        />
      </label>
    </div>
  );
}

export interface RelativeTimeProps extends Omit<InputHTMLAttributes<HTMLTimeElement>, 'dateTime'> {
  /** ISO-8601 timestamp. */
  value: string;
  /** Optional preformatted Turkish relative label (caller owns i18n). */
  label: string;
}

/**
 * RelativeTime — accessible relative clock display (presentation).
 */
export const RelativeTime = forwardRef<HTMLTimeElement, RelativeTimeProps>(function RelativeTime(
  { value, label, className, ...rest },
  ref,
) {
  return (
    <time
      {...rest}
      ref={ref}
      dateTime={value}
      className={['ff-relative-time', className ?? ''].filter(Boolean).join(' ')}
    >
      {label}
    </time>
  );
});
