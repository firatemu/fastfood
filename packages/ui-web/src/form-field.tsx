import type { ReactNode } from 'react';

import './styles.css';

export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  helperText?: string;
  errorText?: string;
  children: ReactNode;
  /** Visually hide the label while remaining accessible. */
  hideLabel?: boolean;
}

/**
 * FormField — accessible label + helper/error text wrapper for any
 * form control. Children should use the matching `id` to associate.
 */
export function FormField(props: FormFieldProps) {
  const { id, label, required, helperText, errorText, children, hideLabel = false } = props;
  const hasError = Boolean(errorText);
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  return (
    <div className={`ff-field ${hasError ? 'ff-field--error' : ''}`}>
      <label
        htmlFor={id}
        className="ff-field__label"
        style={
          hideLabel ? { position: 'absolute', width: 1, height: 1, overflow: 'hidden' } : undefined
        }
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div className="ff-field__control">{children}</div>
      {helperText && !hasError ? (
        <p id={helperId} className="ff-field__helper">
          {helperText}
        </p>
      ) : null}
      {errorText ? (
        <p id={errorId} role="alert" className="ff-field__error">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
