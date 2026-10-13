'use client';

import { BRAND_NAME } from '../../lib/storefront/brand-copy';

import { LegalDocumentLayout, type LegalSection } from './legal-document-layout';

const SECTIONS: LegalSection[] = [
  {
    id: 'cerez-nedir',
    title: 'Çerez (Cookie) Nedir?',
    content: (
      <p>
        Çerezler, bir web sitesini ziyaret ettiğinizde tarayıcınız aracılığıyla cihazınıza kaydedilen küçük metin
        dosyalarıdır. Bu dosyalar, web sitesinin güvenli, hızlı ve kullanıcı tercihlerine uygun şekilde çalışmasını
        sağlar.
      </p>
    ),
  },
  {
    id: 'kullanilan-cerezler',
    title: 'Kullandığımız Çerez Türleri',
    content: (
      <div className="space-y-4">
        <div>
          <h3 className="font-label-md uppercase text-on-surface">1. Zorunlu ve Güvenlik Çerezleri (Gerekli)</h3>
          <p className="mt-1">
            Sipariş sepetinizin korunması, kullanıcı oturumunuzun sürdürülmesi, CSRF ataklarının engellenmesi ve
            iyzico ödeme güvenliğinin sağlanması için zorunludur. Bu çerezler olmadan sipariş ve ödeme akışı
            çalışamaz.
          </p>
        </div>
        <div>
          <h3 className="font-label-md uppercase text-on-surface">2. Tercih ve İşlevsellik Çerezleri</h3>
          <p className="mt-1">
            Seçtiğiniz teslimat adresi, tercih ettiğiniz şube veya masa QR kodu gibi tercihlerinizi hatırlamamızı
            sağlar.
          </p>
        </div>
        <div>
          <h3 className="font-label-md uppercase text-on-surface">3. Üçüncü Taraf Reklam Çerezleri Bulunmaz</h3>
          <p className="mt-1">
            {BRAND_NAME} platformunda kullanıcıları çapraz sitelerde takip eden reklam pikselleri veya üçüncü taraf
            pazarlama takipçileri kullanılmamaktadır.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'cerez-yonetimi',
    title: 'Çerezleri Nasıl Yönetebilirsiniz?',
    content: (
      <p>
        Tarayıcınızın ayarlarından dilediğiniz zaman çerezleri silebilir veya engelleyebilirsiniz. Ancak zorunlu
        çerezlerin engellenmesi durumunda sepetinize ürün ekleyemeyebilir veya ödeme adımını tamamlayamayabilirsiniz.
      </p>
    ),
  },
];

export function CookiePolicyPage() {
  return (
    <LegalDocumentLayout
      title="Çerez Politikası"
      subtitle="Çerezler ve Yerel Depolama Kullanımı"
      lastUpdated="13.10.2026"
      surfaceId="cookie-policy"
      currentPath="/cerez-politikasi"
      sections={SECTIONS}
    />
  );
}
