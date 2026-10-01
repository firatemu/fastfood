import type { ReactNode } from 'react';

import './styles.css';

export interface ErrorStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * ErrorState — accessible error placeholder. role=alert.
 */
export function ErrorState(props: ErrorStateProps) {
  const { title, description, action } = props;
  return (
    <div role="alert" className="ff-error-state">
      <h3 className="ff-error-state__title">{title}</h3>
      {description ? <p className="ff-error-state__desc">{description}</p> : null}
      {action ? <div className="ff-error-state__action">{action}</div> : null}
    </div>
  );
}
