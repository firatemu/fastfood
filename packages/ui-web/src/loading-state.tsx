import type { ReactNode } from 'react';

import './styles.css';

export interface LoadingStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

/**
 * LoadingState — page/section loading placeholder with accessible status.
 */
export function LoadingState(props: LoadingStateProps) {
  const { title = 'Yükleniyor', description = 'Veriler getiriliyor…', action } = props;
  return (
    <div role="status" aria-busy="true" className="ff-loading-state" aria-label={title}>
      <span className="ff-spinner ff-spinner--md" aria-hidden="true">
        <span className="ff-spinner__circle" />
      </span>
      <h3 className="ff-loading-state__title">{title}</h3>
      {description ? <p className="ff-loading-state__desc">{description}</p> : null}
      {action ? <div className="ff-loading-state__action">{action}</div> : null}
    </div>
  );
}
