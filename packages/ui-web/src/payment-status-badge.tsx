import type { ReactNode } from 'react';

import { Badge, type BadgeVariant } from './badge.js';
import './styles.css';

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

const STATUS_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  pending: 'warning',
  authorized: 'info',
  captured: 'success',
  failed: 'danger',
  refunded: 'neutral',
  partially_refunded: 'warning',
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Beklemede',
  authorized: 'Yetkilendirildi',
  captured: 'Tahsil edildi',
  failed: 'Başarısız',
  refunded: 'İade edildi',
  partially_refunded: 'Kısmi iade',
};

export interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  label?: string;
  children?: ReactNode;
}

export function PaymentStatusBadge(props: PaymentStatusBadgeProps) {
  const { status, label, children } = props;
  return (
    <Badge variant={STATUS_VARIANT[status]}>{children ?? label ?? STATUS_LABEL[status]}</Badge>
  );
}
