# FASTFOOD — Production Readiness & Architectural Audit

> **Kapsam:** Backend (NestJS 12 / Fastify), Frontend (Next.js 16 ×4 + React Native/Expo ×2), Veritabanı (PostgreSQL 18 + PostGIS 3.6 / Prisma 7)
> **Tarih:** 2026-10-22
> **Yöntem:** Statik kod + migration SQL analizi + canlı gate koşulları (exit code kanıtlı)
> **Verdict:** `FULL_PROJECT_TECHNICALLY_COMPLETE_READY_FOR_HUMAN_TEST` — ancak **P0 bloklar kapatılmadan prod güvenliği garanti edilemez**

---

## 0. Yönetici Özeti

FASTFOOD mimarisi **kurumsal hedefin doğru yönünde** ilerliyor: monorepo sınırları temiz, bağımlılık yönü tek (contracts → api → apps), para birimi `BigInt` kuruş olarak, UUIDv7 PK, Zod sözleşmeleri tek kaynaktan, transactional outbox altyapısı mevcut, RBAC + branch scope guard'ları yazılı. Bu, "kurumsal bir yapıdan uzak" kategorisinde değil.

Ancak denetimde **gerçek ve prod'da maliyeti yüksek olan 6 adet P0 (bloklayıcı)**, **9 adet P1 (yüksek)** ve **14 adet P2 (orta)** kusur tespit edildi. Bunların önemli bir kısmı **raporlanan tamamlanma durumuna (`PROJECT_STATUS.md` → "TECHNICALLY COMPLETE", `FULL_PROJECT_AUTONOMOUS_COMPLETION_REPORT.md` → tüm gate'ler PASS) rağmen mevcut**. Bu, "teknik olarak tamamlandı" beyanının mevcut kod tabanındaki kanıtla örtüşmediği anlamına gelir.

**Kritik gerçek:** `pnpm format:check` → 379 dosya hizalı değil (exit 1), `pnpm lint` → 1 uyarı (exit 1), `pnpm test:unit --force` → 1 test başarısız (exit 1), `pnpm build` → Google Fonts ağ hatası (exit 1). Bunlar "tamamlandı / PASS" denilen bir projede **regresyon** durumudur; aşağıdaki P0/P1 düzeltmeleriyle birlikte kapatılmalıdır.

### Öncelik matrisi (özet)

| Öncelik | Adet | Tema | Prod Etkisi |
| --- | --- | --- | --- |
| **P0 — Bloklayıcı** | 6 | Finansal bütünlük, fiyat güveni, oturum güvenliği, veri bütünlüğü | Para kaybı / XSS / sessiz veri bozulması |
| **P1 — Yüksek** | 9 | Eşzamanlılık, referans bütünlüğü, idempotency, arka plan işleri | Çift sipariş / çift iade / rapor hatası |
| **P2 — Orta** | 14 | Performans, gözlemlenebilirlik, güvenlik sertleştirme, kod kalitesi | Yavaşlama / operasyonel risk |
| **P3 — Düşük** | 8 | DevEx, test kapsamı, dokümantasyon | Ekip verimliliği |

---

## 1. Kanıt: Çalıştırılan Gate'ler

Bu denetimde **fiilen çalıştırılan** komutlar ve exit code'ları:

| Komut | Exit | Gözlenen Çıktı |
| --- | --- | --- |
| `pnpm format:check` | **1** | `Code style issues found in 379 files` |
| `pnpm lint` | **1** | `@fastfood/customer-mobile:lint` → `216:6 warning React Hook useEffect has a missing dependency: 'deliveryBranchId'` → `ESLint found too many warnings (maximum: 0)` |
| `pnpm typecheck` | **0** | `Tasks: 30 successful, 30 total` |
| `pnpm test:unit --force` | **1** | `@fastfood/dev-controller` → `hv-reconciliation-parser.test.ts` → `1 failed | 192 passed (193)` |
| `pnpm build` | **1** | `@fastfood/storefront-web:build` → `Failed to fetch Anton from Google Fonts` / `Failed to fetch Plus Jakarta Sans from Google Fonts` (Turbopack build failed, 2 errors) |
| `pnpm db:validate` | **0** | `The schema at prisma/schema.prisma is valid` |

**NOT RUN:** `pnpm test:integration`, `pnpm --filter @fastfood/e2e-web exec playwright test` — Docker daemon bu ortamda erişilemedi (`failed to connect to the docker API at unix:///var/run/docker.sock`), PostgreSQL/Redis ayağa kalktırılamadı. Bu gate'ler **yeniden çalıştırılmalıdır**; P0-1/P1-1 gibi DB düzeyli düzeltmeler yalnızca gerçek Postgres üzerinde kanıtlanabilir.

### Kapsam ölçümleri

| Metrik | Değer |
| --- | --- |
| TypeScript/TSX satır sayısı (node_modules/dist/generated hariç) | ~137.847 |
| Prisma model | 81 |
| Migration | 27 |
| Birim test dosyası | 137 (`apps/api` 52, `packages` 36, `customer-mobile` 32, `storefront-web` 14, `admin-web` 10, `qr-menu` 1, `courier-mobile` 1, **`courier-web` 0**) |
| Playwright spec | 16 (`tests/e2e/tests/`) |
| Etkin FK constraint'li tablo | 58 / 81 |
| FK'si hiç olmayan tablo | 23 |
| `CHECK` constraint (tüm migration'lar) | **1** |

---

## 2. P0 — Bloklayıcı Kusurlar

### P0-1 · İade (refund) kaydı siparişe bağlanmıyor → finansal raporlar kalıcı olarak yanlış

**Dosya:** `apps/api/src/modules/refund/refund.service.ts:149-152`

```typescript
const row = await this.prisma.refund.create({
  data: {
    paymentId: input.paymentId,
    orderId: null,        // ← sipariş bağı yok
    amountMinor: input.amountMinor,
    ...
```

**Etki.** Prisma yolunda iade kaydı `orderId = null` ile yazılıyor. `ReportingService.sales()` (`apps/api/src/modules/reporting/reporting.service.ts:87-92`) iadeleri `orderId IN (branch siparişleri)` ile filtreliyor:

```typescript
const refunds = await this.prisma.refund.findMany({
  where: {
    status: { not: 'FAILED' },
    ...(branchIds ? { orderId: { in: orders.map((order) => order.id) } } : {}),
  },
```

`orderId` null olduğu için **brancha göre raporlanan tüm iadeler 0 TRY görünür** — `netMinor` = `grossMinor` kalır. Yani **yapılan her iade ciro raporunda görünmez**. Aynı hata `coupon_redemptions` için de geçerli: `redemptions` sayacı `orderId` ile ilişkilendirilmediği için kullanım limitleri sipariş bazında denetlenemiyor.

Ek olarak: iade kaydı **ödeme sağlayıcısına (iyzico) hiç gitmiyor**. `PaymentPort` arayüzünde `refund()` metodu yok (`apps/api/src/modules/payment/payment.port.ts`). `RefundService.create()` DB'ye `status: 'SUCCEEDED'` yazar — yani **gerçek para iadesi hiç yapılmadan "başarılı" işaretleniyor**. `AuditLog` da yazılmıyor (`prisma-audit-log.writer.ts` yalnızca `courier-admin`, `staff-auth`, `admin-user` servislerinde çağrılıyor; refund akışında yok).

**Düzeltme.**
1. `PaymentPort`'a `refund(input: { providerPaymentId; amountMinor; idempotencyKey }): Promise<PaymentRefundResult>` ekle; `IyzicoCheckoutFormAdapter` implementasyonu yaz.
2. `RefundService.create()` akışı: `payment → order` FK'si ile siparişi türet (`payment.checkoutSessionId → checkout_sessions.orderId`), sağlayıcı çağrısı, **sonra** DB kaydı (status `PENDING` → sağlayıcı onayı → `SUCCEEDED`).
3. Aynı transaction içinde `auditLog.create()` (action `payment.refund`, resourceType `refund`).
4. `orderId` DB düzeyinde NOT NULL + FK yap (bkz. P1-3).

---

### P0-2 · Sepet fiyatı istemciden gelen değere güveniyor → fiyat manipülasyonu

**Dosya:** `apps/api/src/modules/cart/cart-validation.service.ts:54`

```typescript
return {
  productId: input.productId,
  productVariantId: input.productVariantId,
  quantity: input.quantity,
  unitPriceMinor: input.unitPriceMinorSnapshot ?? product.basePriceMinor,  // ← client wins
  currency: input.currencySnapshot ?? product.currency,
};
```

**Etki.** `POST /cart/lines` şeması `unitPriceMinorSnapshot` ve `priceDeltaMinorSnapshot` alanlarını istemciden kabul ediyor (`apps/api/src/modules/cart/cart.controller.ts:36,43`). Doğrulama yalnızca `product.isActive` ve `quantity > 0` kontrol ediyor. Bu snapshot değerleri:

- `checkout.service.ts:328-329` → `merchandiseGrossSubtotalMinor` hesabında,
- `checkout.service.ts:377-379` → `baseUnitPriceMinor` olarak pricing engine'e,
- `checkout.service.ts:623` → **`finalPayableMinor`** hesabında,
- `checkout.service.ts:529-549` → kalıcı `order_items.unit_price_minor_snapshot` alanında

kullanılıyor. Yani **istemci `unitPriceMinorSnapshot: "1"` göndererek 1 kuruşluk ürün sipariş edebilir**. Kontrol `payment.controller.ts:104-110` var ama **o aşamada `session.finalPayableMinor` zaten istemci fiyatından hesaplanmıştır**; sunucu "authoritative quote" dediği değer zehirlenmiştir. Aynı şekilde `priceDeltaMinorSnapshot` (modifikasyon ücret farkı) hiç doğrulanmıyor — negatif değer bile kabul ediliyor (`/^-?\d+$/` regex'i).

**Düzeltme.**
1. `CartValidationService.validate()` **her zaman** katalogdan fiyat çeksin: `product.basePriceMinor`, `productVariant.priceMinor` (varyant varsa), her `modifierId` için `modifier.priceDeltaMinor` — istemciden gelen snapshot'ları **hiçbir koşulda kullanmayın**.
2. `CartLineModifier.priceDeltaMinorSnapshot` şemasını `z.string().regex(/^\d+$/)` yapın (negatif yasak).
3. `CheckoutService` snapshot'ları **yeniden hesaplasın** (`#repriceCartLines(cart)`) — sepet→checkout arası fiyat kayması (ürün fiyatı değişti) da yakalansın.
4. `checkout` ve `payment` akışlarında "sunucu fiyatı = istemci fiyatı" kontrolü **katalog yeniden okumasından sonra** yapılsın.

---

### P0-3 · Refresh token'ları `localStorage`'da → XSS ile token hırsızlığı

**Dosyalar:**
- `apps/storefront-web/src/lib/api.ts:34-44` (`ff_customer_refresh`)
- `apps/admin-web/src/lib/api.ts:11-30` (`ff_staff_access_token`, `ff_staff_refresh_token`)

```typescript
export function getCustomerRefreshToken(): string | undefined {
  return window.localStorage.getItem(CUSTOMER_REFRESH_KEY) ?? undefined;
}
export function setCustomerSession(customerId: string, refreshToken: string): void {
  window.localStorage.setItem(CUSTOMER_ID_KEY, customerId);
  window.localStorage.setItem(CUSTOMER_REFRESH_KEY, refreshToken);
}
```

**Etki.** `localStorage` JavaScript ile okunabilir; tek bir XSS, üstelik **30 gün** (`REFRESH_SESSION_TTL_DAYS: 30`) geçerli olan müşteri refresh token'ını ve **15 dakika** yenilenen admin access token'ını ele geçirir. Admin panelinde `localStorage`'a yazılan access token, XSS ile **RBAC korumalı tüm admin uçlarının** ele geçirilmesi anlamına gelir.

**Karşılaştırma — proje içi tutarsızlık:** Staff tarafında refresh token **zaten HttpOnly cookie** ile taşınıyor (`apps/api/src/modules/auth/staff/staff-auth.controller.ts:87-95`, `sessionCookie(...; HttpOnly; SameSite=Lax; Secure)`) ve `POST /auth/staff/refresh` cookie'den okuyor (`:341-342`). **Müşteri** tarafı ise cookie kullanmıyor (`customer-auth.controller.ts` içinde hiç `cookie` referansı yok) ve refresh token'ı body ile alıyor. Mobil taraf doğru: `expo-secure-store` (`apps/customer-mobile/lib/session.ts`).

**Düzeltme.**
1. `POST /auth/customer/*` (login/register/oauth callback) refresh token'ı **`HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth/customer`** cookie olarak setsin, JSON body'den **çıkarsın**.
2. `POST /auth/customer/refresh` cookie'yi okusun; body fallback'i yalnızca **native mobil** için kalsın (`X-Client-Platform: mobile` header'ı ile ayrıştırılabilir).
3. `apps/storefront-web/src/lib/api.ts` ve `apps/admin-web/src/lib/api.ts` → refresh token `localStorage`'dan **tamamen kaldırılmalı**; access token yalnızca **bellekte** (`useRef`/modül-scope) tutulmalı.
4. `Next.js` `next.config.mjs` → `headers()` ile CSP (`script-src 'self' 'nonce-…'`), `frame-ancestors 'none'`, `HSTS`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` eklensin (bkz. P2-6).

---

### P0-4 · `orders` tablosunda hiç foreign key yok → orphan ve finansal kopukluk

**Kanıt.** Tüm migration'lar (27 adet) tarandı; `orders` tablosu için **tek bir `FOREIGN KEY` constraint yok**:

```
orders -> --- NO FK ---
```

DDL (`apps/api/prisma/migrations/00000000000006_phase7_order_notifications/migration.sql`):

```sql
CREATE TABLE "orders" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "user_id" UUID,
  "branch_id" UUID,
  "checkout_session_id" UUID,
  ...
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
```

Prisma şemasında da `Order` modelinin `userId`/`branchId` alanlarında **relation tanımı yok** (`apps/api/prisma/schema.prisma`, `model Order` bloğu — satır 1000+; `User` modelinde `orders Order[]` back-relation da yok).

**Etki.** `orders.user_id` ve `orders.branch_id` serbest metin UUID tutar; kullanıcı silinse bile sipariş kalır (bu istenen olabilir), ancak **hiçbir garanti yok**: yazılabilir `branch_id`, olmayan bir şubeye işaret edebilir. Finansal raporlama `orders.branchId` üzerinden filtreliyor (`reporting.service.ts:84`) → yanlış şube cirosu. `checkout_sessions` → `orders` bağı da FK değil, sadece uygulama seviyesinde (`checkout.service.ts:593` `checkoutSessionId`).

**Ayrıca:** `loyalty_ledger_entries`, `loyalty_reservations`, `checkout_sessions`, `notifications`, `courier_profiles`, `promotions`, `roles`, `permissions`, `idempotency_records`, `spin_campaigns`, `users` gibi **23 tablonun hiç FK'si yok**.

**Düzeltme.**
1. Yeni migration: `orders.user_id → users(id) ON DELETE SET NULL`, `orders.branch_id → branches(id) ON DELETE RESTRICT`, `orders.checkout_session_id → checkout_sessions(id) ON DELETE SET NULL`.
2. `loyalty_ledger_entries.user_id → users(id) ON DELETE CASCADE` + `.reservation_id → loyalty_reservations(id) ON DELETE SET NULL` + `.order_id → orders(id) ON DELETE SET NULL`.
3. `loyalty_reservations.user_id → users(id) ON DELETE CASCADE` + `.checkout_session_id → checkout_sessions(id) ON DELETE SET NULL`.
4. `checkout_sessions.user_id → users(id)`, `.cart_id → carts(id)`, `.branch_id → branches(id)`, `.order_id → orders(id) ON DELETE SET NULL`.
5. **Prisma şeması ile migration'lar senkronize edilmelidir** — `schema.prisma` içinde `relation` tanımı olmadan FK eklenirse `prisma migrate diff` drift üretir (P1-3).

---

### P0-5 · `loyalty` bakiyesi kilitlenmeden okunuyor → double-spend (çift puan harcama)

**Dosya:** `apps/api/src/modules/loyalty/loyalty.service.ts:182-193`

```typescript
async getBalance(userId: string): Promise<bigint> {
  const rows = await this.prisma.loyaltyLedgerEntry.findMany({
    where: { userId },
    select: { pointsDelta: true },
  });
  return rows.reduce((sum, r) => sum + r.pointsDelta, 0n);
}
```

**Etki.** `reserve()` (`:195-262`) önce `getBalance()` çağırıyor, sonra **ayrı bir transaction'da** `loyaltyReservation` + `loyaltyLedgerEntry` (RESERVE, negatif delta) yazıyor. İki eşzamanlı checkout aynı anda `getBalance()` çağırırsa ikisi de aynı bakiyeyi görür → **ikisi de puanı reserve eder** → kullanıcı sahip olmadığı puanı harcar. `loyalty_ledger_entries` üzerinde satır kilidi (`FOR UPDATE`) veya advisory lock yok; `users` satırı da kilitlenmiyor.

Ek olarak: bakiye **her sorguda tüm ledger satırlarını okuyup topluyor** (`findMany` + `reduce`) — kullanıcının ledger'ı büyüdükçe O(n) maliyet, index `@@index([userId, createdAt])` var ama `SUM()` aggregate'i kullanılmıyor.

**Düzeltme.**
1. `reserve()`'ı **tek transaction**'a al: önce `SELECT ... FROM users WHERE id = ? FOR UPDATE` (veya `pg_advisory_xact_lock(hashtext(userId))`), sonra bakiye hesabı, sonra reservation + ledger yazımı.
2. Bakiyeyi `loyalty_ledger_entries` üzerinde `aggregate({ _sum: { pointsDelta: true } })` ile oku (`findMany` yerine).
3. `release()` / `redeem()` akışlarını da aynı kilit sırasına sok.

---

### P0-6 · `PAYMENT_GATEWAY=simulated` üretimde engellenmiyor — ödeme simülatörü canlıya alınabilir

**Dosya:** `apps/api/src/modules/payment/payment.module.ts:17-19`

```typescript
function createPaymentPort(): PaymentPort {
  // Test modules boot without a full environment; only the iyzico gateway needs it.
  if (process.env['PAYMENT_GATEWAY'] !== 'iyzico') return new SimulatedPaymentAdapter();
```

**Etki.** `SimulatedPaymentAdapter.acceptsClientAssertedStatus = true` (`simulated-payment.adapter.ts:19`) ve `IyzicoIntegrationController.handleProviderEvent()` bu bayrakı görünce **istemcinin gönderdiği `status` alanına güveniyor**:

```typescript
const attempt = this.payments.acceptsClientAssertedStatus
  ? await this.payments.applyProviderStatus(providerPaymentId, parsed.data.status ?? 'PAID')
  : await this.payments.verifyByProviderPaymentId(providerPaymentId);
```

Yani **`POST /integrations/iyzico/webhook` çaresiz bir saldırgan tarafından "PAID" gövdesiyle çağrılırsa sipariş ödemesiz olarak PAID işaretleniyor.**

`packages/config/src/schemas.ts:121-124` içinde production'da `simulated` reddi var — **ama bu kontrol `getAppConfig()` içinde**, `payment.module.ts` ise **`process.env['PAYMENT_GATEWAY']` okuyor** ve config doğrulamasını **atlamış** olabilir. Ayrıca kontrol `NODE_ENV === 'production'` ise uygulanıyor; staging/preview ortamlarında (production olmayan ama gerçek trafik alan) koruma yok.

**Düzeltme.**
1. `payment.module.ts` **config nesnesini** kullansın: `getAppConfig().PAYMENT_GATEWAY` (doğrulanmış, `NODE_ENV` ile ilişkili), `process.env` doğrudan okumasın.
2. `SimulatedPaymentAdapter` boot sırasında `NODE_ENV === 'production'` ise **fatal hata** versin (fail-fast), yalnızca `NODE_ENV !== 'production'` ve `ALLOW_DEV_MFA_BYPASS`-tarzı ikinci bir açık bayrakla aktif olsun.
3. `PAYMENT_GATEWAY` zorunlu olsun (`simulated` yalnızca `development`/`test`), `staging`/`production` için `iyzico` **zorunlu** ve `config` bunu zorlasın.

---

## 3. P1 — Yüksek Öncelikli Kusurlar

### P1-1 · Sipariş numarası üretimi yarış koşulu → duplicate key / 500 hatası

**Dosya:** `apps/api/src/modules/order/order.service.ts:454-462`

```typescript
async #nextDisplayNumber(): Promise<string> {
  const latest = await this.prisma.order.findFirst({
    where: { displayNumber: { startsWith: 'SP' } },
    orderBy: { displayNumber: 'desc' },
    select: { displayNumber: true },
  });
  return bumpDisplayNumber(latest?.displayNumber ?? null);
}
```

**Etki.** `display_number` üzerinde **UNIQUE index** var (`migration 00000000000017_order_display_number`: `CREATE UNIQUE INDEX "orders_display_number_key"`). İki eşzamanlı sipariş aynı `SP#####` değerini hesaplar → biri `PrismaClientKnownRequestError` (P2002) alır → **500 Internal Server Error**, kullanıcının ödemesi alınmış ama sipariş oluşmamış olur (checkout `finalizePaid` → `orders.create` içinde). Kilit, advisory lock veya sequence yok.

**Düzeltme.**
1. PostgreSQL sequence: `CREATE SEQUENCE order_display_number_seq;` + `display_number` default'ı `('SP' || lpad(nextval('order_display_number_seq'), 5, '0'))`.
2. Prisma şemasında `@default(dbgenerated(...))` ile bağla; `bumpDisplayNumber` mantığı sequence'a devredilsin.
3. Alternatif (sequence istenmiyorsa): `pg_advisory_xact_lock()` ile serialize + `FOR UPDATE` ile son numarayı kilitle.

---

### P1-2 · Sipariş durum geçişlerinde optimistic locking yok → lost update

**Dosya:** `apps/api/src/modules/order/order.service.ts:1022-1046` ve `:1276-1300`

```typescript
async transition(orderId: string, input: TransitionOrderInput): Promise<OrderDto> {
  const order = await this.get(orderId);                 // ← okuma
  if (!canTransition(order.status, input.toStatus)) { ... } // ← kontrol (okuma ile yarış)
  ...
  return this.#setStatusDb(orderId, input.toStatus, ...);
}
// #setStatusDb:
await prisma.$transaction(async (tx) => {
  await tx.order.update({ where: { id: orderId }, data: { status: toStatus } });  // ← koşulsuz yazma
```

**Etki.** `canTransition` kontrolü **ayrı bir SELECT** üzerinden yapılıyor; ardından UPDATE `WHERE id = ?` ile (versiyon/`status` koşulu olmadan) çalışıyor. İki eşzamanlı mutasyon (örn. mutfak `PREPARING` + kuryer `COURIER_ASSIGNED`) arasında **geçersiz durum oluşabilir** (`PREPARING → COURIER_ASSIGNED` state machine'de yasak). `order_events` tablosu iki farklı `fromStatus` kaydı yazar → **denetim izi tutarsız**, timeline bozuk.

**Düzeltme.**
1. `order_events` kaydı **aynı transaction içinde** ve `SELECT ... FOR UPDATE` ile: `tx.$queryRaw` ile `SELECT status FROM orders WHERE id = ? FOR UPDATE`.
2. UPDATE'i koşullu yap: `UPDATE orders SET status = $to WHERE id = $id AND status = $from` → 0 satır dönerse 409 (`ORDER_INVALID_TRANSITION`).
3. Alternatif: `version` kolonu (`Int @default(0)`) + optimistic locking.

---

### P1-3 · Prisma şeması ile migration SQL'i **senkron değil** → drift ve "veritabanı bozuk" riski

**Kanıt.**

| Ölçüm | Değer |
| --- | --- |
| `schema.prisma` içindeki `@relation(fields: ...)` | **71** |
| Migration'lardaki gerçek `FOREIGN KEY` constraint | **78** (ama çok sayısı aynı) |
| Etkin FK'si olmayan tablo | **23** |
| `CHECK` constraint (tüm repo) | **1** (`20260927120000_customer_address_geography`) |

**Somut drift örneği.** `20260922143150_order_pickup_tokens` migration'ı 35 adet `DROP CONSTRAINT` yapıyor ve 27'sini geri ekliyor. **8 tanesi hiç geri eklenmiyor:**

```
audit_logs.audit_logs_actor_user_id_fkey
business_settings.business_settings_updated_by_user_id_fkey
cart_line_items.cart_line_items_product_id_fkey
cart_line_items.cart_line_items_product_variant_id_fkey
cart_line_modifiers.cart_line_modifiers_modifier_id_fkey
cart_line_removals.cart_line_removals_ingredient_id_fkey
carts.carts_user_id_fkey
user_roles.user_roles_granted_by_user_id_fkey
```

Bu migration'ın neden yaptığına dair yorum dosyada yok — ama sonuç net: **`audit_logs.actor_user_id` artık FK'siz**, yani `actor_user_id` dolu bir satır, kullanıcı tablosunda karşılığı olmayan bir UUID'yi gösterebilir (denetim izi bozulması).

**Etki.** `prisma migrate dev`/`deploy` sırasında Prisma, şema ile migration'ın uyuşmadığını görür ve **"drift detected"** hatası verir — yani production'da migration pipeline'ı kırılır. Ayrıca Prisma'nın `relation` tanımları olmayan tablolarda referans bütünlüğü **uygulama seviyesinde** kalır; bir `prisma db push`/`migrate reset` sonrası beklenmedik FK'ler oluşabilir.

**Düzeltme.**
1. `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma` ile **kanonik drift raporu** üret ve 8 düşen FK'yi geri ekleyen yeni migration yaz.
2. `Order`, `CheckoutSession`, `LoyaltyLedgerEntry`, `LoyaltyReservation`, `Refund.orderId` alanlarına Prisma `relation` tanımları ekle (P0-4 ile aynı migration).
3. CI'a **`prisma migrate diff` drift kontrolü** ekle (şema değişikliği migration karşılığı olmadan merge edilmesin).
4. **Money alanlarına `CHECK` constraint'ler ekle**: `amount_minor > 0`, `quantity > 0`, `discount_percent_bps BETWEEN 0 AND 10000`, `points_delta` işareti `entry_type` ile tutarlı.

---

### P1-4 · Idempotency scope'u checkout/user ile çoğaltılmıyor → çapraz çakışma

**Dosya:** `apps/api/src/modules/payment/payment.service.ts:105, 139, 178`

```typescript
const hit = await this.idempotency.lookup('payment.initialize', input.idempotencyKey);
```

**Etki.** Scope sabit `'payment.initialize'`. Storefront idempotency key'i `sf-${checkoutSessionId}` (`apps/storefront-web/src/lib/storefront/checkout.ts:107`) — bu **iyi** (checkout-scoped). Ama `payment_attempts.idempotency_key` kolonu **UNIQUE** ve **global** (`schema.prisma`: `idempotencyKey String @unique`). Yani iki farklı checkout, istemci tarafında aynı key üretirse (ya da saldırgan bilinçli olarak `idempotencyKey: "abc"` gönderirse) **ikinci ödeme `P2002` ile 500 alır**. Buna karşılık idempotency tablosu checkout'a göre scope'lanmadığı için **farklı bir checkout'ın aynı key'i, başka bir checkout'ın ödeme sonucunu replay edebilir** (`hit.response` başka checkout'a yazılır).

**Ayrıca:** `idempotency_records` tablosunda `expires_at` var ama **temizlik job'ı yok** — tablo sürekli büyür.

**Düzeltme.**
1. Scope'u `payment.initialize:${checkoutSessionId}` yap; ayrıca `buyerUserId` (veya guest session) hash'ini scope'a dahil et.
2. `payment_attempts.idempotency_key` UNIQUE'ini `(checkout_session_id, idempotency_key)` kompozit unique'e çevir.
3. `IdempotencyService.lookup()`'a **request hash** karşılaştırması ekle: aynı key farklı payload → `IDEMPOTENCY_KEY_REUSED` hatası (409).
4. Worker/cleanup job: `DELETE FROM idempotency_records WHERE expires_at < now()` (günlük).

---

### P1-5 · Outbox event türlerinin yalnızca 4'ü ele alınıyor → sürekli dead-letter

**Dosya:** `apps/api/src/common/outbox/outbox-consumer.service.ts:69-74`

```typescript
static readonly KNOWN_EVENT_TYPES: readonly string[] = [
  'OrderStatusChanged',
  'OrderBranchAssigned',
  'CartLineAdded',
  'CartLineRemoved',
];
```

**Etki.** Üretim kodunda 5 farklı event tipi yazılıyor:

| Event | Yazıldığı yer | Consumer'da handler var mı? |
| --- | --- | --- |
| `OrderStatusChanged` | `order-outbox.service.ts:31` | ✅ |
| `OrderBranchAssigned` | `order-outbox.service.ts:60` | ✅ |
| `CartLineAdded` | `cart-outbox.service.ts:29` | ✅ |
| `CartLineUpdated` | `cart-outbox.service.ts:57` | ❌ **YOK** |
| `CartLineRemoved` | `cart-outbox.service.ts:82` | ✅ |

`CartLineUpdated` için handler bulunmadığında `#dispatch()` (`:145-160`) hatayı kaydedip **retry + backoff** uygular; `OUTBOX_CONSUMER_MAX_ATTEMPTS` (10) dolunca **dead-letter**. Yani **her sepet satırı güncellemesi 10 deneme + üstel backoff (max 300 sn) üretir** → `outbox_events` tablosu şişer, dispatch gecikir, gerçek iş mantığı hiç çalışmaz (handler'lar zaten "no side effect attached yet" loglayan no-op'lar — `:56-63`).

**Düzeltme.**
1. `CartLineUpdated` için handler ekle.
2. `KNOWN_EVENT_TYPES` yerine **katalog tablosu** kullan: her event tipi için `{ handler, sideEffect }` tanımı; tanımsız tip için **dead-letter'e düşmek yerine** `quarantined` durumuna alın ve **metric** üret.
3. Handler'lara **gerçek yan etkileri** bağla (bildirim gönderimi, analytics, loyalty ödülü).
4. `outbox_events` için **outbox → side effect** sözleşmesini dokümante et (document 17).

---

### P1-6 · Worker process placeholder — arka plan işleri hiç çalışmıyor

**Dosya:** `apps/worker/src/main.ts`

```typescript
const placeholder = createQueue('phase0-placeholder');
const placeholderCount = await placeholder.getJobCounts();
logger.info({ jobs: placeholderCount }, 'phase0:placeholder queue ready');

await app.close();
await placeholder.close();
await redis.quit();
```

**Etki.** Worker **açılıp kapanıyor**. Planlanan tüm arka plan işleri yok:
- **Loyalty `order_earn`** — `order_earn` ledger sebebi `club.config.ts:45`'te tanımlı ve `loyalty.service.ts:144`'te normalize ediliyor, ama **`DELIVERED` durumuna geçişte hiçbir yerde `loyalty.credit(...)` çağrısı yok** (aramada `order_earn` yalnızca config + normalizer'da). Kullanıcı puan kazanamıyor.
- **Bildirim gönderimi** — `NotificationService.send()` DB'de `status: 'SENT'` yazıyor ama **gerçek push/e-posta/SMS gönderimi yok** (`notification.service.ts:71-86`).
- **Fatura/e-fatura üretimi** — yok.
- **Session/idempotency temizliği** — yok (bkz. P1-4).
- **Outbox consumer** — API process içinde çalışıyor (`outbox-consumer.service.ts`), worker'da değil.

Bu, `FULL_PROJECT_AUTONOMOUS_COMPLETION_REPORT.md`'in "Phase 10 TECHNICALLY COMPLETE" beyanıyla **çelişiyor**.

**Düzeltme.**
1. Worker'ı gerçek iş yüküyle doldur: `notification`, `payment-reconciliation`, `maintenance` (session/idempotency/outbox cleanup) queue'ları + worker'lar.
2. `loyalty.credit({ reason: 'order_earn' })` çağrısını `OrderService`'in `DELIVERED` geçişine bağla (outbox event'i ile: `OrderDelivered`).
3. `NotificationService.send()` gerçek kanal adaptörlerine (FCM/SMTP/SMS) devredilsin; sağlayıcı yoksa `status: 'PENDING'` kalsın.
4. Worker health/readiness endpoint + `docker-compose` profili.

---

### P1-7 · Loyalty `order_earn` hiç tetiklenmiyor → müşteri puan kazanamıyor

*Yukarıda P1-6'nın bir alt-bulgusu; bağımsız etkisi nedeniyle ayrı sayıldı.*

**Kanıt.** `grep -rn "order_earn" apps/api/src` → yalnızca 2 sonuç:
- `apps/api/src/modules/loyalty/club.config.ts:45` — izinli sebep listesi
- `apps/api/src/modules/loyalty/loyalty.service.ts:144` — sebep normalizasyonu

`loyalty.credit()` çağrısı yalnızca `apps/api/src/modules/gamification/spin.service.ts:225` içinde (`spin_reward`) bulunuyor.

**Etki.** `club.config.ts` "qualification metric: lifetime *earned* points" diyor; `DEFAULT_CLUB_TIERS` eşikleri (`ATES` 500, `MASTER` 2500 puan) **hiçbir zaman doğal akışta artmıyor** → tüm müşteriler kalıcı olarak "Kor" tier'da kalıyor. `spin_reward` tek puan kaynağı.

**Düzeltme.** `OrderService`'te `DELIVERED` geçişinde, `order.finalPayableMinor` üzerinden hesaplanan puanı `loyalty.credit({ userId, points, reason: 'order_earn', entryType: 'CREDIT' })` ile yaz; outbox event'i üzerinden **idempotent** çalıştır (aynı `orderId` için tek sefer).

---

### P1-8 · PostGIS kurulu ama kullanılmıyor → mekansal sorgular uygulama belleğinde

**Dosya:** `apps/api/src/modules/branch/routing/routing.service.ts:16, 41, 78, 95, 185`

```typescript
 * uses PostGIS `ST_Contains(polygon, point)` via the spatial index
...
if (!pointInPolygon(latitude, longitude, sa.polygonGeoJson)) continue;
```

**Kanıt.** `postgis` extension **aktif** (`migration 00000000000000_enable_extensions`: `CREATE EXTENSION IF NOT EXISTS postgis;`), ancak `schema.prisma` içinde **hiçbir `geometry`/`geography` kolonu yok** — `ServiceArea.polygonGeoJson Json @db.JsonB`. Tüm konfigürasyon yorumu bunu teyit ediyor:

```typescript
// GeoJSON MultiPolygon in EPSG:4326. The Phase 4 routing engine
// uses these polygons via an in-memory point-in-polygon check.
// Production deployment with PostGIS spatial index uses the
// geometry column directly.
```

**Etki.** Şubeye atama her siparişte **tüm service area poligonlarını Node.js belleğinde ray-casting ile** tarıyor. 50 şube × 20 poligon = 1000 polyon başına ~O(n·m) nokta-kenar testi → sipariş başına on-milislaniye mertebesi CPU, event-loop bloklanması, **yatay ölçeklenemez** (her API instance'ı tüm poligonları belleğe alır). Ayrıca mesafe hesabı da **Haversine in JS** (`:185`) — `ST_DWithin` yok.

**Düzeltme.**
1. `service_areas` tablosuna `geometry(MultiPolygon, 4326)` kolonu ekle (`ST_GeomFromGeoJSON(polygon_geojson)` ile backfill) + `GIN` index.
2. Routing'i SQL'e taşı:
   ```sql
   SELECT sa.id FROM service_areas sa
   WHERE sa.branch_id = ANY($1)
     AND ST_Covers(sa.polygon, ST_SetSRID(ST_MakePoint($2,$3),4326))
   ORDER BY sa.priority DESC LIMIT 1;
   ```
3. Mesafe için `ST_DWithin(sa.polygon, point, $radius)` kullan.
4. `ServiceArea` modelini Prisma'da `Unsupported("geometry")` ile tanımla ve `prisma.$queryRaw` ile oku.

---

### P1-9 · `notification` ve `audit_logs` ilişkileri FK'siz; `loyalty_ledger_entries` bakiyesi O(n) taranıyor

*(P0-4 ve P0-5'in DB katmanındaki tamamlayıcı tarafı; bkz. migration listesi.)*

**Etki.** `notifications.user_id`, `loyalty_ledger_entries.user_id`, `loyalty_ledger_entries.order_id`, `loyalty_reservations.user_id`, `checkout_sessions.user_id/cart_id/branch_id` — hiçbiri FK'ya bağlı. Kullanıcı silme/anonimleştirme akışı referans bütünlüğü olmadan çalışıyor; GDPR silme talebinde orphan satırlar kalıyor.

---

## 4. P2 — Orta Öncelikli Kusurlar

| # | Bulgu | Kanıt | Etki | Düzeltme |
| --- | --- | --- | --- | --- |
| **P2-1** | **Uygulama genelinde rate limit yok.** `RATE_LIMIT_DEFAULT_PER_MINUTE` config'de tanımlı (120) ama **hiçbir yerde kullanılmıyor** (`grep` → yalnızca `packages/config`). `helmet`, `@fastify/rate-limit` bağımlılığı yok. | `packages/config/src/schemas.ts:100`; `apps/api/package.json` deps listesi | Login/OTP/ödeme uçları brute-force'a açık | `@fastify/rate-limit` + Redis store; `/auth/*`, `/otp/*`, `/payments/*` için route bazlı limitler. **Not:** OTP için uygulama içi `HitWindow` var (`customer-auth.service.ts:120,207`) ama **process-local** — çok instance'da etkisiz |
| **P2-2** | **Sipariş oluşturma tek transaction değil.** `order.create()` (`:362`) → ayrı `assignBranchAutomatically()` (`:427`) → ayrı `#setStatusDb()` (`:439`). | `order.service.ts:355-447` | Arada hata olursa **branch'siz / BRANCH_ASSIGNED'siz sipariş** kalır | Tek `prisma.$transaction` içinde: order + items + branch assignment + status + event + outbox |
| **P2-3** | **Outbox consumer API process içinde.** `OutboxConsumerService` API'de `setTimeout` ile polling yapıyor (`outbox-consumer.service.ts:89-121`). | `outbox-consumer.service.ts:80-96` | API ölçeklenince paralel consumer'lar çakışır (lease var, ama yine de) | Consumer'ı **worker** process'e taşı (P1-6); API yalnızca yazar |
| **P2-4** | **Idempotency/OTP rate-limit state'i process-local bellekte.** `#otpWindow`, `#passwordWindow`, `#resetWindow` → `HitWindow` instance'ları; `#otpLastRequest` Map. | `customer-auth.service.ts:117-122` | Çok instance'da limit **katlanarak** artar (korumasız) | Redis tabanlı sliding-window (`INCR` + `EXPIRE`) |
| **P2-5** | **Redis API'de hiç kullanılmıyor.** `REDIS_URL` zorunlu config, Docker Compose'da Redis var, ama API'de tek bir `redis` import'u yok. | `grep -rln "redis" apps/api/src` → sadece test dosyaları | Rate limit, cache, distributed lock için **altyapı hazır ama kullanılmıyor** — P2-1/P2-4'ün çözümü hazır | Redis'i API'ye bağla (adapter + health) |
| **P2-6** | **HTTP güvenlik header'ları yok.** `next.config.mjs` içinde `headers()` bloğu **yok** (4 app'te de); API'de `helmet` yok. | `apps/*/next.config.mjs`, `apps/api/package.json` | CSP yok → P0-3'teki XSS riski kontrolsüz; clickjacking, MIME-sniffing | `next.config` → `headers()`: CSP (nonce), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`; API → `@fastify/helmet` |
| **P2-7** | **Google Fonts build-time'dan çekiliyor.** `next/font/google` (`layout.tsx` ×3 app) → build sırasında `fonts.googleapis.com` erişimi gerekli. | Build exit 1: `Failed to fetch Anton from Google Fonts` | **CI/CD ve Docker build ağ bağımlı**; build ortamı Google'a kapalıysa **release imkânsız**. Ayrıca **KVKK/gizlilik**: kullanıcı IP'si Google'a sızıyor | `next/font/local` + font dosyalarını `public/fonts/` altında versiyonlanmış olarak tut |
| **P2-8** | **`ADMIN_VISUAL`/`A1_PUBLISHED` gibi UI kodları format/lint dışı.** 379 dosya Prettier uyumsuz; bunların çoğu `tests/e2e`, `docs/` ve yeni admin bileşenleri. | `pnpm format:check` exit 1 | **CI pipeline kırık**; `format:check` gate'i artık geçmiyor | `pnpm format` çalıştır, `.prettierignore`'u gözden geçir, CI'ı yeşile getir |
| **P2-9** | **Test kapsamı dağınık.** `courier-web` → **0 test**; `courier-mobile` → 1 test (32 lib dosyasına karşı); `qr-menu` → 1. | Test sayımı (yukarıdaki tablo) | Kurye tarafı (canlı operasyon yüzeyi) en az testli bileşen | `courier-web`/`courier-mobile` için kritik akış testleri (giriş, sipariş kabul, durum güncelleme) |
| **P2-10** | **`customer-mobile` lint warning.** `checkout.tsx:216` — `useEffect` eksik dependency `deliveryBranchId`. | `pnpm lint` exit 1, `@fastfood/customer-mobile:lint` | `--max-warnings=0` nedeniyle **tüm lint gate'i kırıyor** | Dependency'yi ekle veya `useCallback` yapısını düzelt (eslint-disable **kullanma**) |
| **P2-11** | **`dev-controller` testi kırık.** `hv-reconciliation-parser.test.ts` → `parses the canonical PROJECT_STATUS.md correctly` başarısız. | `pnpm test:unit --force` exit 1, `1 failed | 192 passed (193)` | **Unit test gate'i kırık** — CI kırmızı | Testi veya parser'ı düzelt (fixture güncellenmeli) |
| **P2-12** | **Refund akışında audit log yok.** `prisma-audit-log.writer.ts` yalnızca 3 modülde kullanılıyor. | `grep -rn "auditLog.create"` → `courier-admin.service.ts:517`, `staff-auth.service.ts:606`, `admin-user.service.ts:968` | Finansal işlemler denetlenemiyor | Refund, fiyat değişikliği, kupon kullanımı → `audit_logs` |
| **P2-13** | **`health/ready` gerçek bağımlılıkları kontrol etmiyor.** | `apps/api/src/modules/health/health.controller.ts` — `getReady()` sabit `{ status: 'ok' }` | DB/Redis/S3 çökse bile **ready** görünür → LB trafiği ölü instance'a yollar | `SELECT 1` (PG) + Redis `PING` + S3 bucket kontrolü |
| **P2-14** | **`CORS` origin fallback'i `true`.** `origins.length > 0 ? origins : true` — config boşsa **tüm origin'lere izin**. | `apps/api/src/main.ts:66-68` | Production'da `API_CORS_ORIGINS` unutulursa **wildcard CORS + credentials** | Production'da origin listesini zorunlu kıl (config `superRefine`) |

---

## 5. P3 — Düşük Öncelikli Kusurlar

| # | Bulgu | Etki |
| --- | --- | --- |
| **P3-1** | `apps/api/src/modules/refund/refund.service.ts` — `#refunds`/`#payments` in-memory fallback yolları üretim kodunda duruyor | Test edilebilirlik artıyor ama "hangi yol çalışıyor" ayrımı belirsiz; `this.prisma ? ... : ...` deseni 15+ serviste tekrar ediyor → **repository pattern** eksik |
| **P3-2** | `OrderService` içinde `#get`, `#mapRow`, `#mapRowWithHydration` elle yazılmış hydration | Prisma `include` zaten hydration yapıyor; elle map kodunda tip kaybı riski |
| **P3-3** | `payment.port.ts` `PaymentPort` arayüzünde `refund()` yok (P0-1 ile aynı kök) | Port eksik → sağlayıcı değişikliği imkânsız |
| **P3-4** | `apps/api/src/modules/auth/staff/staff-access-token.ts` — JWT **elle** imzalanıyor (`node:crypto` createSign) | `jose`/`@nestjs/jwt` yerine elle implementasyon → algoritma/claim doğrulama hatası riski (mevcut kod doğru `alg: RS256` + `iss/aud/exp` kontrol ediyor, ancak kütüphane güvenliği yok) |
| **P3-5** | `customer-mobile/lib/session.ts` — `memoryKv()` fallback'i varsayılan | SecureStore erişilemezse sessizce bellek kullanılıyor; kullanıcı her açılışta yeniden giriş yapar |
| **P3-6** | `apps/api/prisma/schema.prisma` — `Order.displayNumber` `@default(dbgenerated("'SP00001'"))` | Varsayılan sabit; sequence'a geçilince P1-1 düzeltmesiyle birlikte güncellenmeli |
| **P3-7** | `packages/observability` — redaction listesi manuel (`redaction.ts`) | Yeni hassas alan eklendiğinde unutulabilir; allow-list yaklaşımı daha güvenli |
| **P3-8** | `docs/` ve `tests/e2e` dosyaları Prettier kapsamı dışında bırakılmış | `format:check` 379 dosyada başarısız → gate kalıcı kırık |

---

## 6. Mimari Değerlendirme

### 6.1 Doğru Yapılmış Olanlar (korunmalı)

| Alan | Kanıt |
| --- | --- |
| **Monorepo sınırları** | `packages/contracts` → `packages/api-client` → `apps/*` yönü tek yönlü; `turbo prune` Docker build'de çalışıyor (`Dockerfile.api:16`) |
| **Sözleşme tek kaynağı** | Zod şemaları `packages/contracts`; `safeValidate` pipe'i tüm controller'larda; `ErrorCodes` tek enum |
| **Parasal doğruluk temeli** | Her yerde `BigInt` + kuruş; float yok; `payment.controller.ts:104` authoritative quote kontrolü **var** (P0-2'deki zehirlenme öncesi) |
| **Id varlığı** | UUIDv7 (`dbgenerated("uuidv7()")`) — zaman-sıralı, index-friendly |
| **Outbox altyapısı** | `FOR UPDATE SKIP LOCKED` ile claim (`prisma-outbox.writer.ts:112`), lease, backoff, dead-letter, idempotent handler contract — **mimari doğru, sadece handler'lar eksik** (P1-5) |
| **Auth** | RS256 JWT (staff) + opaque hashed refresh (customer) ayrımı; refresh rotation; şüpheli reuse → session family iptali; `X-User-Id`'ye **güvenilmiyor** (`auth.guard.ts:26` yorumu + kod) |
| **Guard zinciri** | `AuthGuard → AccountStatusGuard → RbacGuard → ResourceScopeGuard` — branch scope enforcement var |
| **Idempotency deseni** | Var ve doğru yerde (`payment.initialize`) — sadece scope/cleanup eksik (P1-4) |
| **Hata zarfı** | `AppExceptionFilter` global; `X-Request-Id` + `X-Correlation-Id` uçtan uca; istemci tarafında `ApiError` tek tip |
| **Log maskeleme** | Pino `redact` ile `password/secret/token` maskeleniyor (`packages/observability/src/redaction.ts`) |
| **Test altyapısı** | Vitest + Playwright + gerçek PG/Redis integration config; 137 test dosyası; CI'da `migrate deploy` + `db seed` + integration + E2E akışı |
| **Docker** | Multi-stage, non-root (`USER node`), HEALTHCHECK, `turbo prune`, distroless-ish `node:24.21.0-bookworm-slim` |

### 6.2 Yanlış / Kurumsal Olmayan Yapılar

| # | Yanlış Yapı | Neden Kurumsal Değil | Doğru Yapı |
| --- | --- | --- | --- |
| **A1** | **Prisma şema ↔ migration SQL senkron değil** (P1-3) | Enterprise'da schema migration'ın **kaynağıdır**; drift = outage | Prisma şeması tek kaynak; CI'da `migrate diff` gate'i |
| **A2** | **Manuel `BigInt`/snapshot hesapları servislerde** (P0-2, P1-2) | Fiyat ve durum **domain katmanında**, istemci girdisinden bağımsız hesaplanmalı | Server-authoritative pricing + optimistic locking |
| **A3** | **Process-local state: rate limit, OTP window, idempotency cache** (P2-1, P2-4) | Yatay ölçeklenen bir sistemde process-local sayaç **koruma sağlamaz** | Redis / DB tabanlı paylaşımlı state |
| **A4** | **In-memory fallback yolları üretim kodunda** (P3-1) | "Hangi kod yolu çalışıyor?" belirsizliği = üretim hatası kaynağı | Repository arayüzü + tek Prisma implementasyonu |
| **A5** | **PostGIS kurulu ama kullanılmıyor** (P1-8) | Coğrafi sorgular **veritabanının işi**; uygulamada yapılması ölçeklenmez | `ST_Covers` + GIST index |
| **A6** | **İş kuralı eksikleri kodla telafi edilmeye çalışılmış** (P1-7 `order_earn`) | "Yapıyor gibi görünüyor ama yapmıyor" — en tehlikeli hata sınıfı | Her kural ya implement ya da açıkça kapsam dışı |
| **A7** | **Worker process placeholder** (P1-6) | Async iş yükü ayrı process'te çalışmalı | Gerçek queue'lar + worker'lar |
| **A8** | **Token taşıma yaklaşımı 3 farklı** (localStorage / HttpOnly cookie / SecureStore) | Kurumsal'da **tüm istemcilerde aynı model** | Web: HttpOnly cookie; Mobil: SecureStore |
| **A9** | **Build-time dış ağ bağımlılığı** (P2-7) | Reproducible build + gizlilik | `next/font/local` |
| **A10** | **Doğrulama katmanı eksik: `CHECK` constraint 1 adet** (P1-3) | Para/aded veri bütünlüğü DB'de garanti edilmeli | `CHECK` + `NOT NULL` + FK |

---

## 7. Prod'a Çıkış Yol Haritası

### Sprint 0 — "Prod öncesi kırmızı ışıkları söndür" (1-2 gün, bloklayıcı)

| # | İş | Doğrulama |
| --- | --- | --- |
| 0.1 | `pnpm format` → 379 dosya | `pnpm format:check` exit 0 |
| 0.2 | `checkout.tsx` dependency fix | `pnpm lint` exit 0 |
| 0.3 | `hv-reconciliation-parser.test.ts` fix | `pnpm test:unit --force` exit 0 |
| 0.4 | Fontları `next/font/local`'a taşı | `pnpm build` exit 0 |
| 0.5 | Docker ile `infra:up` → integration + Playwright | `pnpm test:integration` exit 0, `playwright test` exit 0 |

> Sprint 0 **hiçbir mimari değişiklik içermez**; sadece mevcut beyanın (PASS) gerçekliğini sağlar. Sprint 0 tamamlanmadan "prod'a hazır" demek kanıtsızdır.

### Sprint 1 — P0 kapatma (3-5 gün, bloklayıcı)

Sıra önemli (P0-2 önce, çünkü P0-1'in doğru sipariş bağına ihtiyacı var):

1. **P0-2** — Sunucu otoriter fiyatlandırma (katalog yeniden okuma, negatif delta yasağı)
2. **P0-4** — `orders` + `loyalty_*` + `checkout_sessions` FK'ları (migration + Prisma relation)
3. **P0-1** — Refund: provider çağrısı + order bağı + audit log + `orderId` FK
4. **P0-5** — Loyalty bakiye kilidi (`FOR UPDATE`) + `SUM()` aggregate
5. **P0-3** — Refresh token → HttpOnly cookie (customer + storefront)
6. **P0-6** — `PAYMENT_GATEWAY` fail-fast guard'ı

### Sprint 2 — P1 kapatma (4-6 gün)

P1-1 (sequence) → P1-2 (optimistic locking) → P1-3 (drift + CHECK) → P1-4 (idempotency scope) → P1-5/P1-7 (outbox + loyalty earn) → P1-6 (worker) → P1-8 (PostGIS)

### Sprint 3 — P2 / sertleştirme (4-6 gün)

Rate limit + helmet + CSP (P2-1, P2-2, P2-3, P2-4, P2-5, P2-6) → Redis entegrasyonu → health/ready → test kapsamı (P2-9)

### Sprint 4 — Prod sertleştirme (3-5 gün)

- DB yedekleme + PITR (WAL archiving) + restore tatbikatı
- Migration geri-alma (down) prosedürü — şu an `prisma migrate` çözümü yok, geri alma **manuel**
- Observability: metrik + alarm (hata oranı, p95 latency, outbox lag, DB pool, disk)
- Yük testi (k6) — özellikle `/cart/quote` + `/payments/initialize` + checkout finalize
- Güvenlik taraması (OWASP Top 10), bağımlılık denetimi (`pnpm audit`)
- KVKK: log PII taraması, font/3rd-party ağ bağımlılığı temizliği

---

## 8. Prod Kontrol Listesi (Go/No-Go)

Yayına almadan **hepsi** `PASS` olmalı:

| # | Kontrol | Kanıt |
| --- | --- | --- |
| 1 | `pnpm format:check` | exit 0 |
| 2 | `pnpm lint` | exit 0 |
| 3 | `pnpm typecheck` | exit 0 |
| 4 | `pnpm test:unit --force` | exit 0 |
| 5 | `pnpm test:integration` (gerçek PG+Redis) | exit 0 |
| 6 | `pnpm build` (ağ bağımsız) | exit 0 |
| 7 | `pnpm db:validate` + `prisma migrate diff` boş | exit 0 |
| 8 | `prisma migrate deploy` (boş DB'den) | exit 0 |
| 9 | Playwright E2E (16 spec) | exit 0 |
| 10 | Refund akışı: sağlayıcı çağrısı + order bağı + audit | manuel doğrulama |
| 11 | Fiyat manipülasyonu testi: istemci `unitPriceMinorSnapshot: "1"` → 400/422 | entegrasyon testi |
| 12 | Eşzamanlı sipariş: 50 paralel `POST /checkout/finalize` → tek `displayNumber` | yük testi |
| 13 | Eşzamanlı loyalty: 20 paralel reserve → toplam > bakiye **reddedilmeli** | entegrasyon testi |
| 14 | `PAYMENT_GATEWAY=simulated` + `NODE_ENV=production` → **boot başarısız** | entegrasyon testi |
| 15 | Token'lar `localStorage`'da **yok** (storefront + admin) | statik grep + tarayıcı testi |
| 16 | PostGIS query plan: `EXPLAIN` → spatial index kullanılıyor | SQL doğrulama |
| 17 | Worker: gerçek queue'lar, `order_earn` ledger satırı oluşuyor | entegrasyon testi |
| 18 | Yedekleme + restore tatbikatı | operasyon kaydı |
| 19 | Metrik + alarm tanımlı | operasyon kaydı |
| 20 | `pnpm audit` → kritik/orta yok | CI çıktısı |

---

## 9. Kanonik Sözleşme Referansları

| Belge | Kullanılan bölüm |
| --- | --- |
| `fastfood-project-docs/10-PAYMENT_IYZICO_REFUND.md` | İade akışı, sağlayıcı portu |
| `fastfood-project-docs/09-CART_CHECKOUT_PRICING.md` | Sepet doğrulama, fiyat yetkisi |
| `fastfood-project-docs/12-ORDER_LIFECYCLE_STATE_MACHINE.md` | Durum geçişleri |
| `fastfood-project-docs/13-BRANCH_SERVICE_AREA_ROUTING.md` | Servis alanı, mekansal sorgu |
| `fastfood-project-docs/16-DATA_MODEL_DATABASE.md` / `35-DATABASE_PRISMA_CONVENTIONS.md` | FK, CHECK, migration disiplini |
| `fastfood-project-docs/37-PRICING_CALCULATION_CONTRACT.md` | Sunucu otoriter hesaplama |
| `fastfood-project-docs/11-LOYALTY_POINTS_PROMOTIONS.md` | `order_earn`, rezervasyon, tier |
| `fastfood-project-docs/18-SECURITY_PRIVACY_AUDIT.md` / `44-SECURITY_IMPLEMENTATION_BASELINE.md` | Token taşıma, rate limit, header'lar |
| `fastfood-project-docs/19-REPORTING_ANALYTICS.md` | Satış/vergi raporu kaynakları |
| `fastfood-project-docs/17-API_EVENTS_REALTIME.md` | Outbox event kataloğu |
| `fastfood-project-docs/33-TOOLCHAIN_VERSION_MATRIX.md` | Sürüm kilidi |
| `fastfood-project-docs/46-CHANGE_CONTROL_ADR_PROTOCOL.md` | Yeni bağımlılık/ADR kapısı (ör. `@fastify/rate-limit`, `@fastify/helmet`, `jose`) |
| `docs/adrs/ADR-004-auth-crypto-baseline.md` | scrypt/Argon2id, RS256, refresh token |
| `docs/adrs/ADR-022-iyzico-checkout-form-sandbox.md` | Sandbox ödeme, `acceptsClientAssertedStatus` |

---

## 10. Sonuç

FASTFOOD'un **temeli doğru**: sözleşme merkezili, tip güvenli, transaction'ları düşünülmüş, outbox altyapısı yerinde, guard zinciri eksiksiz, Docker/CI iskeleti kurulmuş. Bu, "kurumsal olmayan" bir codebase değil.

Ancak **"tamamlandı" beyanı gerçeği yansıtmıyor**. Tespit edilen P0'ların altısı da **canlıda sessizce para kaybı, veri bozulması veya güvenlik açığı** üretir; `pnpm build`/`lint`/`test:unit`/`format:check` gate'leri **şu anda kırmızı**. "10/10 prod sorunsuz" hedefi için Sprint 0 (gate'leri yeşile getir) ve Sprint 1 (P0 kapatma) **zorunludur**; bundan sonra Sprint 2/3/4 kurumsal olgunluk seviyesini tamamlar.

**Sıralama gerekçesi:** P0-2 (fiyat) önce gelir çünkü P0-1'in (iade) sipariş tutarına ihtiyacı var; P0-4 (FK) ikinci çünkü P0-1'in `orderId` bağı ancak FK ile güvenilir olur; P0-3 (token) üçüncü çünkü sunucu tarafı değişiklikleri sırasında istemci değişikliği de aynı PR'de yapılmalıdır.

---

*Bu rapor statik analiz + exit code kanıtlı gate koşullarıyla üretilmiştir. Docker/PostgreSQL erişimi olmadığı için integration ve Playwright gate'leri `NOT RUN` olarak işaretlenmiştir ve Sprint 0'da yeniden çalıştırılmalıdır. İnsan kabulü (`HUMAN_ACCEPTED`) yalnızca proje sahibine aittir.*
