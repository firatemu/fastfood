import type { ReactNode } from 'react';

import { Badge, type BadgeVariant } from './badge.js';
import './styles.css';

export type DeliveryStatus =
  | 'unassigned'
  | 'assigned'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'failed';

const STATUS_VARIANT: Record<DeliveryStatus, BadgeVariant> = {
  unassigned: 'neutral',
  assigned: 'info',
  picked_up: 'info',
  on_the_way: 'primary',
  delivered: 'success',
  failed: 'danger',
};

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  unassigned: 'Atanmadı',
  assigned: 'Atandı',
  picked_up: 'Alındı',
  on_the_way: 'Yolda',
  delivered: 'Teslim edildi',
  failed: 'Başarısız',
};

export interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  label?: string;
  children?: ReactNode;
}

export function DeliveryStatusBadge(props: DeliveryStatusBadgeProps) {
  const { status, label, children } = props;
  return (
    <Badge variant={STATUS_VARIANT[status]}>{children ?? label ?? STATUS_LABEL[status]}</Badge>
  );
}
