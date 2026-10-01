import { formatTryMinor } from './money';
import type { CustomerBranch, PublicDeal, StorefrontContent } from './schemas';
import { parseTableCode } from './table-code';

export function branchFulfillmentLabel(branch: Pick<
  CustomerBranch,
  'isAcceptingOrders' | 'deliveryEnabled' | 'pickupEnabled'
>): string {
  const delivery = branch.deliveryEnabled !== false;
  const pickup = branch.pickupEnabled !== false;
  if (!branch.isAcceptingOrders) return 'Şu an sipariş almıyor';
  if (delivery && pickup) return 'Teslimat ve gel-al';
  if (pickup && !delivery) return 'Yalnızca gel-al';
  if (delivery && !pickup) return 'Yalnızca teslimat';
  return 'Hizmet yok';
}

export function dealEligibilityCopy(deal: PublicDeal): string {
  const parts: string[] = [];
  if (deal.eligibility === 'expired') parts.push('Süresi doldu');
  else if (deal.eligibility === 'first_order_only') parts.push('Yalnızca ilk sipariş');
  else parts.push('Uygun (checkout kesinler)');
  if (deal.branchRestricted) parts.push('Belirli şubeler');
  if (BigInt(deal.minMerchandiseMinor) > 0n) {
    parts.push(`Min. ${formatTryMinor(deal.minMerchandiseMinor, 'TRY')}`);
  }
  return parts.join(' · ');
}

export function isLegalDocument(kind: string): boolean {
  return kind === 'LEGAL' || kind === 'COMPANY' || kind === 'ALLERGEN_DISCLAIMER';
}

export function legalDocuments(docs: StorefrontContent[]): StorefrontContent[] {
  return docs.filter((doc) => isLegalDocument(doc.kind)).sort((a, b) => a.displayOrder - b.displayOrder);
}

export function allergenDisclaimer(docs: StorefrontContent[]): StorefrontContent | null {
  return docs.find((doc) => doc.kind === 'ALLERGEN_DISCLAIMER') ?? null;
}

/** Camera / clipboard payloads may be a raw code or a table deep link. */
export function parseScannedTablePayload(raw: string): string | null {
  return parseTableCode(raw.trim());
}

export const TRACKING_EXIT_HREF = '/(tabs)/orders' as const;
