'use client';

import { BRAND_NAME } from '../../lib/storefront/brand-copy';

import { LegalDocumentLayout, type LegalSection } from './legal-document-layout';

const SECTIONS: LegalSection[] = [
  {
    id: 'taraflar',
    title: 'Taraflar',
    content: (
      <>
        <p>
          İşbu Mesafeli Satış Sözleşmesi (&quot;Sözleşme&quot;), bir tarafta burger.azem.cloud internet
          sitesi ve mobil uygulaması üzerinden sipariş alan <strong>{BRAND_NAME}</strong> (bundan böyle
          &quot;SATICI&quot; olarak anılacaktır) ile diğer tarafta internet sitesi üzerinden sipariş
          veren gerçek veya tüzel kişi (bundan böyle &quot;ALICI&quot; veya &quot;TÜKETİCİ&quot; olarak
          anılacaktır) arasında akdedilmiştir.
        </p>
        <div className="bg-surface-container p-3 rounded-lg text-sm space-y-1">
          <p><strong>SATICI Bilgileri:</strong></p>
          <p>Unvan: {BRAND_NAME} Gıda ve Restoran İşletmeleri</p>
          <p>Adres: Moda Caddesi No:12, Kadıköy / İstanbul</p>
          <p>E-posta: destek@burger.azem.cloud</p>
          <p>Müşteri Hizmetleri: 0850 308 00 00</p>
        </div>
      </>
    ),
  },
  {
    id: 'konu',
    title: 'Sözleşmenin Konusu',
    content: (
      <p>
        İşbu Sözleşme&apos;nin konusu, ALICI&apos;nın SATICI&apos;ya ait internet sitesi veya mobil uygulama
        üzerinden elektronik ortamda siparişini verdiği hamburger, yan ürün, içecek ve tatlı gibi hazır
        gıda maddelerinin satışı, ödemesi ve adrese teslimatı veya mağazadan gel-al yöntemiyle teslimine
        ilişkin olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve 29188 sayılı Mesafeli
        Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.
      </p>
    ),
  },
  {
    id: 'urun-ve-siparis',
    title: 'Sözleşme Konusu Ürün ve Sipariş Bilgileri',
    content: (
      <>
        <p>
          Sözleşme konusu ürün veya hizmetlerin türü, miktarı, içeriği, birim fiyatları, sepet toplamı,
          uygulanan indirimler, teslimat bedeli ve tüm vergiler dahil nihai ödeme tutarı, ALICI&apos;nın sipariş
          özeti ekranında ve onaylanan fatura/sipariş dökümünde yer almaktadır.
        </p>
        <p>
          Ödemeler, TCMB lisanslı yetkili ödeme kuruluşu <strong>iyzico</strong> güvenli ödeme altyapısı ve
          3D Secure güvenlik protokolü ile kredi kartı veya banka kartı ile tahsil edilir. Kart bilgileri
          SATICI sunucularında asla kaydedilmez ve saklanmaz.
        </p>
      </>
    ),
  },
  {
    id: 'teslimat',
    title: 'Teslimat ve İfa Esasları',
    content: (
      <>
        <p>
          Ürünler, ALICI&apos;nın sipariş esnasında seçtiği teslimat türüne göre; kurye ile ALICI&apos;nın belirttiği
          adrese teslim edilir veya ALICI&apos;nın tercih ettiği ilgili {BRAND_NAME} şubesinden gel-al yöntemiyle
          teslim alınır.
        </p>
        <p>
          Adrese teslimatlarda sipariş hazırlık ve pişirme süreci derhal başlar; hava şartları ve trafik yoğunluğu
          göz önüne alınarak ortalama 30-45 dakika içinde özel hava kanallı termal taşıma çantalarında teslim edilir.
          ALICI&apos;nın adresinde bulunamaması halinde kurye ALICI&apos;ya telefon ile ulaşmaya çalışır; ulaşılamaması
          ve teslimin imkansız hale gelmesi durumunda taze gıda ürünü şubeye geri döner.
        </p>
      </>
    ),
  },
  {
    id: 'cayma-hakki',
    title: 'Cayma Hakkı ve Yasal İstisnalar (Önemli Hüküm)',
    content: (
      <>
        <p className="bg-surface-container-high/60 p-3 rounded-lg border-l-4 border-secondary-container">
          <strong>29188 sayılı Mesafeli Sözleşmeler Yönetmeliği Madde 15/1-(ç) bendi uyarınca:</strong>
          <br />
          <em>
            &quot;Çabuk bozulabilen veya son kullanma tarihi geçebilecek malların teslimine ilişkin
            sözleşmelerde tüketici cayma hakkını kullanamaz.&quot;
          </em>
        </p>
        <p>
          Bu doğrultuda, sıcak pişirilen hamburger, patates kızartması ve taze hazırlanan içecek gibi derhal
          tüketilmesi gereken sıcak gıda ürünlerinde sipariş mutfakta pişirilmeye/hazırlanmaya başlandıktan sonra
          ve teslim alındıktan sonra keyfi cayma hakkı bulunmamaktadır.
        </p>
        <p>
          Ancak teslim edilen ürünün bozuk, eksik, hasarlı, soğuk veya siparişten farklı olması halinde;
          ALICI derhal Canlı Destek hattından veya şubeden bildirim yaparak ürünün ücretsiz yenilenmesini veya
          ödediği bedelin iadesini talep etme hakkına sahiptir.
        </p>
      </>
    ),
  },
  {
    id: 'iptal-ve-iade',
    title: 'Sipariş İptal Koşulları',
    content: (
      <p>
        ALICI, sipariş oluşturduktan sonra sipariş şube tarafından onaylanıp mutfakta ızgaraya girmeden önceki ilk
        birkaç dakika içerisinde &quot;Siparişlerim&quot; ekranından veya Destek hattı üzerinden siparişini iptal
        edebilir. İptal durumunda iyzico aracılığıyla tahsil edilen tutarın kartına iadesi derhal başlatılır ve
        bankanın süreçlerine bağlı olarak 1-3 iş günü içerisinde hesaba yansır. Mutfakta hazırlığı tamamlanan veya
        kuryeye verilen siparişlerde iptal yapılamaz.
      </p>
    ),
  },
  {
    id: 'uyusmazlik',
    title: 'Uyuşmazlıkların Çözümü',
    content: (
      <p>
        İşbu Sözleşme&apos;nin uygulanmasından doğabilecek her türlü uyuşmazlıklarda, Ticaret Bakanlığı&apos;nca her yıl
        ilan edilen parasal sınırlar dahilinde ALICI&apos;nın mal veya hizmeti satın aldığı veya ikametgahının bulunduğu
        yerdeki İl ve İlçe Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir.
      </p>
    ),
  },
  {
    id: 'yururluk',
    title: 'Yürürlük',
    content: (
      <p>
        ALICI, internet sitesi veya mobil uygulama üzerinden siparişini onayladığı ve ödemeyi gerçekleştirdiği
        anda işbu Sözleşme&apos;nin tüm koşullarını okuduğunu, anladığını ve kabul ettiğini beyan eder.
      </p>
    ),
  },
];

export function DistanceSalesAgreementPage() {
  return (
    <LegalDocumentLayout
      title="Mesafeli Satış Sözleşmesi"
      subtitle="Mesafeli Sözleşmeler Yönetmeliği Uyarınca"
      lastUpdated="13.10.2026"
      surfaceId="distance-sales-agreement"
      currentPath="/mesafeli-satis-sozlesmesi"
      sections={SECTIONS}
    />
  );
}
