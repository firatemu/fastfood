import type { ReactNode } from 'react';

import './styles.css';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/**
 * SectionHeader — in-page section title below PageHeader.
 */
export function SectionHeader(props: SectionHeaderProps) {
  const { title, description, actions } = props;
  return (
    <div className="ff-section-header">
      <div className="ff-section-header__text">
        <h2 className="ff-section-header__title">{title}</h2>
        {description ? <p className="ff-section-header__desc">{description}</p> : null}
      </div>
      {actions ? <div className="ff-section-header__actions">{actions}</div> : null}
    </div>
  );
}
