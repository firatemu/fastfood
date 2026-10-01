'use client';
import { useState, type ReactNode } from 'react';

import './styles.css';

export interface TabsItem {
  id: string;
  label: string;
  panel: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabsItem[];
  defaultId?: string;
  ariaLabel: string;
}

/**
 * Tabs — accessible tab list + panels. Arrow-key navigation is the
 * caller's responsibility in real apps; this implementation provides
 * the canonical ARIA wiring.
 */
export function Tabs(props: TabsProps) {
  const { items, defaultId, ariaLabel } = props;
  const initial = defaultId ?? items[0]?.id ?? '';
  const [active, setActive] = useState(initial);
  return (
    <div className="ff-tabs">
      <div role="tablist" aria-label={ariaLabel} className="ff-tabs__list">
        {items.map((item) => (
          <button
            key={item.id}
            role="tab"
            type="button"
            id={`tab-${item.id}`}
            aria-selected={item.id === active}
            aria-controls={`panel-${item.id}`}
            disabled={item.disabled}
            tabIndex={item.id === active ? 0 : -1}
            className={`ff-tabs__tab ${item.id === active ? 'ff-tabs__tab--active' : ''}`}
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`panel-${item.id}`}
          aria-labelledby={`tab-${item.id}`}
          hidden={item.id !== active}
          className="ff-tabs__panel"
        >
          {item.panel}
        </div>
      ))}
    </div>
  );
}
