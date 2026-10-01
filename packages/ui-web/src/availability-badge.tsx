import type { ReactNode } from 'react';

import { Badge, type BadgeVariant } from './badge.js';
import './styles.css';

export type AvailabilityState = 'available' | 'sold_out' | 'scheduled' | 'offline';

const STATE_VARIANT: Record<AvailabilityState, BadgeVariant> = {
  available: 'success',
  sold_out: 'danger',
  scheduled: 'warning',
  offline: 'neutral',
};

const STATE_LABEL: Record<AvailabilityState, string> = {
  available: 'Satışta',
  sold_out: 'Tükendi',
  scheduled: 'Planlı',
  offline: 'Kapalı',
};

export interface AvailabilityBadgeProps {
  state: AvailabilityState;
  label?: string;
  children?: ReactNode;
}

export function AvailabilityBadge(props: AvailabilityBadgeProps) {
  const { state, label, children } = props;
  return <Badge variant={STATE_VARIANT[state]}>{children ?? label ?? STATE_LABEL[state]}</Badge>;
}
