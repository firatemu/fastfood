import type { HTMLAttributes, ReactNode } from 'react';

import './styles.css';

export interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  toolbar?: ReactNode;
  padding?: 'none' | 'md';
}

/**
 * Panel — bordered Ops surface without card footer semantics.
 */
export function Panel(props: PanelProps) {
  const { title, toolbar, padding = 'md', className, children, ...rest } = props;
  const classes = ['ff-panel', padding === 'none' ? 'ff-panel--flush' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <section {...rest} className={classes}>
      {title || toolbar ? (
        <header className="ff-panel__header">
          {title ? <h3 className="ff-panel__title">{title}</h3> : null}
          {toolbar ? <div className="ff-panel__toolbar">{toolbar}</div> : null}
        </header>
      ) : null}
      <div className="ff-panel__body">{children}</div>
    </section>
  );
}
