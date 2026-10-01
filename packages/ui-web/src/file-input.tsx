import type { InputHTMLAttributes, ReactNode } from 'react';

import './styles.css';

export interface FileInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  hint?: string;
  errorText?: string;
  /** Shown when a file is selected (controlled display name). */
  fileName?: string;
}

/**
 * FileInput — media/document picker abstraction for Admin catalog uploads.
 */
export function FileInput(props: FileInputProps) {
  const { label, hint, errorText, fileName, className, id, disabled, ...rest } = props;
  const inputId = id ?? rest.name ?? 'ff-file-input';
  const invalid = Boolean(errorText);
  return (
    <div className={`ff-file-input${invalid ? ' ff-file-input--invalid' : ''}`}>
      <label className="ff-file-input__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="ff-file-input__control">
        <input
          {...rest}
          id={inputId}
          type="file"
          disabled={disabled}
          className={['ff-file-input__native', className ?? ''].filter(Boolean).join(' ')}
          aria-invalid={invalid || undefined}
          aria-describedby={
            [hint ? `${inputId}-hint` : '', errorText ? `${inputId}-error` : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
        <span className="ff-file-input__name" aria-live="polite">
          {fileName ?? 'Dosya seçilmedi'}
        </span>
      </div>
      {hint ? (
        <p id={`${inputId}-hint`} className="ff-file-input__hint">
          {hint}
        </p>
      ) : null}
      {errorText ? (
        <p id={`${inputId}-error`} className="ff-file-input__error" role="alert">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
