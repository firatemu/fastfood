export {
  formatDeltaMinor,
  formatTryMinor,
  multiplyMinor,
} from '@fastfood/contracts';

export function formatDeliveryWindow(min: number, max: number): string | null {
  if (min <= 0 && max <= 0) return null;
  if (min > 0 && max > 0) return `${min}–${max} dk`;
  return `${max > 0 ? max : min} dk`;
}
