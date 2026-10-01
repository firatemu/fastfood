import type { Favorite, ReorderResult, SpinPlay, SupportMessage } from './schemas';

export function reorderHeadline(status: ReorderResult['status']): string {
  if (status === 'success') return 'Sepete eklendi';
  if (status === 'partial') return 'Kısmen eklendi';
  return 'Tekrar sipariş yapılamadı';
}

export function reorderOpensCart(result: ReorderResult): boolean {
  return result.status === 'success' || result.restoredCount > 0;
}

export type FavoriteAvailability = 'available' | 'unavailable' | 'inactive' | 'missing';

export function favoriteAvailability(product: Favorite['product']): FavoriteAvailability {
  if (!product) return 'missing';
  if (!product.isActive) return 'inactive';
  if (!product.isAvailable) return 'unavailable';
  return 'available';
}

export function favoriteForProduct(favorites: Favorite[], productId: string): Favorite | undefined {
  return favorites.find((item) => item.productId === productId);
}

export function clubProgressPercent(progressBps: number): number {
  if (!Number.isFinite(progressBps)) return 0;
  return Math.max(0, Math.min(100, Math.round(progressBps / 100)));
}

export function clubActivityLabel(reason: string | null, type: string): string {
  if (reason === 'welcome_reward') return 'Hoş geldin ödülü';
  if (reason === 'spin_reward') return 'Ateş Çarkı';
  if (reason === 'order_earn') return 'Sipariş puanı';
  if (reason === 'redeemed') return 'Checkout kullanımı';
  if (reason === 'released') return 'Puan iadesi';
  if (type === 'EARNED') return 'Puan kazancı';
  if (type === 'REDEEMED') return 'Puan kullanımı';
  return 'Hareket';
}

export function welcomeRewardCopy(status: string, promotionCode: string | null): string | null {
  if (status === 'AVAILABLE') {
    return `Hoş geldin indirimi checkout’ta uygulanır${promotionCode ? ` · ${promotionCode}` : ''}.`;
  }
  if (status === 'APPLIED') return 'Hoş geldin indirimi bu siparişte uygulandı.';
  if (status === 'USED') return 'Hoş geldin ödülü kullanıldı.';
  if (status === 'EXPIRED') return 'Hoş geldin ödülünün süresi doldu.';
  if (status === 'INELIGIBLE') return 'Hoş geldin ödülü bu hesap için geçerli değil.';
  return null;
}

export function spinReasonCopy(reason: string): string {
  if (reason === 'NO_CAMPAIGN') return 'Aktif çark kampanyası yok.';
  if (reason === 'ALREADY_USED') return 'Bugünkü hakkın kullanıldı.';
  if (reason === 'NO_PRIZES') return 'Kampanya ödülü tanımlı değil.';
  if (reason === 'NOT_ACTIVE') return 'Kampanya şu an aktif değil.';
  return '1 hak hazır.';
}

export function spinResultCopy(play: SpinPlay): string {
  const prize = play.prize.label;
  if (play.replayed) return `Önceki sonuç: ${prize}`;
  return `Kazandın: ${prize}`;
}

const SUPPORT_BODY_MAX = 2000;

export function clampSupportBody(body: string): string {
  return body.trim().slice(0, SUPPORT_BODY_MAX);
}

export function isSystemSender(senderType: string): boolean {
  return senderType.toUpperCase() === 'SYSTEM';
}

export function dedupeSupportMessages(messages: SupportMessage[]): SupportMessage[] {
  const seen = new Set<string>();
  const out: SupportMessage[] = [];
  for (const message of messages) {
    if (seen.has(message.id)) continue;
    seen.add(message.id);
    out.push(message);
  }
  return out;
}

export function newClientRequestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
