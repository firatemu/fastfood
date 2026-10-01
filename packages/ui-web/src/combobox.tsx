'use client';
import { useId, useState } from 'react';

import './styles.css';

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  label: string;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * Combobox — accessible ARIA 1.2 combobox with a single text input.
 * Renders a listbox of options; keyboard navigation is canonical
 * (ArrowUp/Down, Enter, Escape).
 */
export function Combobox(props: ComboboxProps) {
  const { options, value, onChange, label, placeholder, invalid, disabled } = props;
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const current = options.find((o) => o.value === value);
  function pickIndex(idx: number) {
    const opt = options[idx];
    if (!opt || opt.disabled) return;
    onChange?.(opt.value);
    setOpen(false);
  }
  return (
    <div className="ff-combobox">
      <label htmlFor={id} className="ff-combobox__label">
        {label}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        disabled={disabled}
        placeholder={placeholder}
        className={`ff-input ${invalid ? 'ff-input--invalid' : ''}`}
        value={current?.label ?? ''}
        onFocus={() => setOpen(true)}
        onChange={() => {
          // In a real combobox, filter on input. Demo: keep list open.
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, options.length - 1));
            setOpen(true);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pickIndex(active);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open ? (
        <ul role="listbox" id={`${id}-list`} className="ff-combobox__list">
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              aria-disabled={o.disabled || undefined}
              className={`ff-combobox__option ${i === active ? 'ff-combobox__option--active' : ''}`}
              onClick={() => pickIndex(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
