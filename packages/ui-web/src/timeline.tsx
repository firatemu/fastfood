import type { ReactNode } from 'react';

import './styles.css';

export interface TimelineEventItem {
  id: string;
  time: ReactNode;
  title: string;
  description?: ReactNode;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}

export interface TimelineProps {
  events: TimelineEventItem[];
  ariaLabel: string;
}

/**
 * Timeline — vertical operational event history (orders, audit, delivery).
 */
export function Timeline(props: TimelineProps) {
  const { events, ariaLabel } = props;
  return (
    <ol className="ff-timeline" aria-label={ariaLabel}>
      {events.map((ev) => (
        <li key={ev.id} className={`ff-timeline__item ff-timeline__item--${ev.tone ?? 'neutral'}`}>
          <div className="ff-timeline__marker" aria-hidden="true" />
          <div className="ff-timeline__body">
            <div className="ff-timeline__meta">
              <time className="ff-timeline__time">{ev.time}</time>
            </div>
            <p className="ff-timeline__title">{ev.title}</p>
            {ev.description ? <div className="ff-timeline__desc">{ev.description}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
