# Stitch — Smash & Co storefront (project `2120742513648709986`)

HTML exports live under `.stitch/export/<slug>/code.html` (one folder per screen). React markup is generated into `src/stitch/generated/`.

## Slugs ↔ routes

| Slug       | App routes                          |
|------------|-------------------------------------|
| `home`     | `/`, `/menu`                        |
| `auth`     | `/auth`                             |
| `account`  | `/account`                          |
| `orders`   | `/orders`                           |
| `pdp-cart` | `/products/[id]`, `/cart`           |
| `checkout` | `/checkout`                         |

## Varsayılan: Stitch görünümü + dinamik API

Menü ve ana sayfa (`/`, `/menu`) React bileşenleri (`StitchMenuCatalog`) ile **veritabanı katalogunu** listeler; tasarım Stitch export sınıflarıyla hizalıdır. Sepet, ürün detayı, checkout, auth mevcut `*-page.client.tsx` akışlarıdır.

Statik HTML iframe yalnızca `NEXT_PUBLIC_STITCH_BIREBIR_IFRAME=true` ile açılır (tasarım referans önizleme).

## (Önizleme) birebir Stitch HTML + API bridge

Kaynak: repo kökündeki `stitch_burger_e_ticaret_platformu_tasarım/` (6× `code.html`).

```bash
pnpm --filter @fastfood/storefront-web stitch:sync
```

Bu komut HTML’i `public/stitch-raw/<slug>.html` olarak kopyalar (bridge script enjekte). Mağaza rotaları bu dosyayı **tam ekran iframe** ile gösterir; görünüm Stitch export ile **birebir** aynıdır. Sepet, OTP, navigasyon ve ödeme `StitchBridgeHost` + `stitch-bridge.js` ile API’ye bağlıdır.

React yedek UI: `NEXT_PUBLIC_STITCH_USE_REACT_FALLBACK=true` (Smash `*-page.client.tsx`).

## İşlevsel entegrasyon (iframe bridge)

- `public/stitch-raw/stitch-bridge.js` — iframe içinde tıklama / OTP / sepet mesajları
- `src/stitch/StitchBridgeHost.tsx` — parent’ta API + Next.js yönlendirme
- `stitch:sync` veya `stitch:publish` HTML’e bridge script ve `data-ff-*` işaretlerini ekler

| `data-path` | Route |
|-------------|--------|
| `menu` | `/menu` |
| `hesabim` | `/account` (giriş yoksa `/auth`) |
| `siparis-takibi` | `/orders` |
| `kvkk`, `gizlilik-sozlesmesi`, … | `/legal` |

Ürün kartları: `data-ff-product-index` → API vitrin sırası → `/products/[id]`. Sepet / OTP / ödeme parent API’sine bağlıdır (`src/lib/storefront/`).

## Pull (HTML indirme)

Stitch HTML dosyaları `contribution.usercontent.google.com` üzerinden gelir ve **Google-internal OAuth scope** gerektirir (`labs-tailwind`, `aurelius`, …). Bu scope’lar `gcloud auth application-default login` ile **istenemez** (`400 invalid_scope`).

### Önerilen: gerçek Chrome (CDP)

Google, Playwright Chromium’da oturumu **“güvensiz tarayıcı”** diye reddeder. **Normal Chrome** + debug port kullanın.

**Windows** — önce tüm Chrome pencerelerini kapatın, sonra:

```text
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%LOCALAPPDATA%\fastfood-stitch-cdp"
```

Chrome’da `stitch.withgoogle.com` ile giriş yapın.

**WSL2** (Chrome Windows’ta `--remote-debugging-port=9222` ile açık):

```bash
# Önce nameserver IP kullanmayın (10.255.255.254 çoğu kurulumda REFUSED verir).
pnpm --filter @fastfood/storefront-web stitch:pull:cdp
```

Varsayılan CDP: `http://127.0.0.1:9222` (WSL → Windows localhost yönlendirmesi). İşe yaramazsa:

```bash
export STITCH_CDP_URL=http://$(ip route show default | awk '{print $3}'):9222
```

Chrome’u gerekirse ` --remote-debugging-address=0.0.0.0` ile başlatın.

`stitch:pull:cdp` mevcut Chrome oturumunun çerezleriyle HTML indirir; Chrome’u kapatmaz.

### Alternatif: Playwright (sık engellenir)

```bash
pnpm --filter @fastfood/e2e-web run install-browsers
STITCH_BROWSER_CHANNEL=chrome pnpm --filter @fastfood/storefront-web stitch:pull:browser
```

Oturum: `.stitch/browser-profile/` (gitignore).

### Alternatif: kısa ömürlü bearer token

Stitch UI’da bir ekranı indirirken DevTools → Network → `contribution.usercontent.google.com` → **Authorization** header’ını kopyalayın:

```bash
export STITCH_ACCESS_TOKEN='ya29…'
pnpm --filter @fastfood/storefront-web stitch:pull
```

`STITCH_API_KEY`: `.env.local` veya MCP stitch header.

`pnpm stitch:auth` yalnızca bu kısıtı açıklar; gcloud ile Stitch HTML yetkisi alınamaz.

### SDK

`pnpm stitch:pull:sdk` — aynı token kısıtı (browser veya DevTools token gerekir).

## Import (opsiyonel)

React bileşenleri için:

```bash
pnpm --filter @fastfood/storefront-web stitch:import
```

Raw iframe kullanıyorsanız atlayın.

## Client islands

After import, pages render Stitch Tailwind markup via `StitchPage`. Live API behavior (cart, OTP, checkout) stays in client islands passed as `island` / `slots` props.

## Design tokens

See `DESIGN.md` and `src/stitch/stitch-theme.ts`.

Do **not** commit OAuth tokens, browser profiles, or API secrets.
