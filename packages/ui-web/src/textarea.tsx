import { forwardRef, type TextareaHTMLAttributes } from 'react';

import './styles.css';

export type TextareaSize = 'sm' | 'md' | 'lg';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: TextareaSize;
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { size = 'md', invalid = false, className, disabled, ...rest },
  ref,
) {
  const classes = [
    'ff-textarea',
    `ff-textarea--${size}`,
    invalid ? 'ff-textarea--invalid' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return <textarea {...rest} ref={ref} disabled={disabled} className={classes} />;
});
