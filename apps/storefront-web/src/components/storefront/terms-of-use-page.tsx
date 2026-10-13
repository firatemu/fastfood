'use client';

import { BRAND_NAME } from '../../lib/storefront/brand-copy';

import { LegalDocumentLayout, type LegalSection } from './legal-document-layout';

const SECTIONS: LegalSection[] = [
  {
    id: 'kabul',
    title: 'Koşulların Kabulü',
    content: (
      <p>
        burger.azem.cloud web sitesini veya {BRAND_NAME} mobil uygulamasını ziyaret eden, kayıt olan veya sipariş
        veren her kullanıcı, işbu Kullanım Koşulları&apos;nda yer alan kuralları okuduğunu ve bunlara uymayı kabul
        ettiğini beyan eder.
      </p>
    ),
  },
  {
    id: 'hizmet-tanimi',
    title: 'Hizmetin Tanımı ve Kapsamı',
    content: (
      <p>
        {BRAND_NAME}, kullanıcılara restoran menüsünde yer alan ürünleri inceleme, sipariş oluşturma, online ödeme
        yapma, adrese teslimat veya şubeden gel-al şeklinde teslim alma ve sadakat programından faydalanma imkanı
        sunan bir online yiyecek ve içecek sipariş platformudur.
      </p>
    ),
  },
  {
    id: 'kullanici-sorumluluklari',
    title: 'Kullanıcı Sorumlulukları ve Güvenlik',
    content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Kullanıcı, kayıt olurken ve sipariş verirken verdiği ad, telefon ve adres bilgilerinin doğruluğundan sorumludur.</li>
        <li>Hesap şifresinin güvenliğini sağlamak kullanıcının sorumluluğundadır.</li>
        <li>Platformu yanıltıcı, sahte siparişler vermek veya sistem güvenliğini tehdit etmek amacıyla kullanmak yasaktır.</li>
        <li>Kötü niyetli kullanım veya sahte sipariş tespitinde hesap derhal askıya alınabilir ve hukuki süreç başlatılabilir.</li>
      </ul>
    ),
  },
  {
    id: 'fiyat-ve-menu',
    title: 'Menü, Fiyatlar ve Stok Durumu',
    content: (
      <p>
        Menüdeki ürünler, içerikler ve fiyatlar anlık olarak sunucu quote sistemi üzerinden güncellenir.
        {BRAND_NAME}, malzeme tedarik durumuna veya operasyonel yoğunluğa bağlı olarak ürün stoklarını ve teslimat
        sürelerini güncelleme hakkını saklı tutar.
      </p>
    ),
  },
  {
    id: 'fikri-mulkiyet',
    title: 'Fikri Mülkiyet Hakları',
    content: (
      <p>
        Platformda yer alan tüm marka logoları, tasarımlar, metinler, görseller, menü isimleri ve yazılım kodları{' '}
        {BRAND_NAME}&apos;e aittir. İzinsiz kopyalanması, çoğaltılması veya ticari amaçla kullanılması yasaktır.
      </p>
    ),
  },
];

export function TermsOfUsePage() {
  return (
    <LegalDocumentLayout
      title="Kullanım Koşulları"
      subtitle="Web Sitesi ve Mobil Platform Kullanım Şartları"
      lastUpdated="13.10.2026"
      surfaceId="terms-of-use"
      currentPath="/kullanim-kosullari"
      sections={SECTIONS}
    />
  );
}
