import { forwardRef, type InputHTMLAttributes } from 'react';

import './styles.css';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

/**
 * Switch — toggle control, modeled as a checkbox. role=switch.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, className, disabled, ...rest },
  ref,
) {
  const classes = ['ff-switch', className ?? ''].filter(Boolean).join(' ');
  return (
    <label className={classes}>
      <input
        {...rest}
        ref={ref}
        type="checkbox"
        role="switch"
        disabled={disabled}
        className="ff-switch__input"
      />
      <span className="ff-switch__track" aria-hidden="true">
        <span className="ff-switch__thumb" />
      </span>
      <span className="ff-switch__label">{label}</span>
    </label>
  );
});
