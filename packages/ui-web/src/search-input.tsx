import { forwardRef, type InputHTMLAttributes } from 'react';

import './styles.css';

export type SearchInputSize = 'sm' | 'md' | 'lg';

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: SearchInputSize;
  invalid?: boolean;
  /** Placeholder. */
  placeholder?: string;
}

/**
 * SearchInput — specialized text input with search semantics. role=searchbox.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { size = 'md', invalid = false, className, disabled, placeholder, ...rest },
  ref,
) {
  const classes = [
    'ff-input',
    'ff-input--search',
    `ff-input--${size}`,
    invalid ? 'ff-input--invalid' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <input
      {...rest}
      ref={ref}
      type="search"
      role="searchbox"
      placeholder={placeholder}
      disabled={disabled}
      className={classes}
    />
  );
});
