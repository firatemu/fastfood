import Link from 'next/link';

import { BRAND_NAME } from '../../lib/storefront/brand-copy';

export const PRIVACY_POLICY_UPDATED_AT = '12.10.2026';

const SECTIONS: ReadonlyArray<{ id: string; title: string; body: readonly string[] }> = [
  {
    id: 'kapsam',
    title: 'Kapsam',
    body: [
      `Bu politika ${BRAND_NAME} web sitesi (burger.azem.cloud) ve ${BRAND_NAME} Android uygulaması (com.azemyazilim.fastfoodcustomer) için geçerlidir.`,
      'Uygulama şu anda test aşamasındadır; ödemeler iyzico test (sandbox) ortamında yapılır ve gerçek para çekilmez.',
    ],
  },
  {
    id: 'toplanan-veriler',
    title: 'Topladığımız veriler',
    body: [
      'Hesap bilgileri: ad, telefon numarası, e-posta adresi ve şifre (şifre yalnızca tek yönlü özet olarak saklanır).',
      'Teslimat bilgileri: kaydettiğin adresler, haritada seçtiğin teslimat konumu, bina giriş kodu ve teslimat notu.',
      'Sipariş bilgileri: sepet, sipariş geçmişi, sadakat puanları, favoriler ve kampanya kullanımları.',
      'Destek ve bildirimler: destek ekranından gönderdiğin mesajlar ve sipariş bildirimleri.',
      'Teknik bilgiler: oturum güvenliği için IP adresi ve cihaz/tarayıcı bilgisi.',
    ],
  },
  {
    id: 'izinler',
    title: 'Cihaz izinleri',
    body: [
      'Konum: yalnızca izin verdiğinde, teslimat adresini haritada belirlemek için kullanılır. Arka planda konum toplanmaz.',
      'Kamera: yalnızca masa QR kodunu okumak için kullanılır; görüntü cihazda işlenir, kaydedilmez ve gönderilmez.',
    ],
  },
  {
    id: 'kullanim',
    title: 'Verileri neden kullanıyoruz',
    body: [
      'Siparişini almak, hazırlamak, teslim etmek ve sipariş durumunu bildirmek.',
      'Hesabını korumak, dolandırıcılığı ve kötüye kullanımı önlemek.',
      'Sadakat programını ve izin verdiysen kampanya bildirimlerini sunmak.',
      'Yasal yükümlülükleri (mali kayıtlar) yerine getirmek.',
    ],
  },
  {
    id: 'paylasim',
    title: 'Kimlerle paylaşıyoruz',
    body: [
      'iyzico: ödeme işlemi için tutar, sipariş numarası ve alıcı bilgileri. Kart bilgilerini iyzico’nun ödeme sayfasına girersin; kart bilgilerin bizim sistemimize ulaşmaz ve saklanmaz.',
      'Şube ve kurye: siparişini hazırlayan şube ve teslim eden kurye, teslimat için gerekli ad, telefon ve adres bilgisini görür.',
      'Harita: adres seçiminde harita karoları OpenFreeMap sunucularından yüklenir.',
      'Verilerini reklam amacıyla satmayız veya üçüncü taraflarla paylaşmayız.',
    ],
  },
  {
    id: 'guvenlik',
    title: 'Güvenlik ve saklama',
    body: [
      'Tüm bağlantılar HTTPS ile şifrelenir. Şifreler tek yönlü özet olarak saklanır.',
      'Hesap verilerin hesabın açık olduğu sürece saklanır. Hesabını sildiğinde kişisel verilerin hemen silinir; siparişler mali kayıt olarak kişisel bilgiler çıkarılmış hâlde saklanır.',
    ],
  },
  {
    id: 'haklar',
    title: 'Hakların ve hesap silme',
    body: [
      'KVKK kapsamında verilerine erişme, düzeltme ve silinmesini isteme hakkın vardır.',
      'Hesabını uygulamada Hesabım › Güvenlik › Hesabı sil adımlarıyla veya web sitesinde aynı ekrandan silebilirsin. Ayrıntılar hesap silme sayfasındadır.',
      'Sorular için uygulamadaki Hesabım › Destek ekranını kullanabilirsin.',
    ],
  },
];

export function PrivacyPolicyPage() {
  return (
    <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="privacy-policy">
      <div className="max-w-3xl mx-auto px-margin-sm lg:px-margin py-space-lg flex flex-col gap-space-xl">
        <div>
          <p className="font-label-sm uppercase text-primary-container">Yasal</p>
          <h1 className="font-headline-lg uppercase mt-1">Gizlilik Politikası</h1>
          <p className="font-body-md text-on-surface-variant mt-2">
            Son güncelleme: {PRIVACY_POLICY_UPDATED_AT}
          </p>
        </div>
        {SECTIONS.map((section) => (
          <article key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="font-headline-sm uppercase">{section.title}</h2>
            <ul className="mt-space-sm flex flex-col gap-2 list-disc pl-5">
              {section.body.map((line) => (
                <li key={line} className="font-body-md text-on-surface-variant">
                  {line}
                </li>
              ))}
            </ul>
          </article>
        ))}
        <p className="font-body-md text-on-surface-variant">
          <Link href="/hesap-silme" className="text-primary underline">
            Hesap silme sayfası
          </Link>
        </p>
      </div>
    </main>
  );
}
