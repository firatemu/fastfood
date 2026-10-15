export type FulfillmentMode = 'DELIVERY' | 'PICKUP';
export type ScheduleMode = 'asap' | 'scheduled';
export type TipPreset = 'none' | '15' | '25' | '50' | 'custom';

export const TIP_PRESET_MINOR: Record<Exclude<TipPreset, 'custom'>, string> = {
  none: '0',
  '15': '1500',
  '25': '2500',
  '50': '5000',
};

export function liraToMinor(lira: string): string {
  const trimmed = lira.trim().replace(',', '.');
  if (!trimmed) return '0';
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return '0';
  return Math.round(n * 100).toString();
}

export function tipMinorFromPreset(preset: TipPreset, customLira: string): string {
  if (preset === 'custom') return liraToMinor(customLira);
  return TIP_PRESET_MINOR[preset];
}

export function buildCheckoutQuotePayload(input: {
  fulfillmentMode: FulfillmentMode;
  latitude: number;
  longitude: number;
  pickupBranchId: string | null;
  deliveryBranchId?: string | null;
  couponCode: string;
  tipMinor: string;
  scheduledFor: string | null;
  scheduleMode: ScheduleMode;
  ecoPackaging: boolean;
  contactless: boolean;
  deliveryNote: string;
  buildingAccessCode: string;
  guestName: string;
  guestPhone: string;
  checkoutSessionId?: string;
  addressLabel: string;
  loyaltyRequestedMinor?: string | null;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    fulfillmentMode: input.fulfillmentMode,
    tipMinor: input.tipMinor,
    ecoPackaging: input.ecoPackaging,
    contactless: input.fulfillmentMode === 'DELIVERY' ? input.contactless : false,
    buildingAccessCode: input.buildingAccessCode.trim() || null,
    deliveryNote: input.deliveryNote.trim() || null,
    guestName: input.guestName.trim() || null,
    guestPhone: input.guestPhone.trim() || null,
    addressLabel: input.addressLabel.trim() || null,
    scheduledFor: input.scheduleMode === 'scheduled' ? input.scheduledFor : null,
  };
  if (input.fulfillmentMode === 'DELIVERY') {
    body.latitude = input.latitude;
    body.longitude = input.longitude;
    if (input.deliveryBranchId) {
      body.deliveryBranchId = input.deliveryBranchId;
    }
  } else if (input.pickupBranchId) {
    body.pickupBranchId = input.pickupBranchId;
  }
  if (input.couponCode.trim()) body.couponCode = input.couponCode.trim();
  if (input.checkoutSessionId) body.checkoutSessionId = input.checkoutSessionId;
  if (input.loyaltyRequestedMinor) {
    body.loyaltyRequestedMinor = input.loyaltyRequestedMinor;
    body.loyaltyAvailablePoints = input.loyaltyRequestedMinor;
  }
  return body;
}

export function operationalPayMethod(
  methods: ReadonlyArray<{ code: string; available: boolean }>,
): string {
  const hosted = methods.find((item) => item.code === 'iyzico_hosted' && item.available);
  return hosted?.code ?? 'iyzico_hosted';
}

export function paymentInitIdempotencyKey(checkoutSessionId: string): string {
  return `m3-${checkoutSessionId}`;
}
