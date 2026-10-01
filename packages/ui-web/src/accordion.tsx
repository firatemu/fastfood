'use client';
import { useState, type ReactNode } from 'react';

import './styles.css';

export interface AccordionItem {
  id: string;
  title: string;
  panel: ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** When true, multiple items can be open at once. */
  multiple?: boolean;
}

/**
 * Accordion — vertical collapsible sections. Each trigger uses
 * aria-expanded + aria-controls.
 */
export function Accordion(props: AccordionProps) {
  const { items, multiple = false } = props;
  const [open, setOpen] = useState<Set<string>>(new Set());
  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (!multiple) {
        next.clear();
        next.add(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }
  return (
    <div className="ff-accordion">
      {items.map((item) => {
        const expanded = open.has(item.id);
        return (
          <div key={item.id} className="ff-accordion__item">
            <button
              type="button"
              className="ff-accordion__trigger"
              aria-expanded={expanded}
              aria-controls={`acc-${item.id}`}
              id={`acc-trigger-${item.id}`}
              disabled={item.disabled}
              onClick={() => toggle(item.id)}
            >
              {item.title}
            </button>
            <div
              id={`acc-${item.id}`}
              role="region"
              aria-labelledby={`acc-trigger-${item.id}`}
              hidden={!expanded}
              className="ff-accordion__panel"
            >
              {item.panel}
            </div>
          </div>
        );
      })}
    </div>
  );
}
