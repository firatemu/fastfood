'use client';

import Link from 'next/link';

import { BRAND_NAME } from '../../lib/storefront/brand-copy';

import { LegalDocumentLayout, type LegalSection } from './legal-document-layout';

const SECTIONS: LegalSection[] = [
  {
    id: 'sirket-bilgileri',
    title: 'Ticari ve Kurumsal Bilgiler',
    content: (
      <div className="bg-surface-container p-4 rounded-xl space-y-2 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <span className="text-on-surface-variant block font-label-sm text-xs">Ticari Unvan:</span>
            <span className="font-semibold text-on-surface">{BRAND_NAME} Gıda ve Restoran İşletmeleri A.Ş.</span>
          </div>
          <div>
            <span className="text-on-surface-variant block font-label-sm text-xs">Marka Adı:</span>
            <span className="font-semibold text-on-surface">{BRAND_NAME}</span>
          </div>
          <div>
            <span className="text-on-surface-variant block font-label-sm text-xs">Merkez Adres:</span>
            <span className="font-semibold text-on-surface">Moda Caddesi No:12/A, Kadıköy / İstanbul</span>
          </div>
          <div>
            <span className="text-on-surface-variant block font-label-sm text-xs">Vergi Dairesi & No:</span>
            <span className="font-semibold text-on-surface">Kadıköy V.D. / 1234567890</span>
          </div>
          <div>
            <span className="text-on-surface-variant block font-label-sm text-xs">Ticaret Sicil No:</span>
            <span className="font-semibold text-on-surface">İstanbul Ticaret Sicili - 987654</span>
          </div>
          <div>
            <span className="text-on-surface-variant block font-label-sm text-xs">MERSİS Numarası:</span>
            <span className="font-semibold text-on-surface">0123456789000001</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'iletisim',
    title: 'İletişim ve Müşteri Destek Kanalları',
    content: (
      <div className="space-y-2">
        <p>
          Müşteri memnuniyeti ve sipariş desteği için aşağıdaki iletişim kanallarından bize ulaşabilirsiniz:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Müşteri Hizmetleri / Çağrı Merkezi:</strong> 0850 308 00 00</li>
          <li><strong>Kadıköy Şube Telefon:</strong> +90 216 123 45 67</li>
          <li><strong>Kurumsal E-posta:</strong> iletisim@burger.azem.cloud</li>
          <li><strong>Müşteri Destek E-posta:</strong> destek@burger.azem.cloud</li>
          <li><strong>Web Sitesi:</strong> https://burger.azem.cloud</li>
          <li>
            <strong>Canlı Destek Hattı:</strong>{' '}
            <Link href="/account/support" className="text-primary underline">
              Sipariş Canlı Destek Ekranı
            </Link>
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'odeme-ve-guvenlik',
    title: 'Ödeme Altyapısı ve Güvenlik Ortakları',
    content: (
      <div className="space-y-2">
        <p>
          Online ödemeler, Türkiye Cumhuriyet Merkez Bankası (TCMB) lisanslı ve PCI-DSS Seviye 1 sertifikalı{' '}
          <strong>İyzi Ödeme ve Menkul Kıymetler A.Ş. (iyzico)</strong> güvencesiyle 3D Secure protokolü
          kullanılarak gerçekleştirilmektedir.
        </p>
        <p>
          Web sitemiz ve mobil uygulamamız üzerindeki tüm veri iletimi 256-Bit SSL (TLS 1.3) şifreleme ile
          korunmaktadır.
        </p>
      </div>
    ),
  },
  {
    id: 'denetim',
    title: 'Yetkili Denetim Mercii',
    content: (
      <p>
        İşletmemiz, T.C. Ticaret Bakanlığı ve T.C. Tarım ve Orman Bakanlığı ilgili mevzuat hükümlerine ve
        denetimlerine tabidir.
      </p>
    ),
  },
];

export function ImprintPage() {
  return (
    <LegalDocumentLayout
      title="Şirket Bilgileri ve Künye"
      subtitle="6563 Sayılı Elektronik Ticaret Kanunu Uyarınca Zorunlu Bilgilendirme"
      lastUpdated="13.10.2026"
      surfaceId="imprint"
      currentPath="/kunye"
      sections={SECTIONS}
    />
  );
}
