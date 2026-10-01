import type { HTMLAttributes, ReactNode } from 'react';

import './styles.css';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  elevation?: 'flat' | 'raised' | 'floating';
}

/**
 * Canonical Card primitive. Phase 0 foundation only.
 */
export function Card(props: CardProps) {
  const { title, subtitle, footer, elevation = 'raised', className, children, ...rest } = props;
  const classes = ['ff-card', `ff-card--${elevation}`, className ?? ''].filter(Boolean).join(' ');
  return (
    <div {...rest} className={classes}>
      {(title || subtitle) && (
        <header className="ff-card__header">
          {title && <h3 className="ff-card__title">{title}</h3>}
          {subtitle && <p className="ff-card__subtitle">{subtitle}</p>}
        </header>
      )}
      <div className="ff-card__body">{children}</div>
      {footer && <footer className="ff-card__footer">{footer}</footer>}
    </div>
  );
}
