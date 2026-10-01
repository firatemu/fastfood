import type { AnchorHTMLAttributes, ReactNode } from 'react';

import './styles.css';

export type LinkButtonVariant = 'primary' | 'secondary' | 'danger';

export interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: LinkButtonVariant;
  children: ReactNode;
}

/**
 * LinkButton — anchor styled like a Button. Used for in-app navigation.
 */
export function LinkButton(props: LinkButtonProps) {
  const { variant = 'primary', className, children, ...rest } = props;
  const classes = ['ff-btn', `ff-btn--${variant}`, 'ff-btn--link', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <a {...rest} className={classes}>
      <span className="ff-btn__label">{children}</span>
    </a>
  );
}
