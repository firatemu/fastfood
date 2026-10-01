import { forwardRef, type InputHTMLAttributes } from 'react';

import './styles.css';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  selected?: boolean;
  onSelect?: () => void;
}

/**
 * Radio — single radio button in a radio group. Caller must set the
 * matching `name` attribute on each item in the group.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, className, disabled, selected, onSelect, ...rest },
  ref,
) {
  const classes = ['ff-radio', className ?? ''].filter(Boolean).join(' ');
  return (
    <label className={classes}>
      <input
        {...rest}
        ref={ref}
        type="radio"
        disabled={disabled}
        checked={selected}
        onChange={() => onSelect?.()}
        className="ff-radio__input"
      />
      <span className="ff-radio__label">{label}</span>
    </label>
  );
});
