import type { ReactNode } from 'react';

import './styles.css';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * EmptyState — friendly empty list placeholder.
 */
export function EmptyState(props: EmptyStateProps) {
  const { title, description, action } = props;
  return (
    <div role="status" className="ff-empty">
      <h3 className="ff-empty__title">{title}</h3>
      {description ? <p className="ff-empty__desc">{description}</p> : null}
      {action ? <div className="ff-empty__action">{action}</div> : null}
    </div>
  );
}
