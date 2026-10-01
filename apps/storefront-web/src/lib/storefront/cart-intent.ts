const NOTE_KEY = 'ff_cart_delivery_note';
const LOYALTY_KEY = 'ff_use_loyalty';

export function readCartDeliveryNote(): string {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(NOTE_KEY) ?? '';
}

export function writeCartDeliveryNote(note: string): void {
  if (typeof window === 'undefined') return;
  const next = note.trim();
  if (next) window.sessionStorage.setItem(NOTE_KEY, next);
  else window.sessionStorage.removeItem(NOTE_KEY);
}

export function readUseLoyaltyIntent(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(LOYALTY_KEY) === '1';
}

export function writeUseLoyaltyIntent(use: boolean): void {
  if (typeof window === 'undefined') return;
  if (use) window.sessionStorage.setItem(LOYALTY_KEY, '1');
  else window.sessionStorage.removeItem(LOYALTY_KEY);
}
