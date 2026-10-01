import { forwardRef, type InputHTMLAttributes } from 'react';

import './styles.css';

export type DateTimeKind = 'date' | 'time' | 'datetime-local';

export interface DateTimeProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  kind: DateTimeKind;
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
}

/**
 * DateTime — wrapper over the canonical <input type="date|time|datetime-local">.
 */
export const DateTime = forwardRef<HTMLInputElement, DateTimeProps>(function DateTime(
  { kind, size = 'md', invalid = false, className, disabled, ...rest },
  ref,
) {
  const classes = [
    'ff-input',
    `ff-input--${size}`,
    invalid ? 'ff-input--invalid' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return <input {...rest} ref={ref} type={kind} disabled={disabled} className={classes} />;
});
