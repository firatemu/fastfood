<!-- DEPRECATED 2026-10-06 by ADR-019. DO NOT derive tokens from this file. -->
<!-- This is an orphan from an earlier design generation. Its palette does not -->
<!-- match any shipped code.html in this package. Authority is screen.png then  -->
<!-- code.html only. See docs/adrs/ADR-019-admin-visual-system-navy.md and       -->
<!-- docs/admin-rebuild/03_ADMIN_DESIGN_FOUNDATION.md.                          -->
---
name: Evocative Name
colors:
  surface: '#161309'
  surface-dim: '#161309'
  surface-bright: '#3d392c'
  surface-container-lowest: '#100e05'
  surface-container-low: '#1e1c10'
  surface-container: '#222014'
  surface-container-high: '#2d2a1e'
  surface-container-highest: '#383528'
  on-surface: '#e9e2d0'
  on-surface-variant: '#cec6ab'
  inverse-surface: '#e9e2d0'
  inverse-on-surface: '#343024'
  outline: '#979178'
  outline-variant: '#4c4732'
  surface-tint: '#e3c600'
  primary: '#fff1b9'
  on-primary: '#393000'
  primary-container: '#f3d406'
  on-primary-container: '#6a5b00'
  inverse-primary: '#6d5e00'
  secondary: '#d8c77a'
  on-secondary: '#393000'
  secondary-container: '#544906'
  on-secondary-container: '#c9b96d'
  tertiary: '#d4f7ff'
  on-tertiary: '#00363e'
  tertiary-container: '#56e7ff'
  on-tertiary-container: '#006573'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe248'
  primary-fixed-dim: '#e3c600'
  on-primary-fixed: '#211b00'
  on-primary-fixed-variant: '#524600'
  secondary-fixed: '#f5e393'
  secondary-fixed-dim: '#d8c77a'
  on-secondary-fixed: '#211b00'
  on-secondary-fixed-variant: '#524604'
  tertiary-fixed: '#9eefff'
  tertiary-fixed-dim: '#42d8f0'
  on-tertiary-fixed: '#001f24'
  on-tertiary-fixed-variant: '#004e59'
  background: '#161309'
  on-background: '#e9e2d0'
  surface-variant: '#383528'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.04em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '800'
    lineHeight: 28px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.375rem
  space-md: 0.625rem
  space-lg: 0.875rem
  space-xl: 1.25rem
---

## Brand & Style
Bu tasarım sistemi; hızlı servis restoran (QSR) işletmelerinin, merkezi mutfaklarının ve şube operasyonlarının (KDS, Kasa POS, Kurye Yönetimi ve Vardiya Raporlama) dinamik ve yüksek tempolu yapısı için kurgulanmıştır.

Temel tasarım dili: **Yüksek Yoğunluklu Kurumsal-Endüstriyel (High-Density Modern Industrial)**.
- **Hedef Kitle:** Restoran şube müdürleri, mutfak şefleri, vardiya amirleri, kurye koordinatörleri ve operasyon direktörleri.
- **Duygusal Tepki:** Kesintisiz hız, net karar verme gücü, hataya yer bırakmayan netlik, iştah açıcı ama ciddiyetini koruyan kurumsal kontrol.
- **Tasarım Felsefesi:** Fazlalıklardan arındırılmış, milisaniyeler içinde sipariş durumunu gösteren, dokunmatik ekranlara ve fare etkileşimlerine duyarlı, yatay ve dikey alan israfını sıfırlayan kompakt veri panelleri.

## Colors
Operasyon boyunca mutfak ışıkları ve ekran parlaklığı göz önüne alınarak varsayılan tema **Koyu (Dark)** olarak seçilmiştir; ancak tüm token'lar net kurumsal açık moda tam uyumludur.

- **Birincil Vurgu (Neon Amber / #F3D406):** Temel aksiyonlar, aktif sipariş çağrıları, birincil butonlar ve dikkat gerektiren operasyonel odaklar.
- **İkincil Vurgu (Muted Olive/Gold / #857733):** Kritik uyarılar, iptal işlemleri, geciken teslimat süreleri ve KDS alarm seviyeleri.
- **Yardımcı Renk (Cyan / #3BF0FF):** Hazır siparişler, başarılı teslimatlar, açık kasalar ve pozitif vardiya kâr-zarar göstergeleri.
- **Nötr Zemin Tonları:**
  - `Arka Plan (Canvas)`: Slate-950 (#020617)
  - `Kart ve Panel Zeminleri (Surface)`: Neutral Dark (#7C7768)
  - `Yükseltilmiş Yüzeyler (Surface-Raised)`: #2D3449
  - `Metin Birincil`: #DAE2FD
  - `Metin İkincil / Etiket`: #E0C0B1
- **Operasyonel Durum Paleti:**
  - *Bekliyor / Kuyrukta:* Amber zemin üzeri koyu kontrast metin.
  - *Hazırlanıyor / Ocakta:* Cyan (#3BF0FF) zemin üzeri koyu metin.
  - *Hazır / Teslim Noktasında:* Cyan/Emerald zemin üzeri metin.
  - *Gecikmiş / Kritik İptal:* #857733 nabız (pulse) göstergeli.

## Typography
Tasarım sisteminde hiyerarşi üç temel sütuna dayanır:
1. **Başlıklar (Plus Jakarta Sans):** Yüksek okunabilirlik ve modern kurumsal duruş sunar; şube adları, vardiya başlıkları ve KDS sipariş numaraları için kullanılır.
2. **Gövde Metinleri (Inter):** Kompakt boyutlarda dahi glif ayrımı net olan, menü detayları, porsiyon açıklamaları ve sistem logları için optimize edilmiş gövde fontudur.
3. **Sayısal Değerler ve Kodlar (JetBrains Mono):** Fiyatlar (örn: `1.249,90 ₺`), sayaçlar (`04:45 dk`), POS fiş numaraları (`#IST-9402`), barkodlar ve masa kodları tabular (eş aralıklı) rakamlarla dizilmelidir.

Tüm metinlerde Türkçe karakter kurallarına (İ, ı, Ş, ş, Ğ, ğ) ve noktalama biçimlerine tam uyum zorunludur. Belirsiz veya boş değerler em dash (`—`) ile gösterilir.

## Layout & Spacing
Sistem, yoğun bilgi barındıran operasyon panelleri (POS/KDS/ERP) için ultra-kompakt bir ızgara düzeni benimser. Boş alanlar lüks değil, yalnızca gözün sipariş satırlarını hızla ayırması için stratejik olarak kullanılır.

- **Izgara (Grid):** 12 sütunlu, yatay taşmayı önleyen, sütun aralıkları (gutter) daraltılmış (12px / 0.75rem) akışkan ızgara.
- **KDS Kart Düzeni:** Mutfak ekranında yatayda kaydırılabilir 4 veya 6 sabit genişlikli (min 280px, max 340px) operasyon kanalı (lane).
- **Hücre / İç Boşluk Ritmi:**
  - Tablo satır yükseklikleri: 36px (yoğun) veya 44px (dokunmatik terminal).
  - Kart içi padding: `0.625rem` (10px).
- **Kırılım Noktaları (Breakpoints):**
  - `Mobile / Kurye Terminali (< 768px)`: Tek sütun, alt sabit aksiyon barı (Sticky Bottom Bar).
  - `Tablet / Kasa POS (768px - 1199px)`: 2 sütunlu sipariş/sepet paneli.
  - `Masaüstü / Mutfak KDS (>= 1200px)`: Tam ekran KDS grid ve çoklu widget ERP dashboard görünümü.

## Elevation & Depth
Endüstriyel ekranlarda ve paslanmaz çelik mutfak ortamlarında yansımayı azaltmak amacıyla derin bulanık gölgeler yerine **Düşük Kontrastlı Yapısal Çerçeveler (Structural Borders)** ve **Hafif Katmanlama** esastır.

- **Seviye 0 (Zemin):** Slate-950 (#020617), tüm panellerin yerleştiği mat kömür zemin.
- **Seviye 1 (Kartlar / Tablolar):** Neutral Dark yüzey + `1px solid` sınır hattı. Gölgelendirme bulunmaz.
- **Seviye 2 (Hover / Odak / Açılır Menü):** Yüzey + ince ortam gölgesi.
- **Seviye 3 (Kritik Modal / Kasa Çekmecesi Onayı):** Yüzey, `border: 1px solid #F3D406`, arka plan karartması ile odağı tamamen modal üzerine toplar.
- **Vurgu Derinliği:** KDS kartlarında süre doldukça kart sınır çizgisi ikincil uyarı rengine (`#857733`) döner ve aciliyet bildirir.

## Shapes
Hızlı veri tarama ve yüksek bilgi yoğunluğu gereksinimi sebebiyle yuvarlaklık seviyesi **1 (Soft / Kompakt)** olarak ayarlanmıştır.

- **Temel Elemanlar (Butonlar, Inputlar, Rozetler):** `rounded` (0.25rem / 4px) köşe yarıçapı. Ekran sınırlarını netleştirir, piksel israfını engeller.
- **Kartlar ve Tablo Konteynerleri:** `rounded-md` (0.375rem / 6px) ile hafif yumuşatılmış, modern endüstriyel duruş.
- **Modal ve Bildirim Pencereleri:** `rounded-lg` (0.5rem / 8px).
- **Sayaçlar ve İndikatör Hapları:** `rounded-full` yalnızca durum belirten mikro LED noktaları veya küçük sayaç rozetlerinde kullanılır.

## Components

### 1. Butonlar (Buttons)
- **Birincil (Primary):** Zemin `#F3D406`, metin koyu, yükseklik 36px (dokunmatik POS modunda 44px), `font-weight: 600`.
- **Kritik / İptal (Destructive):** Zemin `#857733`, metin beyaz.
- **İkincil / Panel Butonları:** Zemin Slate-800, sınır 1px, metin Slate-200.
- **İkon Butonlar:** Kompakt 32x32px, hızlı KDS onay butonları.

### 2. Durum Rozetleri ve Etiketler (Badges & Tags)
- Sipariş adımları tek bakışta ayırt edilmelidir:
  - `HAZIR`: Zemin `#3BF0FF` bazlı yarı saydam.
  - `OCAKTA`: Zemin `#F3D406` bazlı yarı saydam.
  - `GECİKTİ`: Zemin `#857733` bazlı uyarı tonu.
- Rozet fontu `JetBrains Mono`, 11px, büyük harf (`uppercase`).

### 3. Giriş Alanları (Input Fields)
- Yükseklik 34px, zemin Slate-950, çerçeve `1px solid`.
- Odak (Focus): Sınır `#F3D406` ve `box-shadow: 0 0 0 1px #F3D406`.
- Barkod / SKU okuyucu girişlerinde sol tarafta sabit mikro ikon, font `JetBrains Mono`.

### 4. Tablolar ve Veri Izgaraları (Data Tables)
- Satır yüksekliği 38px, çizgili (zebra) alternatif satırlar yerine sadece alt çizgi.
- Rakam sütunları (`JetBrains Mono`) her zaman sağa hizalı, sipariş durumları ortalı, ürün adları sola hizalı.

### 5. KDS Sipariş Kartları (Kitchen Display Cards)
- Başlık çubuğu: Sipariş Numarası, Masa/Paket tipi ve geçen süre kronometresi.
- İçerik: Porsiyon adetleri belirgin turuncu/sarı daire içinde, çıkarılan malzemeler italik renkte.
- Alt Bölüm: Tek tıkla "Hazırla" veya "Teslim Et" tam genişlikli hızlı aksiyon çubuğu.

### 6. Mikro İstatistik Kartları (KPI Tiles)
- Zemin Slate-900, padding 10px.
- İçerik: Üstte küçük etiket, ortada 20px kalın metin, altta önceki vardiyaya göre yüzde değişimi.