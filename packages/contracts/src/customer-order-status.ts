/** Customer-facing order phases. Stitch tracking uses a 4-step culinary stepper;
 * this 6-step map is the existing backend status vocabulary and must be retained. */
export const CUSTOMER_ORDER_PHASES = [
  { key: 'received', label: 'Alındı' },
  { key: 'confirmed', label: 'Onaylandı' },
  { key: 'preparing', label: 'Hazırlanıyor' },
  { key: 'ready', label: 'Kurye için hazır' },
  { key: 'picked', label: 'Yolda' },
  { key: 'delivered', label: 'Teslim edildi' },
] as const;

export function mapOrderStatusToPhaseIndex(status: string): number {
  const s = status.toUpperCase();
  if (s.includes('DELIVER') || s.includes('COMPLETED') || s.includes('DONE')) return 5;
  if (s.includes('COURIER') || s.includes('WAY') || s.includes('DISPATCH') || s.includes('OUT'))
    return 4;
  if (s.includes('READY')) return 3;
  if (s.includes('PREP') || s.includes('KITCHEN') || s.includes('COOK')) return 2;
  if (s.includes('CONFIRM')) return 1;
  return 0;
}

/** Stitch live-tracking stepper (4 steps) mapped from backend status. */
export function mapOrderStatusToStitchStepperIndex(status: string): number {
  const s = status.toUpperCase();
  if (s === 'CANCELLED' || s === 'REJECTED' || s === 'PAYMENT_FAILED') return -1;
  const phase = mapOrderStatusToPhaseIndex(status);
  if (phase <= 0) return 0;
  if (phase <= 2) return 1;
  if (phase <= 4) return 2;
  return 3;
}
