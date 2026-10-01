import type { ReactNode } from 'react';

import './styles.css';

export interface SuccessStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * SuccessState — positive completion placeholder for Ops flows.
 */
export function SuccessState(props: SuccessStateProps) {
  const { title, description, action } = props;
  return (
    <div role="status" className="ff-success-state">
      <h3 className="ff-success-state__title">{title}</h3>
      {description ? <p className="ff-success-state__desc">{description}</p> : null}
      {action ? <div className="ff-success-state__action">{action}</div> : null}
    </div>
  );
}
