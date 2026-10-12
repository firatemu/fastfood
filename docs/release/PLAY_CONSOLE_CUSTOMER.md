# Google Play Console — BURGER HOME customer app (ADR-023)

Scope: internal testing and closed testing tracks only. Open testing and
production stay prohibited (ADR-023). Payments are iyzico **sandbox**.

## App identity

| Field              | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| App name           | BURGER HOME                                                                   |
| Package            | `com.azemyazilim.fastfoodcustomer`                                            |
| Default language   | Türkçe (tr-TR)                                                                |
| App / game         | Uygulama                                                                      |
| Free / paid        | Ücretsiz                                                                      |
| Category           | Yeme ve İçme (Food & Drink)                                                   |
| Privacy policy URL | `https://burger.azem.cloud/gizlilik`                                          |
| Account deletion   | `https://burger.azem.cloud/hesap-silme`                                       |
| Upload             | `app-release.aab` from `scripts/android-build-release.sh customer-mobile aab` |

## Graphics

Generated from the BURGER HOME wordmark, in `apps/customer-mobile/assets/images/`:

- `play-store-icon-512.png` — 512×512 app icon
- `play-feature-graphic-1024x500.png` — feature graphic
- Phone screenshots (min. 2, 16:9 or 9:16, 320–3840 px) are taken from a
  device or emulator running the release build; they are not generated.

## Store listing (tr-TR)

Short description (≤ 80):

> Smash burger siparişi ver, kuryeni canlı takip et, puan kazan.

Full description:

> BURGER HOME ile favori smash burgerini birkaç dokunuşla sipariş et.
>
> • Menüyü keşfet, ürünleri malzeme ve alerjen bilgisiyle incele
> • Adresini haritada seç, teslimat ya da gel-al seçeneğini belirle
> • iyzico güvenli ödeme sayfasıyla öde (3D Secure)
> • Siparişini ve kuryeni canlı takip et
> • Masadaki QR kodu okutarak restoranda sipariş ver
> • BURGER HOME CLUB puanları ve kampanyalardan yararlan
>
> Bu sürüm test sürümüdür: ödemeler iyzico test ortamında yapılır ve gerçek
> para çekilmez.

## Testing track notes (release notes)

> Test sürümü. Ödemeler iyzico sandbox ortamındadır; test kartı:
> 5528 7900 0000 0008, 12/30, CVC 123, 3D şifresi 283126.

## App content declarations

- **Ads:** No ads.
- **App access:** Some features need sign-in. Provide a test customer account
  (phone/e-mail + password) in "App access" instructions; do not commit it.
- **Content rating:** IARC questionnaire → no violence, no user-generated
  public content, no gambling with real money. The "Spin" wheel awards loyalty
  rewards only; answer "no real-money gambling".
- **Target audience:** 18+ (food ordering with payment).
- **News app:** No. **Government app:** No. **Financial features:** None
  (payments are processed by iyzico; the app is not a financial service).
- **Health:** No.

## Data safety

Data is encrypted in transit (HTTPS): **Yes**. Users can request deletion:
**Yes** (in app: Hesabım › Güvenlik › Hesabı sil; web: `/hesap-silme`).
Data is not sold and not used for advertising.

| Data type                  | Collected                                                    | Shared                | Purpose                               | Optional |
| -------------------------- | ------------------------------------------------------------ | --------------------- | ------------------------------------- | -------- |
| Name                       | Yes                                                          | Yes (iyzico, courier) | App functionality, account management | No       |
| Email address              | Yes                                                          | Yes (iyzico)          | Account management, communications    | Yes      |
| Phone number               | Yes                                                          | Yes (courier, branch) | App functionality, account management | No       |
| Address                    | Yes                                                          | Yes (courier, branch) | App functionality                     | No       |
| Precise location           | Yes                                                          | No                    | App functionality (address on map)    | Yes      |
| Purchase history           | Yes                                                          | No                    | App functionality, analytics: no      | No       |
| In-app messages (support)  | Yes                                                          | No                    | Customer support                      | Yes      |
| Other user content (notes) | Yes                                                          | Yes (courier, branch) | App functionality                     | Yes      |
| Device or other IDs / IP   | Yes                                                          | No                    | Security, fraud prevention            | No       |
| Payment info (card)        | No — entered on iyzico's page, never reaches the app backend |                       |                                       |          |
| Photos / camera            | No — QR is decoded on device and not stored or sent          |                       |                                       |          |

"Shared" means transfer to a third party other than a service provider acting
on our behalf; if Play's definitions treat iyzico/couriers as service
providers, they may be answered as "not shared".

## Before every upload

1. Increment `android.versionCode` (and `version` when user-visible) in
   `apps/customer-mobile/app.json`.
2. `scripts/android-build-release.sh customer-mobile aab` (keystore env set).
3. Upload the AAB to the internal testing track and add testers by e-mail list.
