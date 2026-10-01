import type { ReactNode } from 'react';

import './styles.css';

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}

/**
 * PageHeader — dense Ops page chrome for list/detail compositions.
 */
export function PageHeader(props: PageHeaderProps) {
  const { title, description, breadcrumbs, actions, meta } = props;
  return (
    <header className="ff-page-header">
      {breadcrumbs ? <div className="ff-page-header__crumbs">{breadcrumbs}</div> : null}
      <div className="ff-page-header__row">
        <div className="ff-page-header__titles">
          <h1 className="ff-page-header__title">{title}</h1>
          {description ? <p className="ff-page-header__desc">{description}</p> : null}
          {meta ? <div className="ff-page-header__meta">{meta}</div> : null}
        </div>
        {actions ? <div className="ff-page-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
