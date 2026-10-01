import type { ReactNode } from 'react';

import './styles.css';
import { Badge, type BadgeVariant } from './badge.js';

export type StatusTone = 'pending' | 'in_progress' | 'ready' | 'completed' | 'failed' | 'cancelled';

const TONE_TO_VARIANT: Record<StatusTone, BadgeVariant> = {
  pending: 'neutral',
  in_progress: 'info',
  ready: 'info',
  completed: 'success',
  failed: 'danger',
  cancelled: 'warning',
};

const TONE_LABEL: Record<StatusTone, string> = {
  pending: 'Beklemede',
  in_progress: 'Hazırlanıyor',
  ready: 'Hazır',
  completed: 'Tamamlandı',
  failed: 'Başarısız',
  cancelled: 'İptal edildi',
};

export interface StatusBadgeProps {
  tone: StatusTone;
  label?: string;
  children?: ReactNode;
}

/**
 * StatusBadge — semantic mapping from StatusTone to canonical label
 * and visual variant. Keeps order/courier/kitchen status copy
 * consistent.
 */
export function StatusBadge(props: StatusBadgeProps) {
  const { tone, label, children } = props;
  return <Badge variant={TONE_TO_VARIANT[tone]}>{children ?? label ?? TONE_LABEL[tone]}</Badge>;
}
