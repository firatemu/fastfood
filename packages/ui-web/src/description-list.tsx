import type { ReactNode } from 'react';

import './styles.css';

export interface DescriptionListItem {
  term: string;
  value: ReactNode;
}

export interface DescriptionListProps {
  items: DescriptionListItem[];
  /** compact = single column; split = two-column on wide screens */
  layout?: 'compact' | 'split';
  ariaLabel?: string;
}

/**
 * DescriptionList — key/value pairs for detail panels.
 */
export function DescriptionList(props: DescriptionListProps) {
  const { items, layout = 'split', ariaLabel } = props;
  return (
    <dl className={`ff-description-list ff-description-list--${layout}`} aria-label={ariaLabel}>
      {items.map((item) => (
        <div key={item.term} className="ff-description-list__row">
          <dt className="ff-description-list__term">{item.term}</dt>
          <dd className="ff-description-list__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
