import Link from 'next/link';

import { BRAND_NAME } from '../../lib/storefront/brand-copy';

export function AccountDeletionInfoPage({ deleted }: { deleted: boolean }) {
  return (
    <main
      className="w-full pt-20 bg-background min-h-screen"
      data-ff-surface="account-deletion-info"
    >
      <div className="max-w-3xl mx-auto px-margin-sm lg:px-margin py-space-lg flex flex-col gap-space-xl">
        <div>
          <p className="font-label-sm uppercase text-primary-container">{BRAND_NAME}</p>
          <h1 className="font-headline-lg uppercase mt-1">Hesap silme</h1>
          {deleted ? (
            <p className="font-body-md text-on-surface mt-2" role="status" data-ff-account-deleted>
              Hesabın silindi. Kişisel verilerin sistemimizden kaldırıldı.
            </p>
          ) : null}
        </div>
        <article>
          <h2 className="font-headline-sm uppercase">Nasıl silinir</h2>
          <ol className="mt-space-sm flex flex-col gap-2 list-decimal pl-5 font-body-md text-on-surface-variant">
            <li>{BRAND_NAME} uygulamasında veya burger.azem.cloud adresinde hesabına giriş yap.</li>
            <li>Hesabım › Güvenlik ekranını aç.</li>
            <li>
              “Hesabı sil” bölümünde onay kutusunu işaretle ve “Hesabımı kalıcı olarak sil”
              düğmesine bas.
            </li>
          </ol>
          <p className="font-body-md text-on-surface-variant mt-space-sm">
            Giriş yapamıyorsan şifreni “Şifremi unuttum” ile yenileyebilir veya Hesabım › Destek
            ekranından yazabilirsin.
          </p>
          <p className="mt-space-sm">
            <Link href="/account/security" className="text-primary underline">
              Güvenlik ekranına git
            </Link>
          </p>
        </article>
        <article>
          <h2 className="font-headline-sm uppercase">Silinen veriler</h2>
          <p className="font-body-md text-on-surface-variant mt-2">
            Ad, telefon, e-posta, şifre, bağlı sosyal hesaplar, adresler, favoriler, bildirimler,
            destek mesajları, bülten aboneliği ve tüm oturumlar işlem anında silinir.
          </p>
        </article>
        <article>
          <h2 className="font-headline-sm uppercase">Saklanan veriler</h2>
          <p className="font-body-md text-on-surface-variant mt-2">
            Siparişlerin tutar ve ürün bilgileri mali kayıt yükümlülüğü nedeniyle saklanır; bu
            kayıtlardan ad, telefon, adres ve teslimat notu çıkarılır. Açık (henüz teslim edilmemiş
            veya iptal edilmemiş) bir siparişin varken hesap silinemez.
          </p>
        </article>
        <p className="font-body-md text-on-surface-variant">
          <Link href="/gizlilik" className="text-primary underline">
            Gizlilik politikası
          </Link>
        </p>
      </div>
    </main>
  );
}
