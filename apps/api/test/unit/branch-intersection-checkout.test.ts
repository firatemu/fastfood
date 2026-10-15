import { describe, expect, it } from 'vitest';

import { BranchService } from '../../src/modules/branch/branch.service.js';
import { RoutingService } from '../../src/modules/branch/routing/routing.service.js';
import { CartService } from '../../src/modules/cart/cart.service.js';
import { CheckoutService } from '../../src/modules/checkout/checkout.service.js';
import { PricingService } from '../../src/modules/pricing/pricing.service.js';
import { PromotionService } from '../../src/modules/promotion/promotion.service.js';

describe('Branch 10km Intersection & Routing', () => {
  it('detects overlap between two branches with 10km service circles and respects customer branch selection', async () => {
    const branches = new BranchService();
    const routing = new RoutingService();
    const carts = new CartService();
    const pricing = new PricingService();
    const promotions = new PromotionService();
    const checkout = new CheckoutService(carts, pricing, branches, routing, promotions);

    // İki şube oluşturalım: Kadıköy ve Üsküdar (~5 km mesafe, 10km servis ağları kesinlikle kesişir)
    // Şube 1: Kadıköy (40.99, 29.02)
    const b1 = await branches.createBranch({
      code: 'KDK',
      name: 'Kadıköy Şube',
      addressLine: 'Moda Cad.',
      latitude: 40.99,
      longitude: 29.02,
    });
    await branches.updateBranch(b1.id, { isAcceptingOrders: true });

    // Şube 2: Üsküdar (41.02, 29.02)
    const b2 = await branches.createBranch({
      code: 'USK',
      name: 'Üsküdar Şube',
      addressLine: 'Hakimiyeti Milliye Cad.',
      latitude: 41.02,
      longitude: 29.02,
    });
    await branches.updateBranch(b2.id, { isAcceptingOrders: true });

    // Her iki şubeye 10km dairesel alan üret
    await branches.generateServiceArea(b1.id, 10);
    await branches.generateServiceArea(b2.id, 10);

    // Kesişim noktası: İkisinin tam ortası (41.005, 29.02)
    // Bu nokta her iki şubeye de ~1.7 km mesafede olup her iki 10km alanın da içindedir.
    const intersectionLat = 41.005;
    const intersectionLng = 29.02;

    const cart = await carts.getOrCreateGuestCart('guest-overlap-1');
    await carts.addLine(cart.id, {
      productId: '01900000-0000-7000-8000-111111111111',
      quantity: 1,
      unitPriceMinorSnapshot: 25000n,
    });
    const updatedCart = (await carts.getCart(cart.id))!;

    // 1. Müşteri şube seçmeden quote aldığında:
    const quoteResult = await checkout.quote(
      updatedCart,
      { guestSessionId: 'guest-overlap-1' },
      {
        fulfillmentMode: 'DELIVERY',
        latitude: intersectionLat,
        longitude: intersectionLng,
      },
    );

    expect(quoteResult.ok).toBe(true);
    if (!quoteResult.ok) return;

    // Her iki şube de serviceableBranches listesinde bulunmalı!
    expect(quoteResult.quote.serviceableBranches).toBeDefined();
    expect(quoteResult.quote.serviceableBranches?.length).toBe(2);

    const branchIds = quoteResult.quote.serviceableBranches?.map((b) => b.branchId);
    expect(branchIds).toContain(b1.id);
    expect(branchIds).toContain(b2.id);

    // 2. Müşteri özellikle 2. şubeyi (Üsküdar) seçtiğinde:
    const quoteWithSelection = await checkout.quote(
      updatedCart,
      { guestSessionId: 'guest-overlap-1' },
      {
        fulfillmentMode: 'DELIVERY',
        latitude: intersectionLat,
        longitude: intersectionLng,
        deliveryBranchId: b2.id, // Müşterinin seçimi
      },
    );

    expect(quoteWithSelection.ok).toBe(true);
    if (!quoteWithSelection.ok) return;

    // Sipariş/quote seçilen şube olan b2'ye yönlendirilmeli!
    expect(quoteWithSelection.quote.branchId).toBe(b2.id);
    expect(quoteWithSelection.quote.branchName).toBe('Üsküdar Şube');

    // 3. Müşteri 1. şubeyi (Kadıköy) seçtiğinde:
    const quoteWithB1Selection = await checkout.quote(
      updatedCart,
      { guestSessionId: 'guest-overlap-1' },
      {
        fulfillmentMode: 'DELIVERY',
        latitude: intersectionLat,
        longitude: intersectionLng,
        deliveryBranchId: b1.id,
      },
    );

    expect(quoteWithB1Selection.ok).toBe(true);
    if (!quoteWithB1Selection.ok) return;
    expect(quoteWithB1Selection.quote.branchId).toBe(b1.id);
    expect(quoteWithB1Selection.quote.branchName).toBe('Kadıköy Şube');

    // 4. Sadece Üsküdar'ın kapsadığı nokta (Kadıköy'e 10 km'den uzak):
    // Üsküdar'a mesafe: 7.7 km (<10 km), Kadıköy'e mesafe: 11.1 km (>10 km)
    const northLat = 41.09;
    const northLng = 29.02;

    const singleBranchQuote = await checkout.quote(
      updatedCart,
      { guestSessionId: 'guest-overlap-1' },
      {
        fulfillmentMode: 'DELIVERY',
        latitude: northLat,
        longitude: northLng,
      },
    );

    expect(singleBranchQuote.ok).toBe(true);
    if (!singleBranchQuote.ok) return;
    // Sadece Üsküdar kapsamalı, Kadıköy dışarıda kalmalı!
    expect(singleBranchQuote.quote.serviceableBranches?.length).toBe(1);
    expect(singleBranchQuote.quote.branchId).toBe(b2.id);
    expect(singleBranchQuote.quote.branchName).toBe('Üsküdar Şube');
  });

  it('allows Super Admin to update branch profile and toggle accepting orders without active branch administrator', async () => {
    const branches = new BranchService();
    const branch = await branches.createBranch({
      code: 'TEST-BRANCH',
      name: 'Test Şube',
      addressLine: 'Deneme Sokak No:1',
      latitude: 41.0,
      longitude: 29.0,
    });
    // Super admin updates branch
    const updated = await branches.updateBranch(branch.id, {
      name: 'Test Şube Güncel',
      isAcceptingOrders: true,
      isSuperAdmin: true,
    });
    expect(updated.name).toBe('Test Şube Güncel');
    expect(updated.isAcceptingOrders).toBe(true);
  });
});
