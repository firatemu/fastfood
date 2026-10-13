'use client';

import { BRAND_NAME } from '../../lib/storefront/brand-copy';

import { LegalDocumentLayout, type LegalSection } from './legal-document-layout';

const SECTIONS: LegalSection[] = [
  {
    id: 'satici-bilgileri',
    title: 'Satıcı Bilgileri',
    content: (
      <div className="bg-surface-container p-3 rounded-lg text-sm space-y-1">
        <p><strong>Unvan:</strong> {BRAND_NAME} Gıda ve Restoran İşletmeleri</p>
        <p><strong>Adres:</strong> Moda Caddesi No:12, Kadıköy / İstanbul</p>
        <p><strong>Telefon:</strong> 0850 308 00 00 / +90 216 123 45 67</p>
        <p><strong>E-posta:</strong> destek@burger.azem.cloud</p>
        <p><strong>Müşteri Şikayet / Canlı Destek:</strong> burger.azem.cloud/account/support</p>
      </div>
    ),
  },
  {
    id: 'urun-nitelikleri',
    title: 'Sözleşme Konusu Ürünün Temel Nitelikleri',
    content: (
      <p>
        Siparişe konu mal/hizmet; {BRAND_NAME} menüsünde yer alan smash burgerler, patates kızartmaları,
        özel soslar, soğuk ve sıcak içecekler ile tatlı çeşitleridir. Ürünlerin porsiyon ağırlıkları,
        içindekiler, besin değerleri ve alerjen uyarıları ürün detay sayfalarında şeffaf biçimde belirtilmektedir.
      </p>
    ),
  },
  {
    id: 'fiyat-ve-odeme',
    title: 'Toplam Fiyat ve Ödeme Bilgileri',
    content: (
      <>
        <p>
          Ürünlerin tüm vergiler (KDV) dahil toplam fiyatı, varsa teslimat bedeli ve kurye bahşişi sipariş özeti
          ekranında ALICI&apos;ya açıkça gösterilir.
        </p>
        <p>
          Ödemeler, lisanslı ödeme aracısı iyzico altyapısı üzerinden 3D Secure onay kodu ile kredi kartı veya
          banka kartı kullanılarak tahsil edilir. Alıcının kartından ilave bir gizli ücret tahsil edilmez.
        </p>
      </>
    ),
  },
  {
    id: 'teslimat-bilgileri',
    title: 'Teslimat ve Masraflar',
    content: (
      <p>
        Teslimat, ALICI&apos;nın sipariş formunda belirttiği açık adrese SATICI&apos;nın motorlu kuryeleri tarafından
        hava kanallı termal muhafazalı çantalarda gerçekleştirilir. Teslimat ücreti sipariş öncesinde sepette
        belirtilmekte olup, belirli sepet tutarı üzerindeki siparişlerde ücretsiz teslimat uygulanabilir.
        Gel-al siparişlerinde teslimat masrafı alınmaz.
      </p>
    ),
  },
  {
    id: 'cayma-istisnasi',
    title: 'Cayma Hakkı ve İstisnası Bilgilendirmesi',
    content: (
      <>
        <p>
          Mesafeli Sözleşmeler Yönetmeliği&apos;nin 15. maddesi 1. fıkrası (ç) bendi gereğince; çabuk bozulabilen veya
          son kullanma tarihi geçebilecek malların teslimine ilişkin sözleşmelerde cayma hakkı kullanılamaz.
        </p>
        <p>
          Bu sebeple, sipariş onaylandıktan ve mutfakta taze olarak ızgaraya verilip hazırlanmaya başlandıktan sonra
          keyfi cayma hakkı bulunmamaktadır. Eksik, yanlış veya ayıplı ürün teslimatı durumunda ise ALICI&apos;nın
          ücretsiz değişim, eksik ürün tamamlama veya bedel iadesi talep etme hakları saklıdır.
        </p>
      </>
    ),
  },
  {
    id: 'sikayet-ve-itiraz',
    title: 'Şikayet ve Çözüm Mercileri',
    content: (
      <p>
        Tüketici, siparişi ve teslimatı ile ilgili her türlü talep ve şikayetini derhal {BRAND_NAME} Müşteri Hizmetleri
        hattına veya platform içindeki Canlı Destek ekranına iletebilir. Uyuşmazlık halinde Ticaret Bakanlığı
        tarafından belirlenen parasal sınırlar dahilinde Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.
      </p>
    ),
  },
];

export function PreliminaryInformationPage() {
  return (
    <LegalDocumentLayout
      title="Ön Bilgilendirme Formu"
      subtitle="Sipariş Öncesi Zorunlu Tüketici Bilgilendirmesi"
      lastUpdated="13.10.2026"
      surfaceId="preliminary-information"
      currentPath="/on-bilgilendirme-formu"
      sections={SECTIONS}
    />
  );
}
