# FASTFOOD Kod Tabanı Risk Denetimi

> Denetim tarihi: 1 Ekim 2026
> Kapsam: `AI_CODEBASE_CONTEXT.md` içindeki P0/P1 risk listesinin **güncel kaynak
> kodla** yeniden doğrulanması.
> Yöntem: Çalışan kodu okuma, çalışan yerel altyapı ve servisleri inceleme.
> Kod değiştikçe bu rapor güncellenmelidir. Çelişkide güncel kaynak kod ve
> çalışan test sonucu bu rapordan üstündür.
>
> **Bu rapor, `AI_CODEBASE_CONTEXT.md` dosyasının risk bölümünün yerine geçer.**
> O dosyanın genel mimari/tasarım anlatımı hâlâ geçerlidir; yalnızca P0/P1/P2
> listesi geçersizdir.

## 1. Özet

`AI_CODEBASE_CONTEXT.md` 21 Eylül 2026 tarihli bir denetimdir ve o tarihten
sonra güvenlik tarafında önemli düzeltmeler yapılmıştır. **En ciddi iddiası
( staff token'ının imzasız olduğu) artık doğru değildir.** Buna karşılık, raporun
"çözülmüş" sandığı kalemlerin bir kısmı hâlâ açık durumdadır ve bir kısmı
rapordan bile daha kötüdür.

| Durum                                | Adet | Açıklama                                                      |
| ------------------------------------ | ---- | ------------------------------------------------------------- |
| Yanlış / bayat (artık geçerli değil) | 4    | Raporun çözdüğünü sandığı, aslında çözülmüş kalemler          |
| Hâlâ geçerli                         | 8    | Raporun doğru bildirdiği açıklar                              |
| Rapordan daha kötü                   | 3    | İnceleme sırasında yeni ortaya çıkan veya şiddetlenen açıklar |
| Bu oturumda kapatıldı                | 1    | Git baseline'ı                                                |
| Bilinçli olarak ertelendi            | 1    | Ödeme (sandbox kararı)                                        |

## 2. Artık geçerli olmayan iddialar (düzeltilmiş)

### 2.1 "Staff token imzasız, regex ile taklit edilebilir" — YANLIŞ

Rapor, regex ile eşleşen imzasız bir token'ın tüm izinleri verdiğini söylüyordu.
Güncel kod gerçek imzalı JWT kullanıyor:

- `apps/api/src/modules/auth/staff/staff-access-token.ts` — Node `crypto`
  `createSign`/`createVerify` ile **RS256** imzalama ve doğrulama, `alg` alanı
  RS256'ya sabitlenmiş, `iss`/`aud` karşılaştırılıyor, `exp`/`iat` sınırları
  kontrol ediliyor, TTL aşımı reddediliyor.
- `apps/api/src/modules/auth/guards/rbac.guard.ts` — **fail-closed** çalışıyor.
  İzin snapshot'ı yoksa istek reddediliyor. `/admin/**` rotaları ayrıca sayfa →
  izin eşlemesinden geçiyor; eşlemesi olmayan admin endpoint'i reddediliyor.
- `apps/api/src/modules/auth/guards/account-status.guard.ts` ve
  `resource-scope.guard.ts` mevcut.

### 2.2 "`meta.requestId` sabit bir değer" — YANLIŞ

Güncel kod gerçek request bağlamı kullanıyor:

- `apps/api/src/common/http/request-id.middleware.ts` — AsyncLocalStorage
  üzerinden istek kimliği bağlanıyor, `X-Request-Id` response header'ına yazılıyor.
- `apps/api/src/common/http/app-exception.filter.ts` — hata zarfında istek
  kimliği `ctxReq?.requestId ?? request.id` ile alınıyor.

> Not: Bunun aksine, ödeme entegrasyonu denetleyicisinde **sabit** bir
> `REQUEST_ID` sabiti duruyor.Bk §3.1.

### 2.3 "Rol/izin ve hesap durumu DB verisine bağlanmamış" — YANLIŞ

Personel izinleri `staff-auth.service.ts` içinde `userPermissionGrants`,
`role.rolePermissions` ilişkilerinden okunuyor; `RbacGuard` ve
`AccountStatusGuard` bu snapshot üzerinden karar veriyor.

### 2.4 "Git baseline'ı yok" — DÜZELTİLDİ (bu oturumda)

Depoda `HEAD` yoktu, commit yoktu, remote yoktu; 1257 dosya untracked idi.
Artık `baseline-v1` etiketli bir ilk commit mevcuttur ve çalışma ağacı temizdir.

## 3. Hâlâ geçerli riskler

### 3.1 [EN YÜKSEK] Ödeme webhook'u imzasız ve varsayılan durum `PAID`

`apps/api/src/modules/payment/iyzico-integration.controller.ts`

- `POST /api/v1/integrations/iyzico/callback` ve `POST .../webhook`
  **kimlik doğrulaması veya imza doğrulaması olmadan** kabul ediliyor.
- Gövde şeması yalnızca `providerPaymentId` ve opsiyonel `status` okuyor.
- `const status = parsed.data.status ?? 'PAID';` — `status` alanı hiç gönderilmezse
  ödeme **otomatik olarak `PAID` kabul ediliyor**.
- Bu, siparişin `PAID` sayılmasına ve dolayısıyla onay akışına yol açan bir
  yetkisiz durum değiştirme yüzeyidir.
- Aynı dosyada sabit `REQUEST_ID` sabiti kullanılıyor; hata zarfındaki istek
  kimliği bu yüzden gözlemlenebilirlik zincirini bozuyor.

Bu kalem ödeme kapsamındadır. İnsan sahibi kararıyla **bu turda
düzeltilmeyecek**; geliştirme ortamında sandbox ile devam edilecek. Yalnızca
kayıt altına alınmıştır.

### 3.2 Privilege staff MFA gerçek değil

`apps/api/src/modules/auth/staff/staff-auth.service.ts` → `verifyMfa()`

- TOTP doğrulaması **yoktur**: repo içinde RFC 6238 implementasyonu, TOTP
  sırrı saklama veya sayaç penceresi doğrulaması bulunmamaktadır.
- Doğrulama yalnızca `/^\d{6}$/` biçim kontrolü ve bir bayrak kontrolüdür.
- Bayrak açıkken (`ALLOW_DEV_MFA_BYPASS=true` **ve** `NODE_ENV=production` değil)
  **herhangi bir 6 haneli kod kabul edilir**.
- Bayrak kapalıyken doğrulama **her zaman başarısız** olur
  (`MFA_NOT_VERIFIED`), yani üretimde tamamlanamaz.

Yani MFA kapısı geliştirme ortamında bir no-op, üretimde ise kullanılamaz bir
engel. `.env` içinde `NODE_ENV=development` ve `ALLOW_DEV_MFA_BYPASS=true`
olduğu için **şu anda çalışan ortamda bu kapı kapalı değildir**.

`AGENTS.md` §4 ve belge 32 §5, privileged staff için RFC 6238 TOTP MFA'yı
zorunlu kılar. Bu bir sözleşme ihlalidir.

### 3.3 Outbox yazıcı "transactional" değil ve emit'ler `void` ile savruluyor

**a) `enqueueTransactional()` bir işlem değildir.**
`apps/api/src/common/outbox/prisma-outbox.writer.ts` içindeki
`enqueueTransactional()` doğrudan `enqueue()`'ı çağırıyor. Metot adı atomiklik
vaat ediyor, karşılığı yoktur.

**b) Order emit'leri `void` ile başlatılıyor.**
`apps/api/src/modules/order/order.service.ts` içinde en az 6 noktada
`void this.outbox?.enqueueBranchAssigned(...)` / `enqueueStatusChanged(...)`
kullanılıyor. Bunlar:

- `await` edilmiyor → hata sessizce kaybolur, hatta yakalanmamış promise
  reddi üretir;
- sipariş mutasyonuyla **aynı transaction'da değil** → süreç yazma sonrası
  ölürse kritik olay kalıcı olarak kaybolur.

**c) `markPublished(eventIndex)` indeks tabanlıdır.**
Yayınlanmamış tüm satırlar sayfalama olmadan okunup indekse göre seçiliyor.
Eşzamanlı iki tüketici aynı olayı işleyebilir veya yanlış olayı işleyebilir.

**d) Şema hazır ama kullanılmıyor.**
`OutboxEvent` modelinde `attempts`, `lastAttemptAt`, `lastError` alanları var;
yazıcı bunların hiçbirini güncellemiyor. Kiralama (lease) veya gecikmeli
tekrar deneme (`nextAttemptAt`) alanı hiç yok.

**e) Tüketici yok.**
`apps/worker/src/main.ts` yalnızca Redis'e ping atıyor, `phase0-placeholder`
kuyruğunun sayaçlarını okuyup kapanıyor. Tarama, kiralama, geri deneme,
dead-letter veya `publishedAt` işleme döngüsü mevcut değil.

Sonuç: outbox satırları gerçek bir yan etkiye dönüşmüyor.

### 3.4 Refund bakiye kontrolü yarış koşullarına açık

`apps/api/src/modules/refund/refund.service.ts`

Prisma dalı şu sırayla çalışıyor:

1. `paymentAttempt.findUnique(...)`
2. `refund.findMany(...)` → mevcut iadeleri topla
3. karşılaştır: `already + amountMinor > payment.amountMinor` → reddet
4. `refund.create(...)`

**`$transaction`, satır kilidi veya `Serializable` izolasyon yoktur.** İki
eşzamanlı kısmi iade ikisi de kontrolü geçebilir ve toplam, ödenen tutarı
aşabilir. `orderId` ayrıca her zaman `null` yazılmaktadır.

Aynı servis, `this.prisma` yoksa devreye giren **ikinci bir tam implementasyon**
içerir (`#payments` / `#refunds` / `#byPayment` bellek haritaları).

### 3.5 Routing hâlâ uygulama belleğinde, PostGIS yok

`apps/api/src/modules/branch/routing/routing.service.ts`

`assign()` metodu `polygonGeoJson` üzerinde saf bellek içi nokta-içinde-polygon
testi yapar. Modül genelinde `$queryRaw` / `$executeRaw` / `ST_Contains` çağrısı
**yoktur**. Dosyanın kendi yorumu PostGIS'e geçişi ileri bir aşamaya bırakır.
Şema hazırlığı olsa da coğrafi sorgu veritabanında çalışmıyor.

### 3.6 Medya genel URL'si `localhost`'a sabit

`apps/api/src/modules/storage/s3-object-storage.adapter.ts` → `publicUrl()`

```ts
return `http://localhost:${this.env.API_PORT}${this.env.API_BASE_PATH}/public/media/${key}`;
```

`.env.example` içinde `S3_PUBLIC_ENDPOINT` tanımlı olmasına rağmen bu değer
kullanılmıyor. Android emülatör (`10.0.2.2`), fiziksel cihaz veya herhangi bir
farklı host'tan görüntülenen ürün görselleri bu URL üzerinden erişilemez.

### 3.7 Kimlik doğrulama, idempotency ve kurye durumu süreç belleğinde

Bellek içi durum tutan servisler (yatay ölçeklemede ve yeniden başlatmada
tutarsızlaşır):

| Dosya                                            | Tutulan durum                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| `common/idempotency/idempotency.service.ts`      | Idempotency kayıtları (`#records`)                                     |
| `common/crypto/otp-verifier.ts`                  | OTP doğrulama meydruları (`#map`)                                      |
| `modules/auth/customer/customer-auth.service.ts` | Hız sınırlama (`#hits`), oturumlar (`#sessions`), bellek kullanıcıları |
| `modules/auth/staff/staff-auth.service.ts`       | Kullanıcılar (`#users`), oturumlar (`#sessions`)                       |
| `modules/courier/delivery.service.ts`            | Kuryeler, teslimatlar, QR hash'leri                                    |
| `common/outbox/outbox.service.ts`                | Yayınlanan olay kümesi (`#published`)                                  |

`IdempotencyService` Prisma ile destekleniyor; ancak `lookup` → `store` iki ayrı
çağrı olduğu için kontrol-kaydetme atomik değildir (benzersiz kısıt var, hata
yine de eşzamanlı isteklerde yarışa açık).

### 3.8 Global rate limit, güvenlik başlıkları ve dağıtık kısıtlama yok

- `ErrorCodes.RATE_LIMITED` ve müşteri OTP bekleme süresi mevcut; bu **yalnızca
  OTP akışına** uygulanır.
- Global bir hız sınırlaması, güvenlik başlıkları (helmet, CSP,
  `X-Frame-Options` vb.) veya dağıtık kimlik doğrulama kısıtlaması **yoktur**.
- `main.ts` içinde CORS `origin: true` + `credentials: true` ile açılabiliyor;
  `API_CORS_ORIGINS` boşsa her origin kabul edilir.
- Hız sınırlama sayaçları bellek içi olduğu için çok örnekli kurulumta etkisizdir.

## 4. Bilinçli olarak ertelenen kalem

- **Ödeme / iyzico adaptörü.** `IyzicoSandboxAdapter` hâlâ bellek içi bir
  `Map` üzerinde çalışıyor; durum süreç yeniden başlatınca kayboluyor ve
  `markPaid` adlı bir test yardımcısı bulunuyor. İnsan sahibi kararıyla
  geliştirme ortamında sandbox ile devam edilecek. Bu, belge 49 §5 ile
  tutarlıdır; ancak üretim benzeri ödeme yüzeyi anlamına gelmez.

## 5. Önerilen sıra

1. `§3.3` — outbox tüketicisi ve atomik emit. En geniş etkiye sahip açık:
   şu anda kritik olaylar sessizce kaybolabiliyor.
2. `§3.4` — refund kontrolünü transaction + kilitle kapat.
3. `§3.2` — gerçek TOTP MFA.
4. `§3.8` — global rate limit ve güvenlik başlıkları.
5. `§3.1` — ödeme webhook imzası (ertelenmiş kalem).
6. `§3.5`, `§3.6`, `§3.7` — PostGIS routing, tabanlı medya URL'si, bellek
   fallback'lerinin veri katmanına taşınması.

## 6. Devam eden kalite borcu

Bu bölüm, bu denetim sırasında keşfedilen ve **bu çalışma kapsamında
düzeltilmeyen** önceden var olan durumları listeler. Hepsi değişiklikten
önce de mevcuttu; değişiklik öncesi/sonrası karşılaştırmasıyla doğrulandı.

### 6.1 `pnpm format:check` kırmızı — 220 dosya

`.prettierignore`, `.gitignore`'ı yansıtmadığı için `graft/` ve
`.fastfood-dev/` gibi üretilmiş çıktılar taranıyordu; bu turda
`.prettierignore` düzeltildi ve 274 → 220 dosyaya indi. Kalan 220 dosya gerçek
biçim borcudur:

| Uzantı  | Dosya |
| ------- | ----- |
| `.tsx`  | 114   |
| `.ts`   | 79    |
| `.md`   | 16    |
| `.mjs`  | 6     |
| `.json` | 4     |
| `.cjs`  | 1     |

Dağılımın çoğu `apps/storefront-web/src` (56), `apps/customer-mobile`
(app 24 + lib 22 + components 9), `apps/admin-web/src` (24),
`apps/api/src` (20) ve `tests/e2e/tests` (10).

Bu, CI'ın 2. adımını kırmızı tutuyor. Düzeltmek mekanik bir
`prettier --write` işidir ve ayrı bir commit'e konmalıdır; ilk commit'i
okunabilir tutmak için bilerek bu kapsam dışında bırakıldı.

### 6.2 `pnpm lint` kırmızı — 3 paket

| Paket                       | Sonuç                       |
| --------------------------- | --------------------------- |
| `@fastfood/api`             | temiz                       |
| `@fastfood/worker`          | temiz                       |
| `@fastfood/courier-web`     | temiz                       |
| `@fastfood/storefront-web`  | 7 sorun (1 hata, 6 uyarı)   |
| `@fastfood/customer-mobile` | 1 uyarı                     |
| `@fastfood/admin-web`       | 37 sorun (9 hata, 28 uyarı) |

`admin-web` en ağır olanı. Bunların tümü bu denetimle ilgisiz dosyalarda ve
baseline karşılaştırmasıyla birebir aynı.

### 6.3 `pnpm test:unit` — 5 dosya / 18 test kırmızı (yalnızca API)

Hepsi izin ve kapsam (guard) testlerinde, ve hepsi ADR-014/015/016'nın
getirdiği kullanıcı-bazlı sayfa izin modeliyle ilgili görünüyor: yetkilendirme
kodu değişmiş, testler güncellenmemiş.

- `apps/api/test/unit/guards/auth-guards.test.ts`
- `apps/api/test/unit/catalog-branch.test.ts`
- `apps/api/test/unit/storefront-customer-authz.test.ts`
- `tests/api/negative-test-matrix.test.ts`
- `tests/api/admin-negative-test-matrix.test.ts`

Bu testleri zayıflatmak veya `skip` etmek yasaktır. Doğru çözüm, ya
beklenen davranışın güncel `RbacGuard` / `BranchScopePolicy` ile hizalanması
ya da testin yakaladığı bir regresyonun düzeltilmesidir; ikisi de ayrı bir
çalışma gerektirir.

### 6.4 Yerel veritabanında şema sapması

`prisma migrate status` "Database schema is up to date!" diyor, ancak
`prisma migrate diff` canlı veritabanı ile `schema.prisma` arasında iki fark
buluyor. Yani migration'lar uygulanmış; veritabanı sonradan elle düzenlenmiş
veya migration SQL'i şemayla örtüşmüyor:

- `addresses_province_id_district_id_neighborhood_id_idx` indeksi yok.
- `orders.display_number` kolonunda şemadaki `'SP00001'` varsayılanı yok.

Bu düzeltme, belge 49 §9'un yasakladığı "ad-hoc şema düzenlemesi" olurdu;
migration geçmişiyle ilgili bir karar gerektirdiği için bu çalışmada
dokunulmadı.

### 6.5 Diğer gözlemler

- Dev API süreci denetim altında değil. `pnpm --filter @fastfood/api start`
  ile başlatıldığında gözetimsiz kalıyor ve bir noktada düştü; sağlık
  uçları tekrar elle başlatılmak zorunda kaldı.
- `apps/api/prisma/generated/` artık sürüm kontrolünde değil ve CI'da
  `pnpm db:generate` ile üretiliyor. Bu doğru; ancak paket `dist/` çıktısı
  (`@fastfood/config`) de aynı şekilde tüketiciye derlenmiş halde sunuluyor.
  `ServerEnv` tipini kullanan bir paket, kaynak değişiminden sonra
  `pnpm --filter <paket> build` çalıştırmadan tip hatası verir. Turbo sırası
  doğru çalışıyor; elle paket filtresiyle komut verirken dikkat gerekir.
- Depo kökünde `vitessst.config.ts` adlı bir dosya var; muhtemelen
  `vitest.config.base.mjs` veya kök `vitest.config.*` için yazım hatası.
  Hiçbir yapılandırma bunu okumuyor.

## 7. Doğrulama komutları

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm db:validate
pnpm build
```

Veri tabanı davranışı değiştiyse:

```bash
pnpm infra:up
pnpm db:migrate:deploy
pnpm db:seed
pnpm test:integration
```

> Not: `pnpm format:check` bu raporun yazıldığı sırada **kırmızıdır** ve bu bir
> denetimden kaynaklanan sorun değildir. Ayrıntı ve ölçümler için §6.1'e bakın.
