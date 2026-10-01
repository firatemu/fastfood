import type { HTMLAttributes, ReactNode } from 'react';

import './styles.css';

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** attached = shared borders between adjacent buttons */
  attached?: boolean;
}

export function ButtonGroup(props: ButtonGroupProps) {
  const { children, attached = false, className, ...rest } = props;
  const classes = ['ff-button-group', attached ? 'ff-button-group--attached' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div {...rest} className={classes} role="group">
      {children}
    </div>
  );
}
