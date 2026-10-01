# FASTFOOD Güncel Kod Tabanı Analizi ve AI Geliştirme Rehberi

> **SUPERSEDED (1 Ekim 2026):**
> Bu dosyanın **P0/P1/P2 risk listesi artık geçerli değildir**.
> 21 Eylül 2026 ile 1 Ekim 2026 arasında staff token imzası,
> istek kimliği ve personel izin bağlama düzeltmeleri yapıldı; bir kısmı
> hâlâ açık kalemler ise raporda sanıldığından daha ağır. Güncel
> doğrulanmış risk listesi için bkz. `CODEBASE_RISK_AUDIT.md`.
> Bu dosyanın mimari, paket sınırları ve akış anlatımı bölümleri
> kullanılabilir durumdadır.

> Analiz tarihi: 21 Eylül 2026  
> İncelenen kapsam: güncel kaynak kod, paket bildirimleri, çalışma zamanı yapılandırmaları, Prisma şeması ve migration'lar, otomatik testler, yerel altyapı tanımları ve doğrulama komutlarının gerçek çıktıları.  
> Bilinçli olarak hariç tutulan kapsam: depoda önceden bulunan tüm Markdown dokümanlarının içeriği. Bu rapor, eski plan veya ilerleme anlatılarına göre değil, çalışan kodun fiilî durumuna göre hazırlanmıştır.

## 1. Bu dosyanın amacı ve kullanım şekli

Bu dosya, FASTFOOD kod tabanına ilk kez giren bir geliştirici veya AI model için tek başlangıç belgesidir. Aşağıdaki soruları cevaplar:

- Ürün ne yapıyor ve hangi kullanıcı yüzeylerine sahip?
- Monorepo nasıl ayrılmış, paketler birbirine nasıl bağlanıyor?
- Backend, veri tabanı, web ve mobil istemciler nasıl çalışıyor?
- Temel iş akışları ve değişmez teknik sözleşmeler neler?
- Hangi özellikler gerçekten kalıcı veri tabanına bağlı, hangileri sandbox veya geçici davranış taşıyor?
- Mevcut kalite kapıları ne durumda?
- Geliştirmeye nereden ve hangi doğrulamalarla başlanmalı?
- Üretim veya güvenlik açısından hangi açıklar kapatılmadan ilerlenmemeli?

Bu rapor bir kod anlık görüntüsüdür. Kod değiştikçe rapor da güncellenmelidir. Bir çelişki durumunda güncel kaynak kod ve çalışan test sonucu bu rapordan üstündür.

## 2. Yönetici özeti

FASTFOOD, **BURGER HOME** markalı çok kanallı bir hızlı servis restoran platformudur. Tek depoda aşağıdaki yüzeyleri içerir:

1. Müşteri web mağazası.
2. Müşteri Expo/React Native mobil uygulaması.
3. Operasyon ve yönetim için Next.js admin paneli.
4. Kurye Expo/React Native uygulaması.
5. NestJS/Fastify tabanlı modüler monolit API.
6. BullMQ/Redis kullanması hedeflenen, ancak şu anda yalnızca bağlantı kontrolü yapan worker.
7. Paylaşılan sözleşme, API istemcisi, tasarım sistemi, gözlemlenebilirlik ve geliştirme denetleyicisi paketleri.

Kod tabanı yüzey ve veri modeli bakımından geniştir:

- 21 pnpm workspace paketi/uygulaması,
- Markdown ve üretilmiş/native çıktılar hariç yaklaşık 962 kaynak/yapılandırma dosyası,
- yaklaşık 104.008 satır,
- 470 TypeScript ve 365 TSX dosyası,
- 74 Prisma modeli,
- 17 SQL migration,
- 33 HTTP controller ve yaklaşık 153 route,
- 149 test dosyası veya test konumunda dosya bulunur.

Mevcut teknik durum **geliştirme için güçlü, üretim için hazır değil** olarak değerlendirilmelidir. Temel sebepler:

- API, katalog, sepet, checkout, sipariş, sadakat, promosyon, müşteri, kurye ve admin alanlarında gerçek Prisma kalıcılığı kullanıyor.
- Lint, tip denetimi, birim testleri, 12 entegrasyon testi, Prisma doğrulaması ve ana derleme bu analiz sırasında geçti.
- Bununla birlikte personel erişim belirteci imzasız ve tahmin edilebilir bir geliştirme formatıdır; gerçek JWT doğrulaması yoktur.
- iyzico entegrasyonu gerçek sağlayıcı çağrısı ve webhook imza doğrulaması yerine bellek-içi sandbox adaptörü kullanır.
- Worker gerçek iş tüketmez; outbox kayıtlarını yayımlayan bir tüketici yoktur.
- Outbox iş olayıyla aynı transaction içinde yazılmıyor; siparişte bazı yayınlar `void` ile beklenmeden bırakılıyor.
- Birçok servis test kolaylığı için isteğe bağlı Prisma ve bellek-içi fallback taşır. Runtime'da global Prisma sağlansa da iki yürütme biçiminin paralel yaşaması davranış sapması riskidir.
- 27 controller/service dosyası gerçek request context yerine aynı sabit request ID'yi döndürür.
- Web ödeme ekranı kart alanlarını birinci taraf React state'inde toplar fakat değerleri sağlayıcıya göndermez; doğrudan sahte webhook ile ödemeyi `PAID` yapar. “Hosted/3DS” metni fiilî davranışla uyuşmaz.
- Mobil `build` scriptlerinde çift tırnak içindeki backtick ifadesi kabuk komut ikamesine dönüşür ve yalnızca mesaj yazması beklenirken `npx expo prebuild` çalıştırır.
- Tam Playwright paketi yeşil değildir. Çalıştırma 86 testin 52'ncisinde, 28 başarılı, 5 atlanan ve 19 başarısız sonuç görüldükten sonra süreyi sınırlamak için durdurulmuştur.
- Git deposunda henüz `HEAD`/ilk commit ve remote yoktur; tüm çalışma ağacı untracked görünür. Bu, değişiklik karşılaştırması ve geri dönüş güvenliğini ciddi biçimde azaltır.

## 3. Analiz yöntemi ve kanıt sınırı

Analiz şu kaynaklardan çıkarılmıştır:

- `package.json`, workspace ve Turbo yapılandırmaları,
- TypeScript/TSX/JavaScript/CSS kaynakları,
- Prisma şeması, seed kodu ve SQL migration'lar,
- Docker Compose ve CI workflow'u,
- test kaynakları,
- gerçek lint/typecheck/test/build çıktıları,
- çalışan yerel servislerin sağlık durumu.

Mevcut proje Markdown dosyaları okunmadı ve özellik durumu için kanıt kabul edilmedi. Kod içindeki yorumlar yalnızca ilgili implementasyonu anlamak için görüldü; yorumda ileri sürülen fakat kodda bulunmayan davranış “tamamlanmış” sayılmadı.

Özellik durumu değerlendirmesinde şu sıra kullanıldı:

1. Çalışan kaynak kod ve veri kalıcılığı.
2. Test edilen davranış.
3. Paket/CI/çalışma zamanı yapılandırması.
4. Kod içindeki durum veya capability beyanları; bunlar tek başına çalışma kanıtı değildir.

## 4. Depo anlık görüntüsü

### 4.1 Git durumu

- `.git` dizini var, ancak geçerli bir `HEAD` yok; henüz commit oluşturulmamış.
- Remote tanımlı değil.
- Depodaki tüm ana klasörler ve dosyalar `untracked` görünür.
- Bu nedenle bu raporun oluşturulduğu an ile önceki bir güvenilir baseline arasında Git diff üretilemez.
- İlk geliştirme işinden önce kaynakların gözden geçirilip ilk güvenli commit'in oluşturulması yüksek önceliklidir.

### 4.2 Kaynak büyüklüğü

Üretilmiş dosyalar, `node_modules`, `.next`, `dist`, native `android/ios`, browser profile, test çıktıları ve tüm Markdown dosyaları hariç ölçüm:

| Alan                      | Dosya |  Satır | Test konumlu dosya |
| ------------------------- | ----: | -----: | -----------------: |
| `apps/api`                |   209 | 29.308 |                 43 |
| `apps/admin-web`          |    79 | 13.720 |                  5 |
| `apps/storefront-web`     |   157 | 13.764 |                  7 |
| `apps/customer-mobile`    |   135 | 13.672 |                 26 |
| `apps/courier-mobile`     |    17 |  1.101 |                  0 |
| `apps/worker`             |    11 |    217 |                  1 |
| `packages/dev-controller` |    36 |  7.778 |                 20 |
| `packages/ui-web`         |    92 |  6.274 |                 10 |
| `packages/ui-native`      |    47 |  2.884 |                  1 |
| Diğer ortak paketler      |    80 |  3.909 |                  5 |
| `tests/api` + `tests/e2e` |    31 |  2.759 |                 26 |

### 4.3 Çalışma alanı şişkinliği

Kaynak kod azami birkaç megabayt olmasına rağmen uygulama klasörleri üretilmiş/cache dosyaları nedeniyle büyüktür:

- `apps/customer-mobile`: yaklaşık 4,0 GB,
- `apps/storefront-web`: yaklaşık 807 MB,
- `apps/admin-web`: yaklaşık 592 MB.

Öne çıkan yerel artefaktlar:

- Storefront Stitch Chromium profili altında 428 dosya,
- customer-mobile `android` altında yaklaşık 1.871 dosya,
- `.next`, Gradle/CMake ve native build çıktıları.

İlgili dizinlerin çoğu `.gitignore` ile hariç tutulmuştur; yine de disk kullanımı, tarama süresi ve yanlışlıkla hassas tarayıcı verisi taşıma riski vardır. Özellikle `.stitch/browser-profile` içinde tarayıcı oturumu, cookie ve login database türü yerel dosyalar bulunabileceğinden bu dizin hiçbir zaman paylaşılmamalıdır.

## 5. Teknoloji yığını

### 5.1 Araç zinciri

- Node.js: `>=24.21 <25`; `.nvmrc` ve doğrulanan yerel sürüm `v24.21.0`.
- Paket yöneticisi: pnpm `12.4.0`.
- Monorepo orkestrasyonu: Turbo `2.10.4`.
- Dil: TypeScript `5.9.3`, strict mod.
- Test: Vitest `5.0.1`, Playwright.
- Kod stili: ESLint flat config + Prettier.

Kök TypeScript ayarları `strict`, `noUncheckedIndexedAccess`, kullanılmayan sembol kontrolleri ve modern ESM/NodeNext yaklaşımını uygular. `skipLibCheck` açıktır.

### 5.2 Backend

- NestJS 12,
- Fastify adaptörü,
- Prisma 7 + `@prisma/adapter-pg`,
- PostgreSQL 18 + PostGIS 3.6,
- Zod tabanlı giriş/çıkış doğrulaması,
- Swagger/OpenAPI,
- Pino tabanlı ortak logger,
- Redis/BullMQ bağımlılığı.

### 5.3 İstemciler

- Web: Next.js 16 App Router, React 19.
- Storefront: Tailwind CSS 4 ve uygulamaya özel BURGER HOME tema katmanı.
- Admin: Next.js, ortak `@fastfood/ui-web`, ayrıca ops-shell ve geniş özel CSS.
- Mobil: Expo 55, Expo Router 55, React Native 0.83.
- Müşteri mobil: uygulamaya özel BURGER HOME token/theme dosyası.
- Kurye mobil: `@fastfood/ui-native` ve `@fastfood/design-tokens`.

### 5.4 Yerel altyapı

Docker Compose üç kalıcı hizmet sağlar:

- PostgreSQL/PostGIS: host port `5439`,
- Redis: host port `6388`,
- MinIO S3 uyumlu API `9098`, console `9099`.

Analiz sırasında üç container da çalışıyor ve `healthy` durumundaydı.

## 6. Monorepo mimarisi

```text
fastfood/
├── apps/
│   ├── api/                 NestJS/Fastify modüler monolit
│   ├── worker/              Redis/BullMQ bootstrap; gerçek tüketici henüz yok
│   ├── storefront-web/      müşteri web mağazası
│   ├── admin-web/           operasyon/yönetim paneli
│   ├── customer-mobile/     müşteri Expo uygulaması
│   └── courier-mobile/      kurye Expo uygulaması
├── packages/
│   ├── api-client/          ortak fetch, envelope ve Zod çıktı doğrulaması
│   ├── config/              env ve para yardımcıları
│   ├── contracts/           API envelope, hata ve müşteri capability sözleşmeleri
│   ├── domain-types/        branded ID, enum ve permission kodları
│   ├── observability/       logger, redaction, request context
│   ├── validation/          Zod doğrulama yardımcıları
│   ├── design-tokens/       ortak primitive/semantic web/native tokenlar
│   ├── ui-web/              genel web bileşenleri
│   ├── ui-native/           genel native bileşenleri
│   ├── dev-controller/      bounded geliştirme iş akışı durum makinesi
│   ├── test-utils/          küçük test yardımcıları
│   ├── eslint-config/       paylaşılan lint kuralları
│   └── tsconfig/            paylaşılan TS profilleri
├── infrastructure/docker/   PostgreSQL, Redis, MinIO
├── scripts/                 yerel stack aç/kapat
└── tests/
    ├── api/                 negatif API matrisleri
    └── e2e/                 Playwright web/admin senaryoları
```

### 6.1 Bağımlılık yönü

Ortak temel paketler uygulamalara bağımlı değildir. Tipik yön:

```text
domain-types ─┐
contracts ────┼─> api-client ─> web/mobile istemciler
config ───────┤
observability ┘

design-tokens ─> ui-web ──────> admin-web
design-tokens ─> ui-native ───> courier-mobile
```

Önemli gerçek: `storefront-web` ve `customer-mobile`, paket bildirimlerinde paylaşılan UI paketlerine runtime bağımlı değildir. Storefront ve müşteri mobil kendi görsel sistemlerini taşır. Paylaşılan `ui-web` ve `ui-native` yalnızca admin ve kurye uygulamaları tarafından tüketilir.

## 7. Çalışma zamanı topolojisi

### 7.1 Müşteri sipariş akışı

```text
Storefront Web / Customer Mobile
  -> ortak ApiClient
  -> Fastify/Nest API (/api/v1)
  -> katalog + sepet + routing + pricing
  -> CheckoutSession snapshot
  -> PaymentAttempt (iyzico sandbox)
  -> PAID callback/webhook
  -> Order + OrderItem snapshotları
  -> durum geçişleri / kurye / bildirim
  -> PostgreSQL
```

### 7.2 Operasyon akışı

```text
Admin Web
  -> staff login + MFA geliştirme akışı
  -> admin API controller'ları
  -> permission guard'ları
  -> katalog/şube/sipariş/ödeme/refund/rapor/kullanıcı işlemleri
  -> PostgreSQL + AuditLog/OutboxEvent
```

### 7.3 Kurye akışı

```text
Courier Mobile
  -> staff login/MFA
  -> teslimat listesi veya QR claim
  -> pickup -> on-the-way -> delivered durum makinesi
  -> konum noktaları ve performans
  -> PostgreSQL
```

### 7.4 Asenkron mimari

Şemada `OutboxEvent`, kodda Prisma outbox writer ve BullMQ/Redis bağımlılığı vardır. Ancak zincir tamamlanmış değildir:

- API outbox satırı yazabilir.
- Worker yalnızca Redis ping yapar, `phase0-placeholder` kuyruğunun sayılarını okur ve kapanır.
- Outbox tarama, lease/lock, retry, dead-letter, BullMQ enqueue veya `publishedAt` işleme döngüsü yoktur.
- E-posta/SMS/push, ödeme uzlaştırma veya medya işleme tüketicileri yoktur.

Bu nedenle outbox kayıtları gerçek yan etkiye dönüşmez.

## 8. Backend mimarisi

### 8.1 Bootstrap

`apps/api/src/main.ts`:

- Fastify `trustProxy: true`, 14 MB body limiti ile başlar.
- Genel prefix `/api/v1`'dir; health ve OpenAPI hariç tutulur.
- Global exception filter standart hata envelope'u üretir.
- Request ID middleware tüm route'lara bağlanır.
- CORS origin listesi env'den gelir; boşsa her origin kabul edilir ve credentials açıktır.
- Swagger UI `/api/docs`, JSON `/api/docs-json` yolundadır.
- OpenAPI başlığı hâlâ `0.0.0-phase0` ve “foundation” açıklaması taşır; güncel yüzeyi yansıtmaz.

Global class-validator pipe yoktur. Controller'lar Zod şemalarını `safeValidate` ile açıkça kullanır. Bu tercih tutarlıdır, fakat her endpointin doğrulamayı gerçekten çağırması kod incelemesinde kontrol edilmelidir.

### 8.2 Modül listesi

API AppModule şu alanları yükler:

- database ve infrastructure,
- health/version,
- customer/staff auth,
- branch ve serviceability,
- catalog ve storage,
- cart ve pricing,
- checkout, loyalty ve payment,
- order ve notification,
- courier/delivery,
- refund ve reporting,
- customer ve admin,
- promotion,
- storefront home/content,
- gamification/spin,
- dining/table,
- support.

### 8.3 HTTP yüzeyi

Kod taramasında 33 controller ve yaklaşık 153 route bulundu. Alan bazında ana yüzey:

#### Sistem

- `GET /health/live`
- `GET /health/ready`
- `GET /version`
- Swagger: `/api/docs`, `/api/docs-json`

#### Müşteri kimliği

- Yöntem keşfi.
- Telefon OTP request/verify.
- E-posta/şifre register/login/forgot/reset/change/create.
- E-posta doğrulama request/verify.
- Google/Apple OAuth start/callback.
- Refresh, logout ve bağlı identity listesi.

#### Storefront katalog ve içerik

- Kategori, ürün listesi/detayı, builder ve alerjen sözlüğü.
- Home merchandising.
- Content document listesi/detayı.
- Kampanyalar ve kupon doğrulama.
- Newsletter subscribe/unsubscribe.
- Public product media proxy.

#### Sepet ve checkout

- Aktif sepeti getir.
- Satır ekle/güncelle/sil, sepeti temizle ve guest->customer merge.
- Sepet quote.
- Checkout quote, slotlar ve ödeme yöntemleri.
- Payment initialize ve checkout status.
- Checkout'a ait müşteri order confirmation.

#### Müşteri hesabı

- Profil ve tercihler.
- Adres CRUD.
- Favoriler.
- Sadakat bakiyesi ve club/welcome reward.
- Ateş Çarkı.
- Sipariş geçmişi, detay, timeline, kurye konumu ve reorder.
- Bildirim inbox/read/read-all.
- Support conversation/message.
- Table context/scan.

#### Admin

- Katalog: kategori, ürün, medya, alerjen, modifier group.
- Şube: CRUD, saatler, servis alanı, ürün bulunabilirliği.
- Sipariş: liste/detay, transition, reassign ve kitchen board.
- Courier/delivery create/assign/reassign/QR token.
- Customer ve club görünümü.
- Payment/refund.
- Promotion.
- Rapor: sales, branch, product, courier.
- User, role, permission ve role assignment.
- Audit ve business setting.

#### Kurye

- Teslimat liste/detay.
- QR claim.
- Pickup, on-the-way, deliver.
- Location upload.
- Performance ve navigation.

## 9. Kimlik doğrulama ve yetkilendirme

### 9.1 Müşteri oturumu

- Müşteri login akışları opaque refresh token üretir.
- Veritabanında yalnızca SHA-256 token hash'i, family ID, expiry ve revocation alanları saklanır.
- Auth guard Bearer değerini hash'leyerek session çözümlemesi yapar.
- Refresh, token rotasyonu ve logout/revocation servis kodunda mevcuttur.
- Web refresh tokenı `localStorage` içinde saklar ve Bearer olarak gönderir.
- Customer mobile refresh tokenı Expo SecureStore arkasındaki KV'de saklar; uygulama açılışında server refresh yapar.
- Mobil ağ hatasında gizli materyal korunur fakat private identity UI'dan gizlenir.

Riskler:

- Web tarafında uzun ömürlü bearer/refresh tokenın `localStorage` içinde olması XSS etkisini büyütür.
- Access token ile refresh token fiilen aynı opaque token gibi kullanılır; istemci modelinde ayrı alanlar olsa da bootstrap ikisine de refresh tokenı yazar.
- Genel dağıtık rate limit yoktur. OTP/password/reset için process-local `Map` tabanlı hit window vardır; birden fazla API instance'ında ortak limit sağlamaz ve restart ile sıfırlanır.
- Env şemasında JWT issuer/audience/key alanları bulunmasına rağmen kaynakta JWT imzalama/doğrulama implementasyonu yoktur.

### 9.2 Staff/kurye oturumu

- Şifreler Node `crypto.scrypt` ile hash'lenir.
- Login refresh token üretir ve Session tablosuna yazar.
- MFA doğrulaması yalnızca geliştirme bypass'ı açıkken başarılı olabilir; gerçek TOTP doğrulayıcı bağlı değildir.
- Üretilen access token şu biçimdedir: `staff-<uuid>-<timestamp>`.
- Auth guard yalnızca regex ile bu biçimi tanır, imza/expiry/session/account lookup yapmaz ve kullanıcıya **tüm permission'ları** verir.

Bu, üretim öncesi kapatılması gereken en yüksek öncelikli güvenlik boşluğudur. Token metnini üretebilen biri herhangi bir UUID ile staff principal ve tüm yetkileri elde edebilir.

### 9.3 Guard zinciri

- `AuthGuard`: principal oluşturur.
- `AccountStatusGuard`: principal üzerinde `ACTIVE` kontrol eder; veritabanından güncel hesap durumu okumaz.
- `RbacGuard`: decorator metadata'sındaki permission kodlarını principal set'i ile karşılaştırır.
- `ResourceScopeGuard`: yalnızca principal varlığını kontrol eder.
- Branch/customer/cart policy sınıfları ayrı erişim kontrolleri sunar; controller/service tarafından açıkça çağrılmalıdır.

Permission sözlüğü katalog, şube, sipariş, ödeme, sadakat, müşteri, promosyon, rapor, kurye, audit, kullanıcı ve ayar alanlarını kapsar. Kod içinde staff principal tüm permission set'iyle bootstrap edildiğinden veritabanındaki rol/permission ilişkileri aktif auth kararına bağlanmış değildir.

### 9.4 HTTP güvenlik eksikleri

- Helmet/security header kurulumu görülmedi.
- CSRF koruması yok; çoğu kimlik Bearer header kullandığı için klasik cookie-CSRF ana risk değildir, fakat CORS `credentials: true` ve boş origin listesinde tüm originlerin kabul edilmesi sıkılaştırılmalıdır.
- Global rate limiter yok.
- iyzico callback/webhook signature veya shared-secret doğrulaması yapmaz.
- Public medya proxy key/path güvenliğini controller katmanında ayrıca korumalıdır.
- Body limiti medya upload nedeniyle 14 MB; içerik türü ve gerçek image signature kontrolü storage akışında bulunur, fakat limit uygulama geneline açıktır.

## 10. API sözleşmeleri

### 10.1 Envelope

Başarılı tekil cevap:

```json
{
  "data": {},
  "meta": { "requestId": "uuid" }
}
```

Liste cevapları `meta.pagination` içinde `page`, `pageSize`, `totalItems`, `totalPages` taşır.

Hata cevabı:

```json
{
  "error": {
    "code": "STABLE_ERROR_CODE",
    "message": "Human readable message",
    "details": null,
    "requestId": "uuid"
  }
}
```

### 10.2 Request ve correlation ID

Ortak client her istekte UUIDv7 `X-Request-Id` ve `X-Correlation-Id` üretir. Middleware bunları AsyncLocalStorage request context'ine alır ve response header'a yazar.

Ancak uygulama cevabı bakımından sözleşme şu anda bozulmuştur: 27 controller/service dosyası `meta.requestId` içinde aynı sabit UUID'yi kullanır. Yani header/log request ID ile JSON body'sindeki request ID çoğu endpointte aynı değildir. Yeni geliştirme sabit ID kalıbını kopyalamamalı; gerçek request context kullanılmalıdır.

### 10.3 Ortak API client

`@fastfood/api-client`:

- base path'i koruyarak URL birleştirir,
- query parametrelerini yazar,
- Bearer, request/correlation ve idempotency header'larını ekler,
- bigint değerleri JSON'da stringe çevirir,
- 30 saniye timeout uygular,
- error envelope'u ve başarılı cevabı Zod ile doğrular,
- network, timeout ve API hatalarını farklı sınıflara ayırır.

İstemciye yeni endpoint eklerken cevap şemasını ilgili uygulamadaki geniş `schemas.ts` kopyasına eklemek yerine mümkün olduğunca `packages/contracts` içinde ortaklaştırmak gerekir. Şu anda storefront, admin ve customer-mobile'da büyük ve kısmen tekrar eden schema dosyaları vardır.

## 11. Para, kimlik ve zaman sözleşmeleri

### 11.1 Para

- DB: `BIGINT`.
- Prisma/TypeScript: `bigint`.
- JSON: kuruş/minor unit cinsinden base-10 integer string.
- Float/Number ile para hesabı yapılmamalı.
- Basis point oranları half-up yuvarlanır: `(base * bps + 5000) / 10000`.
- Varsayılan para birimi `TRY`.
- Varsayılan minimum sağlayıcı tahsilatı 100 minor unit.
- Sadakat varsayılan olarak ödenecek tutarın en fazla %50'sini karşılar.
- Pickup indirimi 1.000 bps, yani %10'dur.
- Tip 0 ile 50.000 minor unit arasında sınırlandırılır.

### 11.2 Kimlikler

- Veritabanı varsayılanı çoğu modelde PostgreSQL `uuidv7()`.
- TypeScript'te domain ID'leri branded string tipleridir.
- Bazı bellek-içi fallback'ler ve create yolları `Math.random()` ile UUID benzeri metin üretir; bunlar kriptografik veya gerçek UUIDv7 değildir.
- `randomUUID()` kullanan checkout gibi yollar UUIDv4 üretir; DB tarafından üretilen UUIDv7 ile uygulama tarafından üretilen UUIDv4 aynı sistemde birlikte yaşar.

### 11.3 Zaman

- Veritabanı timestamp alanları timestamptz yaklaşımındadır.
- API ISO-8601 offset'li UTC string bekler.
- İş zamanı `Europe/Istanbul` olarak sabitlenmiştir.
- Şube saatleri ve scheduled checkout slotları İstanbul zamanına göre hesaplanır.

## 12. Fiyatlandırma, sepet ve checkout

### 12.1 Sepet

Sepet guest session ID veya customer user ID ile sahiplenilir. Satır snapshot'ları:

- ürün/variant kimliği,
- ürün adı,
- unit price,
- seçilmiş modifier'lar,
- ingredient removal seçimleri,
- currency,
- quantity taşır.

Bu snapshot yaklaşımı katalog fiyatı veya adı değişse bile sepet/sipariş geçmişinin yeniden üretilebilmesini sağlar.

Guest cart `X-Session-Id` ile bulunur. Login sonrası merge endpointi guest sepetini müşteri sepetine taşımayı amaçlar.

### 12.2 Fiyat motoru

Saf `computePricingQuote` fonksiyonu şu sırayı uygular:

1. Base + modifier unit gross.
2. Quantity ile line gross.
3. Product/line discount.
4. Cart discount; subtotalı aşamaz.
5. Net merchandise subtotal.
6. Minimum order uygunluğu.
7. Pickup indirimi.
8. Delivery fee.
9. Loyalty redemption sınırları.
10. Provider minimum charge uyarlaması.
11. Tip eklenmesi.

### 12.3 Checkout

Delivery için latitude/longitude zorunludur. Aktif service area'lar process içinde ray-casting point-in-polygon ile değerlendirilir; overlap halinde düşük `priority` kazanır. PostGIS şemada etkin olmasına rağmen routing sorgusu PostGIS kullanmaz.

Pickup için aktif ve sipariş kabul eden şube seçilir. Scheduled zaman şube çalışma saatlerine ve horizon kurallarına göre kontrol edilir.

Checkout session; şube, fulfillment, fiyat kalemleri, loyalty, tip, guest bilgisi, teslimat tercihleri, koordinat/adres ve item snapshot'larını saklar. Ödeme `PAID` olunca sessiondan Order üretilir.

## 13. Ödeme ve refund

### 13.1 Mevcut ödeme davranışı

Payment port vardır fakat tek adaptör `IyzicoSandboxAdapter`dır:

- Provider çağrısı yapmaz.
- `sandbox-<idempotency-key>` biçiminde synthetic payment ID üretir.
- Status'ları process-local `Map` içinde tutar.
- Redirect URL sentetik sandbox URL'dir.
- Callback veya webhook gelen `providerPaymentId` ve status değerini doğrudan uygular.

Storefront ödeme paneli PAN, expiry, CVC ve card holder alanlarını kendi React state'inde toplar. Bu değerler backend'e gönderilmez. Submit yalnızca `/integrations/iyzico/webhook` endpointine `{ providerPaymentId, status: "PAID" }` yollar. Dolayısıyla:

- gerçek hosted iyzico formu yoktur,
- 3DS yoktur,
- gerçek kart doğrulaması yoktur,
- herhangi bir istemci bilinen payment ID'yi `PAID` yapabilir,
- panelin “kart FASTFOOD'a gitmez” açıklaması teknik olarak değerlerin networke gönderilmemesi yönünden doğru olsa da alanlar FASTFOOD DOM/state'inde bulunduğu için hosted form iddiası doğru değildir.

Bu akış yalnızca yerel/sandbox demonstrasyonu olarak görülmelidir.

### 13.2 İdempotency

`IdempotencyRecord` ve servis vardır. Ancak initialize akışı `lookup -> provider call -> payment create -> store` sırasını transaction/lock olmadan yürütür. Aynı key ile eşzamanlı iki istek duplicate provider ve PaymentAttempt oluşturabilir. Request hash uyuşmazlığı kontrol edilmez.

### 13.3 Refund

Refund servisi:

- yalnızca `PAID` PaymentAttempt için işlem yapar,
- pozitif amount ister,
- daha önceki failed olmayan refund toplamını düşer,
- kalan refundable tutarın aşılmasını engeller,
- şu anda gerçek provider refund çağrısı yapmadan kaydı doğrudan `SUCCEEDED` oluşturur.

Eşzamanlı iki refund isteği için row lock/serializable transaction yoktur; ikisi aynı kalan bakiyeyi görerek over-refund oluşturabilir. Üretim öncesi transaction ve provider state machine gereklidir.

## 14. Sipariş ve teslimat durum makineleri

### 14.1 Sipariş

Durumlar:

```text
DRAFT / CREATED
  -> PAYMENT_PENDING
  -> PAID | PAYMENT_FAILED | CANCELLED
PAID
  -> BRANCH_ASSIGNED
  -> BRANCH_ACCEPTED | REJECTED
  -> PREPARING
  -> READY_FOR_COURIER
  -> COURIER_ASSIGNED
  -> PICKED_UP
  -> ON_THE_WAY
  -> DELIVERED
```

Refund kolu `REFUND_PENDING -> PARTIALLY_REFUNDED -> REFUNDED` biçimindedir. Her transition backend state machine ile doğrulanır ve OrderEvent timeline'a yazılabilir. Kitchen board yalnızca branch-assigned, accepted, preparing ve ready-for-courier durumlarını gösterir.

### 14.2 Şube atama

OrderBranchAssignment önceki/yeni şube, reason ve actor bilgisi tutar. Reassignment ayrı permission ister. Serviceability, branch aktifliği ve sipariş kabul durumu kararın parçasıdır.

### 14.3 Delivery

Delivery durumu:

```text
UNASSIGNED -> ASSIGNED -> PICKED_UP -> ON_THE_WAY -> DELIVERED
                 |            |
                 +-> UNASSIGNED/CANCELLED
```

QR claim token hash'i, expiry ve consume bilgisi ile saklanır. DeliveryAssignment geçmişi korunur. CourierLocationPoint konum geçmişi taşır.

## 15. Loyalty, promosyon ve engagement

- LoyaltyLedgerEntry earn/reserve/release/redeem/adjust/expire türlerini taşır.
- LoyaltyReservation checkout sırasında puanı geçici tutar.
- Loyalty işlemlerinin kritik bölümlerinde Prisma interactive transaction kullanılır; transaction kullanımı kod tabanında sınırlı sayıdadır.
- Club katmanı tier, welcome reward ve spendable points ayrımını sürdürür.
- Promotion türleri yüzde, sabit tutar, ücretsiz teslimat ve benzeri modelleri şemada taşır.
- CouponRedemption kullanımı kaydeder.
- Spin campaign/prize/play modelleri ve idempotent spin endpointi vardır.
- Favoriler, newsletter, reviews, social proof, merchandising ve combo offers ayrı tablolardır.
- Dining table yalnızca masa bağlamı ve scan kaydı sağlar; sipariş fulfillment türü olarak tam dine-in akışı bulunmaz.
- Notification alanı uygulama içi inbox'tır; FCM/APNs sender yoktur.
- Support konuşmaları ve client request ID ile idempotent mesajlaşma vardır; gerçek agent realtime transport yoktur.

## 16. Veri modeli

Prisma şeması 1.486 satır, 74 model ve 5 enum içerir. PostgreSQL extension'ları PostGIS ve `uuid-ossp`; migration'larda UUIDv7 desteği de kullanılır.

### 16.1 Identity ve erişim

- `User`
- `StaffProfile`
- `CustomerProfile`
- `CustomerCredential`
- `AuthIdentity`
- `EmailVerificationChallenge`
- `PasswordResetChallenge`
- `CustomerPreference`
- `Session`
- `Role`, `Permission`, `RolePermission`, `UserRole`
- `UserBranchScope`
- `Address`

### 16.2 Platform altyapısı

- `AuditLog`
- `OutboxEvent`
- `BusinessSetting`
- `IdempotencyRecord`
- `FoundationProbe`

### 16.3 Katalog

- `Category`, `Product`, `ProductMedia`, `ProductVariant`
- `Allergen`, `ProductAllergen`
- `ModifierGroup`, `Modifier`, `ProductModifierGroup`
- `IngredientRemovalOption`
- `BranchProductAvailability`

### 16.4 Şube ve servis alanı

- `Branch`
- `BranchOperatingHours`
- `ServiceArea`

Service area geometry JSONB GeoJSON olarak tutulur. Spatial extension olmasına karşın çalışma zamanı route seçimi uygulama belleğinde geometri hesaplar.

### 16.5 Sepet, checkout ve ödeme

- `Cart`
- `CartLineItem`, `CartLineModifier`, `CartLineRemoval`
- `CheckoutSession`
- `PaymentAttempt`
- `Refund`

### 16.6 Sadakat ve promosyon

- `LoyaltyLedgerEntry`, `LoyaltyReservation`, `LoyaltyTier`
- `Promotion`, `CouponRedemption`
- `WelcomeRewardGrant`
- `SpinCampaign`, `SpinPrize`, `SpinPlay`

### 16.7 Sipariş ve teslimat

- `Order`
- `OrderItem`, `OrderItemModifier`, `OrderItemRemoval`
- `OrderEvent`
- `OrderBranchAssignment`
- `CourierProfile`
- `Delivery`, `DeliveryAssignment`
- `QrClaimToken`
- `CourierLocationPoint`

### 16.8 Storefront içerik ve müşteri engagement

- `ProductMerchandising`
- `StorefrontContentDocument`
- `StorefrontComboOffer`, `StorefrontComboOfferItem`
- `StorefrontPublishedReview`
- `StorefrontSocialProof`
- `NewsletterSubscription`
- `CustomerFavorite`
- `Notification`
- `DiningTable`, `DiningTableScan`
- `SupportConversation`, `SupportMessage`

### 16.9 Migration zinciri

17 migration sırası kavramsal olarak:

1. extension'lar,
2. ilk temel şema,
3. identity entity'leri,
4. katalog ve şube,
5. sepet,
6. checkout/payment/loyalty,
7. order/notification,
8. courier/delivery,
9. refund,
10. promosyon,
11. storefront merchandising,
12. social hero image,
13. checkout fulfillment preferences,
14. customer auth identities,
15. favorites,
16. club engagement,
17. storefront completeness.

Migration dosyaları canonical kaynak kabul edilmeli; schema üzerinde ad-hoc `db push` ile drift yaratılmamalıdır.

## 17. Kalıcılık ve transaction değerlendirmesi

`DatabaseModule` globaldir; normal AppModule runtime'ında Prisma bütün servislere sağlanır. Bu nedenle optional injection kullanan servisler production-style runtime'da Prisma yolunu seçer. Bununla birlikte 29 dosyada `PrismaService | null` bulunur ve çoğunda bellek-içi alternatif vardır.

Olumlu taraflar:

- Geniş model kapsamı ve gerçek CRUD kalıcılığı.
- Auth challenge/session, katalog, sepet, checkout, order, delivery, refund, reporting ve engagement için Prisma yolları bulunur.
- Loyalty'nin bazı kritik rezervasyon/consume işlemleri transaction kullanır.
- Audit ve outbox için Prisma writer vardır.

Riskler:

- Aynı servisin memory ve Prisma dalları her zaman semantik olarak eşdeğer değildir.
- Bazı testler yalnızca memory branch'i kanıtlar.
- API genelinde transaction kullanımı azdır; çok tablolı iş akışları atomik değildir.
- Outbox writer kendi Prisma client'ıyla ayrı create yapar; iş mutation'ının transaction client'ını kabul etmez.
- Sipariş outbox yayınları `void` ile fire-and-forget yapılır; hata kaybolabilir ve API kapanırken event yazılmayabilir.
- Cart outbox awaited olsa da cart mutation ile aynı DB transaction içinde değildir.
- `markPublished(eventIndex)` kimlik yerine sıralı index kullanır; eşzamanlı worker'larda güvenli değildir.
- Birden fazla servis ID fallback'inde `Math.random()` kullanır.

## 18. Uygulama yüzeyleri

### 18.1 Storefront Web

Next.js App Router route'ları:

- home, menu, search, deals, branches,
- builder ve product detail,
- cart, address, checkout, payment,
- order confirmation, order detail ve order list,
- auth ve OAuth callback,
- account ana sayfa, address, club, favorites, notifications, security, settings, spin, support, table,
- legal ve table QR context.

Özellikler client-side `ApiClient` ve uygulamaya özel Zod schema dosyaları üzerinden API'ye bağlanır. Guest session `localStorage` ve SameSite=Lax cookie içinde tutulur. Customer refresh token `localStorage` içindedir.

Tasarım dili koyu kömür yüzey, hardal ve flame turuncu; Anton başlık ve Plus Jakarta Sans gövde yazı tipleri kullanır. Skip link, focus-visible ve reduced-motion kuralları vardır.

Storefront bileşenleri `apps/storefront-web/src/components/storefront` içinde uygulamaya özel geliştirilmiştir.

### 18.2 Customer Mobile

Expo Router yüzeyleri web ile büyük ölçüde parity hedefler:

- tab'ler: home, builder, search, orders, account,
- cart, checkout, payment/return,
- order detail/confirmation,
- auth/callback/reset,
- account address/settings/security/favorites/club/spin/notifications/support,
- product, branches, deals,
- table home/scan/code,
- legal/allergens.

Session:

- Secret refresh token SecureStore'da,
- guest ID AsyncStorage benzeri durable KV'de,
- app bootstrap'ta refresh endpointi ile doğrulama,
- background->active dönüşünde offline bootstrap retry.

Tema `theme.ts` içinde uygulamaya özgüdür ve ortak design-token paketinden bağımsızdır. Bu bilinçli ayrım kodda açıktır, ancak renk/spacing değişikliklerinde web-mobile drift kontrolü gerekir.

### 18.3 Admin Web

Admin route'ları:

- dashboard,
- orders/detail ve kitchen,
- catalog categories/products/detail/media/modifiers/allergens,
- branches/detail/availability/service areas,
- customers/detail,
- couriers,
- loyalty ve promotions/detail,
- payments/detail ve refunds,
- reports,
- users, roles, audit, settings,
- login ve access-denied.

Admin `@fastfood/ui-web` kullanır; yeni ops-shell yanında eski scaffold CSS sınıfları da kodda yaşamaktadır. Bazı e2e testleri eski A0 scaffold'ın production route'lara dönmemesini kontrol eder.

Staff access/refresh/user ID `localStorage` içinde saklanır. Auth güvenliği backend staff token implementasyonu düzeltilmeden production için yeterli değildir.

### 18.4 Courier Mobile

Route'lar:

- login,
- deliveries list/detail,
- QR claim.

Kurye uygulaması staff auth endpointlerini kullanır ve sessionı yalnızca process belleğinde tutar; uygulama restartında kalıcı oturum yoktur. API wrapper ayrıca `X-User-Id` gönderir, fakat güncel AuthGuard bu header'a güvenmez. Kod yorumuyla gerçek backend davranışı burada eskimiştir.

Uygulama şu anda küçük, test kapsamı yok denecek kadar az ve gerçek kurye auth ayrımı yerine staff auth üzerinden yürür.

### 18.5 Worker

Worker Nest application context açar, Redis ping yapar, placeholder BullMQ kuyruğu oluşturur, job count okur ve hemen kapanır. Uzun yaşayan consumer değildir. Bu yüzden:

- notification gönderimi,
- outbox dispatch,
- ödeme reconciliation,
- media processing,
- retry/dead-letter

çalışmaz.

## 19. Tasarım sistemi değerlendirmesi

Kod tabanında iki paralel katman vardır:

1. `design-tokens` + `ui-web` + `ui-native`: genel shared sistem.
2. BURGER HOME uygulama-özel sistemleri: storefront CSS theme ve customer-mobile `theme.ts`.

Admin ve courier shared sistemleri kullanır. Storefront ve customer mobile marka tasarımını kendi içinde taşır.

UI değişikliğinde önce hedef yüzeyin gerçekten hangi katmanı import ettiği bulunmalıdır. Yalnızca `design-tokens` değiştirmek de customer-mobile temasını otomatik değiştirmez.

## 20. Dosya depolama ve medya

Storage bir port arkasındadır. Runtime `S3ObjectStorageAdapter` kullanır ve MinIO/S3 için AWS Signature V4'ü manuel üretir.

- Bucket lazy create edilir.
- Product media PUT/GET desteklenir.
- Public media API üzerinden proxy edilir.
- Image magic-byte/content detection vardır.

Risk: `publicUrl()` env'deki `S3_PUBLIC_ENDPOINT` değerini kullanmaz; URL'yi daima `http://localhost:<API_PORT><API_BASE_PATH>/public/media/...` olarak üretir. Bu, farklı host/domain veya reverse proxy altında yanlış kalıcı URL üretir.

## 21. Gözlemlenebilirlik

Ortak Pino logger:

- service/environment metadata,
- ISO timestamp,
- development pretty transport,
- password, OTP, bearer/cookie, kart, API key, secret ve private key alanlarında redaction sağlar.

AsyncLocalStorage request context request ID, correlation ID, actor ve branch taşıyabilir. Ancak Nest built-in Logger birçok yerde kullanılmaya devam eder; ortak Pino logger ve request context tüm modüllerde tutarlı kullanılmaz. API bootstrap Fastify logger'ı kapatır.

OpenTelemetry yalnız env şemasında `OTEL_ENABLED` olarak vardır; gerçek instrumentation görülmedi.

## 22. Geliştirme denetleyicisi

`packages/dev-controller`, runtime ürün uygulamalarının bağımlılığı olmayan repository-native bir CLI'dır. Temel özellikleri:

- tek komutta tek bounded transition,
- JSON state validation,
- file lock ve atomic write,
- manifest scope kontrolü,
- evidence kaydı,
- retry budget ve failure classification,
- pending/in-progress/verifying/repair/technically-complete/blocked/human-review durum makinesi,
- dry-run ve JSON çıktı.

Controller, kod gereği repo kökündeki durum/manifest klasörleri ve bir Markdown status dosyasına bağlanmıştır. Bu rapor söz konusu Markdown içeriğini analiz etmemiştir. Controller'ı çalıştırmadan önce onun authorization parser'ının güncel repo durumunu nasıl yorumladığı ayrıca doğrulanmalıdır.

## 23. Konfigürasyon

### 23.1 Server env grupları

- Runtime: `NODE_ENV`, `LOG_LEVEL`, `APP_TIMEZONE`.
- API: host, port, base path, CORS origins, dev secret.
- Database: primary ve optional test URL.
- Redis.
- S3/MinIO endpoint, public endpoint, region, bucket ve credentials.
- iyzico base URL, keys ve sandbox flag.
- OTP provider/fixed code/pepper/TTL/attempt/cooldown/rate limit.
- Storefront public URL.
- Google ve Apple OAuth credentials/callback'leri.
- Maps provider/key.
- Access/refresh TTL ve JWT metadata/key path'leri.
- Default rate limit.
- OTEL flag.

Şema eksik zorunlu anahtarda fail-fast davranır. Bununla birlikte bazı tanımlı değerler henüz runtime implementasyonuna bağlı değildir: gerçek JWT, global rate limit, OTEL, gerçek iyzico ve bazı OAuth/provider davranışları.

### 23.2 Client env

- API base URL,
- app name,
- `Europe/Istanbul`,
- maps provider ve public key.

Client bundle'a yalnız public-prefixed değerler girmelidir.

## 24. Seed ve geliştirme verisi

Seed kodu deterministic UUID'lerle şunları kurar:

- örnek burger/side/drink kategorileri ve ürünler,
- ürün görselleri, alerjenler ve customization,
- downtown branch, çalışma saatleri, servis alanı ve availability,
- staff ve courier kullanıcıları,
- HQ ve courier rolleri/permission bağlantıları,
- storefront home/completeness içeriği,
- club engagement verisi.

Seed tekrar çalıştırılabilir upsert ağırlıklı tasarlanmıştır. Login ekranları geliştirme hesabını ve varsayılan şifreyi UI'da açıkça gösterir; bu davranış yalnız yerel geliştirme için uygundur.

## 25. CI/CD

GitHub Actions workflow'u push/PR üzerinde:

1. Node/pnpm kurar.
2. Frozen lockfile ile install yapar.
3. Format, lint, typecheck, unit test ve build çalıştırır.
4. Prisma validate yapar.
5. Playwright Chromium kurar.
6. Docker ile PostgreSQL/PostGIS, Redis ve MinIO açar.
7. Migration deploy ve seed yapar.
8. API integration testlerini çalıştırır.
9. API ve web yüzeylerini açıp e2e çalıştırır.
10. Cleanup yapar.

Workflow'da deployment işi yoktur. Mobil native Android/iOS compile veya cihaz testi CI'da yoktur.

## 26. Doğrulanmış kalite durumu

21 Eylül 2026 tarihinde bu analiz sırasında çalıştırılan kapılar:

| Kontrol                 | Sonuç            | Kanıt özeti                                                                   |
| ----------------------- | ---------------- | ----------------------------------------------------------------------------- |
| `pnpm lint`             | PASS             | Turbo 29/29 task başarılı; React Native dependency parse uyarıları var        |
| `pnpm typecheck`        | PASS             | Turbo 29/29 task başarılı                                                     |
| `pnpm test:unit`        | PASS             | Turbo 27/27 task başarılı; API 44 dosya/268 test dahil                        |
| `pnpm test:integration` | PASS             | 5 dosya, 12 test başarılı                                                     |
| `pnpm db:validate`      | PASS             | Prisma schema valid                                                           |
| `pnpm build`            | PASS with caveat | 17/17 task; web/API build geçti, mobil task gerçek native build değildir      |
| `pnpm e2e:web`          | FAIL/INTERRUPTED | 86 testten 52'nciye kadar 28 pass, 5 skip, 19 fail; süre nedeniyle durduruldu |

### 26.1 Doğrulama uyarıları

- ESLint React Native `node_modules` dosyalarını parse etmeye çalışırken çok sayıda parser warning üretir; task yine 0 çıkar.
- Turbo, typecheck/test task'larında output tanımı olmadığı için cache warning verir.
- Vitest configlerinde kaldırılmış `poolOptions` kullanımı uyarısı vardır.
- Bazı Vite configleri native config loader için ESM/CommonJS uyarısı verir.
- Admin Next config `experimental.typedRoutes` yerine yeni `typedRoutes` alanına taşınmalıdır.
- Mobil build scriptindeki backtick yüzünden analizde `pnpm build`, istemeden Expo prebuild çalıştırıp `android/ios` klasörlerini temizleyip yeniden oluşturdu. Script exit 0 verdi; gerçek Gradle/Xcode build yapılmadı.
- E2E run sırasında admin smoke senaryoları geçti; customer storefront auth, checkout, club ve completeness senaryolarında ardışık başarısızlıklar görüldü. Çalışan storefront ekran görüntülerinde CSS'in uygulanmadığı bir durum da gözlendi. Bu sonuç tam suite tamamlanmadan kesildiği için kalan testlerin durumu bilinmiyor.

## 27. Capability registry

Kod içindeki müşteri capability registry 84 giriş taşır:

- Web: 69 implemented, 3 intentional deviation, 4 provider-blocked, 4 deferred, 4 not relevant.
- Mobile: 71 implemented, 3 intentional deviation, 5 provider-blocked, 4 deferred, 1 not relevant.

Bu registry lint/test ile şekil ve parity kontrolü için yararlıdır; ancak “IMPLEMENTED” etiketi runtime güvenliği veya provider readiness kanıtı değildir. Örneğin registry iyzico hosted/card UI'ı implemented olarak işaretlerken fiilî kod sentetik sandbox webhook'u kullanır. Geliştirme kararı verirken registry durumunu ilgili endpoint, client call, kalıcılık ve e2e kanıtıyla doğrulamak gerekir.

## 28. Önceliklendirilmiş teknik riskler

### P0 — Üretim veya güvenlik engelleyicileri

1. **Staff token taklit edilebilir.** Regex eşleşen imzasız token tüm permission'ları alıyor.
2. **Gerçek MFA yok.** Bypass kapalıyken doğrulama her zaman başarısız; açıkken her 6 haneli kod kabul ediliyor.
3. **Webhook doğrulaması yok.** İstemci payment ID göndererek ödemeyi `PAID` yapabiliyor.
4. **Gerçek ödeme adaptörü yok.** Sandbox status process restartında kaybolur.
5. **Kart UI PCI yanıltıcılığı.** Birinci taraf DOM/state PAN/CVC topluyor; hosted form değil.
6. **Outbox tüketilmiyor ve atomik değil.** Kritik eventler kaybolabilir veya iş mutation'ından ayrışabilir.
7. **Git baseline yok.** Güvenilir değişiklik geçmişi/rollback bulunmuyor.

### P1 — Veri bütünlüğü ve çalışma güvenilirliği

1. Refund remaining amount kontrolü transaction/lock olmadan yarışa açıktır.
2. Payment idempotency check-and-create atomik değildir.
3. Order/outbox mutation aynı transactionda değildir; sipariş emit'leri awaited değildir.
4. Request body `meta.requestId` sabittir ve gözlemlenebilirlik zincirini bozar.
5. Global rate limit, security header ve distributed auth throttling yoktur.
6. Role/permission ve account status DB verisi staff auth kararına bağlanmamıştır.
7. Process-local fallback ve cache haritaları horizontal scaling ile tutarsızlaşır.
8. Serviceability PostGIS yerine tüm alanları application memory'de tarar.
9. Public media URL üretimi localhost'a sabittir.
10. E2E suite yeşil değildir.

### P2 — Bakım ve geliştirici deneyimi

1. Mobil build scriptleri kabuk command substitution hatası taşır.
2. Worker isim ve bağımlılık olarak var, gerçek worker değildir.
3. Büyük schema dosyaları web/admin/mobile arasında tekrar eder.
4. Stale phase yorumları ve Swagger metadata kodun gerçek olgunluğunu yanlış anlatır.
5. React Native lint dependency warning gürültüsü gerçek hataları örtebilir.
6. Courier mobile için anlamlı test yoktur.
7. Native compile/device test CI kapsamı yoktur.
8. Workspace içindeki çok büyük generated/browser profile klasörleri bakım maliyeti yaratır.

## 29. Güçlü taraflar

- Net workspace ayrımı ve ortak package sınırları.
- Strict TypeScript ve geniş otomatik test tabanı.
- Para için bigint/minor-string sözleşmesi.
- Katalog, sepet ve siparişte snapshot yaklaşımı.
- Açık order ve delivery durum makineleri.
- Zod ile runtime API response doğrulaması.
- Refresh token hash ve rotation/revocation veri modeli.
- Permission sözlüğü ve guard/policy katmanları.
- Audit/outbox için hazırlanmış veri modelleri ve adapter arayüzleri.
- Deterministic seed ve gerçek PostgreSQL entegrasyon testleri.
- Web/mobile müşteri capability parity registry'si.
- Hassas log alanları için merkezi redaction.
- Storefront/customer-mobile arasında geniş ürün özelliği parity'si.

## 30. Bir AI geliştirici için çalışma rehberi

### 30.1 İlk açılışta

1. Bu raporu oku.
2. `git status` ve `git rev-parse --verify HEAD` ile baseline durumunu doğrula.
3. Hedef özelliğin uygulama, API modülü, Prisma modeli ve testlerini birlikte bul.
4. Değişiklikten önce yakın kaynak kodu ve testleri oku; isim benzerliğine göre yeni helper üretme.
5. Hedef alanın memory ve Prisma branch'lerinin ikisini de kontrol et.
6. Para alanında `number` veya float kullanma.
7. Customer davranışında storefront-web ve customer-mobile etkisini birlikte değerlendir.
8. Permission, ownership, branch scope ve state transition kontrollerini server tarafında tut.
9. Provider çağrısını doğrudan controller'a koyma; port/adapter arkasında tut.
10. Kritik write akışında transaction, idempotency ve outbox atomikliğini birlikte tasarla.

### 30.2 Görev türüne göre başlangıç noktaları

#### Auth/security

- `apps/api/src/modules/auth`
- `apps/api/src/common/crypto`
- `apps/api/prisma/schema.prisma`: User/Session/Role/Permission
- `apps/storefront-web/src/lib/api.ts`
- `apps/customer-mobile/lib/session.ts` ve `lib/auth.ts`
- `apps/admin-web/src/lib/api.ts`
- `apps/courier-mobile/lib/session.ts`

#### Katalog

- `apps/api/src/modules/catalog`
- `apps/api/src/modules/admin/admin-catalog.controller.ts`
- Product/Category/Variant/Modifier/Allergen modelleri
- storefront/customer product schema ve PDP bileşenleri

#### Sepet/fiyat

- `apps/api/src/modules/cart`
- `apps/api/src/modules/pricing`
- Cart ve line snapshot modelleri
- storefront/customer cart, builder ve PDP akışları

#### Checkout/payment

- `apps/api/src/modules/checkout`
- `apps/api/src/modules/payment`
- `apps/api/src/modules/loyalty`
- CheckoutSession/PaymentAttempt/IdempotencyRecord
- iki müşteri istemcisindeki checkout/payment sayfaları

#### Order/courier

- `apps/api/src/modules/order`
- `apps/api/src/modules/courier`
- state machine dosyaları
- admin kitchen/order sayfaları
- customer tracking ve courier-mobile

#### Admin UI

- `apps/admin-web/src/app`
- `apps/admin-web/src/components/ops`
- `apps/admin-web/src/lib/api.ts` ve `schemas.ts`
- `packages/ui-web`

#### Storefront UI

- `apps/storefront-web/src/app`
- `apps/storefront-web/src/components/storefront`
- `apps/storefront-web/src/lib/storefront`
- `apps/storefront-web/src/app/globals.css`

#### Customer mobile

- `apps/customer-mobile/app`
- `apps/customer-mobile/components`
- `apps/customer-mobile/lib`
- `apps/customer-mobile/theme.ts`

#### Tasarım sistemi

- Admin/genel web: `packages/design-tokens` + `packages/ui-web`.
- Courier/native genel: `packages/design-tokens` + `packages/ui-native`.
- Storefront/customer brand: uygulama-özel theme kaynakları.

### 30.3 Değişiklik sırasında korunacak invariants

- Money DB'de bigint, JSON'da integer string.
- ID boundary'de UUID doğrulaması.
- API success/error envelope yapısı.
- State transitionlar yalnız backend state machine üzerinden.
- Guest sepeti `X-Session-Id`, customer kaynağı server-resolved principal ile.
- Client gönderdiği user/customer ID güven kaynağı değildir.
- Admin write permission ve resource/branch scope kontrolü gerektirir.
- Catalog/order satırlarında fiyat ve ad snapshot'ları korunur.
- Provider işlemleri idempotent ve doğrulanmış callback ile tamamlanır.
- Secret/OTP/PAN/CVC loglanmaz veya uygulama state'inde tutulmaz.
- Customer capability değişikliği hem web hem mobilde ele alınır.

### 30.4 Minimum doğrulama dizisi

Kod değişikliğinin kapsamına göre en az:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm db:validate
pnpm build
```

Veri tabanı/API davranışı değişiyorsa:

```bash
pnpm infra:up
pnpm db:migrate:deploy
pnpm db:seed
pnpm test:integration
```

Müşteri veya admin akışı değişiyorsa çalışan API/storefront/admin üzerinde hedef Playwright spec'i, ardından mümkünse tam `pnpm e2e:web` çalıştırılmalıdır.

Mobil için kök `pnpm build` sonucuna güvenilmemelidir; Android Gradle ve iOS/Xcode gerçek native buildleri ayrıca yapılmalıdır. Önce mobil build scriptlerindeki backtick hatası düzeltilmelidir.

## 31. Önerilen geliştirme sırası

Yeni ürün özelliği eklemeden önce önerilen teknik kapanış sırası:

1. Git baseline ve remote/backup düzenini kur.
2. Staff/courier için imzalı, süreli, server-resolved access token ve gerçek MFA/role lookup uygula.
3. Gerçek iyzico adapter, hosted/3DS redirect/form ve imzalı webhook doğrulaması uygula; sahte card formunu kaldır.
4. Payment/refund/idempotency concurrency kurallarını transaction ve unique/lock stratejileriyle kapat.
5. Outbox writer'ı transaction client alacak şekilde düzenle ve kalıcı worker consumer ekle.
6. Sabit request ID'leri gerçek request context ile değiştir.
7. Global rate limit/security header/CORS production politikasını ekle.
8. Memory fallback'leri test double/repository sınırına taşı; runtime servislerden ayır.
9. Mobil build scriptlerini düzelt ve gerçek native CI gate'i ekle.
10. Playwright başarısızlıklarını kök nedenleriyle kapatıp tam suite'i yeşile getir.
11. S3 public URL, PostGIS routing ve observability/OTEL eksiklerini tamamla.

## 32. “Bitti” sayılmaması gereken durumlar

Aşağıdakiler tek başına tamamlanma kanıtı değildir:

- Typecheck geçmesi,
- `pnpm build` exit 0 vermesi,
- capability registry'de `IMPLEMENTED` yazması,
- endpointin 200 dönmesi,
- memory branch unit testinin geçmesi,
- Prisma modelinin mevcut olması,
- UI sayfasının render edilmesi,
- sandbox ödeme akışının tamamlanması.

Bir iş akışının tamamlanması için ilgili source path, gerçek persistence, negatif yetki/ownership testleri, concurrency/idempotency, istemci parity ve uygun integration/e2e kanıtı birlikte değerlendirilmelidir.

## 33. Hızlı komut referansı

```bash
# Kurulum
pnpm install --frozen-lockfile

# Yerel altyapı
pnpm infra:up
pnpm infra:ps
pnpm infra:logs
pnpm infra:down

# Veritabanı
pnpm db:generate
pnpm db:validate
pnpm db:migrate
pnpm db:migrate:deploy
pnpm db:seed

# Geliştirme
pnpm dev:api
pnpm dev:storefront
pnpm dev:admin
pnpm dev:stack:up
pnpm dev:stack:down

# Kalite
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm e2e:web
```

`pnpm db:reset` migration resetini `--force` ile çalıştırır ve yerel veriyi siler; açıkça istenmeden kullanılmamalıdır.

## 34. Son değerlendirme

FASTFOOD, basit bir prototipten daha ileride; kapsamlı veri modeli, çalışan multi-client yüzeyleri, gerçek PostgreSQL kalıcılığı, state machine'ler, paylaşılmış API sözleşmeleri ve geniş test tabanı olan ciddi bir geliştirme kod tabanıdır. En büyük sorun özellik eksikliğinden çok **geliştirme/sandbox mekanizmalarının üretim benzeri yüzeylerin içinde kalmış olmasıdır**.

Bir sonraki geliştirici veya AI model projeye doğrudan katkı yapabilir; fakat önce P0 güvenlik/ödeme/asenkronluk boşluklarını anlamalı, değişikliği gerçek runtime path üzerinde doğrulamalı ve tam e2e durumunu yeşile getirmeden sistemi release-ready olarak değerlendirmemelidir.
