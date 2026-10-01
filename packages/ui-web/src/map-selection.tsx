import type { ReactNode } from 'react';

import './styles.css';

export interface MapSelectionProps {
  /** Optional map container — most apps will swap this for a real Maps embed. */
  children?: ReactNode;
  /** Accessible label describing what the map shows. */
  ariaLabel: string;
}

/**
 * MapSelection — placeholder for a map picker. Apps compose the real
 * provider embed here. role=application so AT does not try to inspect.
 */
export function MapSelection(props: MapSelectionProps) {
  const { children, ariaLabel } = props;
  return (
    <div role="application" aria-label={ariaLabel} className="ff-map-selection">
      {children ?? (
        <div aria-hidden="true" className="ff-map-selection__placeholder">
          Harita seçimi
        </div>
      )}
    </div>
  );
}
