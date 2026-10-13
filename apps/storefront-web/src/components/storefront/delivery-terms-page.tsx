'use client';

import { BRAND_NAME } from '../../lib/storefront/brand-copy';

import { LegalDocumentLayout, type LegalSection } from './legal-document-layout';

const SECTIONS: LegalSection[] = [
  {
    id: 'teslimat-bolgeleri',
    title: 'Hizmet ve Teslimat Bölgeleri',
    content: (
      <p>
        <strong>{BRAND_NAME}</strong>, lezzetin ve sıcaklığın korunabilmesi amacıyla belirlenen şube teslimat
        yarıçapları içerisinde hizmet vermektedir. Teslimat adresinizi harita üzerinde seçtiğinizde veya kayıtlı
        adresinizi belirlediğinizde sistemimiz adresinizin servis bölgesinde olup olmadığını otomatik olarak
        doğrular.
      </p>
    ),
  },
  {
    id: 'sure-ve-sicaklik',
    title: 'Tahmini Teslimat Süresi ve Termal Paketleme',
    content: (
      <>
        <p>
          Ortalama teslimat süresi, sipariş anındaki mutfak hazırlık yoğunluğu ve hava/trafik şartlarına göre 30 ile
          45 dakika arasındadır.
        </p>
        <p>
          Burgerler ve patatesler, buharlaşmayı engelleyen ve çıtırlığı koruyan patentli hava kanallı termal taşıma
          çantalarında kuryelerimiz tarafından taşınır.
        </p>
      </>
    ),
  },
  {
    id: 'ucret-ve-minimum-sepet',
    title: 'Minimum Sepet Tutarı ve Teslimat Ücreti',
    content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Her teslimat bölgesi için belirlenmiş bir minimum sipariş tutarı mevcuttur.</li>
        <li>
          Belirli sepet tutarının üzerindeki siparişlerde teslimat ücretsizdir (&quot;Ateş Kargo&quot; kampanyası).
        </li>
        <li>
          Minimum tutarın altındaki siparişlerde mesafe bazlı cüzi teslimat ücreti sepet ve ödeme ekranında açıkça
          gösterilir.
        </li>
        <li>Şubeden Gel-Al yöntemiyle verilen tüm siparişlerde teslimat ücreti 0 TL&apos;dir.</li>
      </ul>
    ),
  },
  {
    id: 'temassiz-teslimat',
    title: 'Temassız Teslimat ve Kapıda Bırakma',
    content: (
      <p>
        Sipariş verirken &quot;Temassız Teslimat&quot; seçeneğini işaretleyebilir ve bina giriş kodu, kapı notu
        ekleyebilirsiniz. Kuryemiz siparişinizi kapınıza asar/bırakır, zilinizi çalar ve güvenli mesafede bekleyerek
        teslimatı tamamlar.
      </p>
    ),
  },
];

export function DeliveryTermsPage() {
  return (
    <LegalDocumentLayout
      title="Teslimat ve Sipariş Koşulları"
      subtitle="Kurye Teslimat, Gel-Al ve Servis Bölgeleri"
      lastUpdated="13.10.2026"
      surfaceId="delivery-terms"
      currentPath="/teslimat-kosullari"
      sections={SECTIONS}
    />
  );
}
