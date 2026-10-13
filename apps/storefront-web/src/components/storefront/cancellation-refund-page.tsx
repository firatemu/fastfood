'use client';

import { BRAND_NAME } from '../../lib/storefront/brand-copy';

import { LegalDocumentLayout, type LegalSection } from './legal-document-layout';

const SECTIONS: LegalSection[] = [
  {
    id: 'genel-ilke',
    title: 'Genel İptal ve İade İlkeleri',
    content: (
      <p>
        <strong>{BRAND_NAME}</strong> olarak sunduğumuz tüm ürünler, siparişiniz onaylandığı anda yüksek ısıda
        döküm ızgarada taze olarak pişirilmekte ve brioche ekmekleri fırından sıcak servis edilmektedir.
        Hazır sıcak gıda ürünlerinin doğası ve tüketici mevzuatı gereği özel iptal ve iade prosedürleri
        uygulanmaktadır.
      </p>
    ),
  },
  {
    id: 'siparis-iptali',
    title: 'Sipariş İptal Koşulları ve Süresi',
    content: (
      <>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Hazırlık Öncesi İptal:</strong> Siparişinizi verdikten sonra, şube mutfağı hazırlığa ve
            pişirmeye başlamadan önceki ilk 2-3 dakika içinde &quot;Hesabım › Siparişlerim&quot; veya Canlı Destek
            üzerinden iptal talebinde bulunabilirsiniz. Bu durumda sipariş bedeli derhal ve kesintisiz iade edilir.
          </li>
          <li>
            <strong>Hazırlık Aşaması ve Yoldaki Siparişler:</strong> Sipariş ızgaraya verilip hazırlandıktan veya
            kuryeye teslim edildikten sonra iptal işlemi yapılamamaktadır.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'iade-ve-telafi',
    title: 'Ayıplı, Hatalı veya Eksik Ürün Durumunda İade ve Telafi',
    content: (
      <>
        <p>
          Müşteri memnuniyeti taahhüdümüz kapsamında, aşağıdaki durumlarda sorgusuz sualsiz telafi veya ücret
          iadesi sağlanır:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sipariş ettiğinizden farklı bir burger veya ürün teslim edilmesi,</li>
          <li>Termal ambalajın hasar görmesi, dökülmesi veya tüketilemez durumda olması,</li>
          <li>Siparişte yer alan yan ürün, sos veya içeceğin unutulması / eksik teslim edilmesi,</li>
          <li>Makul teslimat süresinin ciddi şekilde aşılması ve ürünün soğuk teslim edilmesi.</li>
        </ul>
        <p>
          Bu tür bir durumla karşılaşmanız halinde, teslimat anında kurye ile tutanak tutabilir veya sipariş
          ekranından fotoğraflı olarak Canlı Destek hattımıza bildirerek ücret iadesi ya da sıcak ürünün derhal
          yeniden gönderilmesini talep edebilirsiniz.
        </p>
      </>
    ),
  },
  {
    id: 'ucret-iade-sureci',
    title: 'Ödeme ve Ücret İade Süreci (iyzico)',
    content: (
      <p>
        Onaylanan iptal veya iade işlemlerinde, ödemeniz yetkili ödeme sağlayıcısı iyzico sistemi üzerinden siparişi
        verdiğiniz kredi kartı veya banka kartınıza aynı gün iade talimatı olarak iletilir. Tutarın ekstrenize
        yansıma süresi bankanıza bağlı olarak kredi kartlarında 1-3 iş günü, banka (debit) kartlarında ise 3-7 iş
        günü sürebilmektedir.
      </p>
    ),
  },
  {
    id: 'puan-ve-kupon',
    title: 'Kullanılan Sadakat Puanları ve Kuponlar',
    content: (
      <p>
        İptal edilen veya tam bedel iadesi yapılan siparişlerde kullanılan Ember Club sadakat puanları ve promosyon
        kodları hesabınıza otomatik olarak geri yüklenir.
      </p>
    ),
  },
];

export function CancellationRefundPage() {
  return (
    <LegalDocumentLayout
      title="İptal ve İade Koşulları"
      subtitle="Sipariş İptali, Değişim ve Ücret İadesi Rehberi"
      lastUpdated="13.10.2026"
      surfaceId="cancellation-refund"
      currentPath="/iptal-ve-iade"
      sections={SECTIONS}
    />
  );
}
