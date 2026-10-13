'use client';

import Link from 'next/link';

import { BRAND_NAME } from '../../lib/storefront/brand-copy';

import { LegalDocumentLayout, type LegalSection } from './legal-document-layout';

const SECTIONS: LegalSection[] = [
  {
    id: 'veri-sorumlusu',
    title: 'Veri Sorumlusunun Kimliği',
    content: (
      <p>
        6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, veri sorumlusu sıfatıyla{' '}
        <strong>{BRAND_NAME} Gıda ve Restoran İşletmeleri</strong> olarak, kişisel verilerinizin güvenliğine ve
        gizliliğine azami hassasiyet göstermekteyiz.
      </p>
    ),
  },
  {
    id: 'islenen-veriler',
    title: 'İşlenen Kişisel Veriler',
    content: (
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Kimlik Bilgileri:</strong> Ad, soyad.</li>
        <li><strong>İletişim Bilgileri:</strong> Telefon numarası, e-posta adresi, teslimat adresi, bina ve daire no.</li>
        <li><strong>Müşteri İşlem Bilgileri:</strong> Sepet detayları, sipariş geçmişi, teslimat tercihleri, bahşiş tutarı, kupon kullanımları, Ember sadakat puanları.</li>
        <li><strong>İşlem Güvenliği Bilgileri:</strong> IP adresi, cihaz ve tarayıcı bilgileri, oturum çerezleri, şifre özetleri (şifreler tek yönlü kriptografik hash olarak tutulur).</li>
        <li><strong>Konum Bilgileri:</strong> Kullanıcı izniyle haritada belirlenen teslimat koordinatları (arka planda izinsiz takip yapılmaz).</li>
        <li><strong>Ödeme Bilgileri:</strong> Kredi kartı numarası sistemlerimizde tutulmaz; iyzico işlem referans kodu ve ödeme durumu saklanır.</li>
      </ul>
    ),
  },
  {
    id: 'isleme-amaclari',
    title: 'Kişisel Verilerin İşlenme Amaçları',
    content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Siparişlerinizin mutfakta doğru şekilde hazırlanması ve adresinize hızlıca ulaştırılması,</li>
        <li>Sipariş durumu ve teslimat süreci hakkında SMS ve anlık bildirim ile bilgi verilmesi,</li>
        <li>Mali ve yasal yükümlülüklerin (e-fatura, e-arşiv, vergi mevzuatı) yerine getirilmesi,</li>
        <li>Yetkisiz işlemlerin, sahte siparişlerin ve dolandırıcılığın önlenmesi,</li>
        <li>Müşteri destek taleplerinin karşılanması ve memnuniyet takibi,</li>
        <li>Açık rıza vermeniz halinde Ember Club sadakat avantajları ve kampanya bildirimlerinin sunulması.</li>
      </ul>
    ),
  },
  {
    id: 'aktarim',
    title: 'Kişisel Verilerin Aktarılması',
    content: (
      <p>
        Kişisel verileriniz; siparişin teslimi için ilgili {BRAND_NAME} şubesi ve yetkili kuryelerine;
        ödemelerin güvenle tahsil edilmesi için lisanslı ödeme kuruluşu iyzico&apos;ya; harita hizmeti için
        OpenFreeMap altyapısına ve kanunen yetkili kamu kurum ve kuruluşlarına yasal zorunluluklar çerçevesinde
        aktarılabilir. Verileriniz hiçbir şekilde üçüncü şahıslara ticari/reklam amaçlı satılmaz veya devredilmez.
      </p>
    ),
  },
  {
    id: 'toplama-ve-hukuki-sebep',
    title: 'Toplama Yöntemi ve Hukuki Sebebi',
    content: (
      <p>
        Kişisel verileriniz, internet sitemiz, mobil uygulamamız ve destek ekranlarımız aracılığıyla elektronik
        ortamda toplanmaktadır. Bu işlemler; KVKK m. 5/2-c (sözleşmenin kurulması ve ifası), KVKK m. 5/2-ç
        (veri sorumlusunun hukuki yükümlülüğü) ve KVKK m. 5/2-f (meşru menfaat) hukuki sebeplerine dayanmaktadır.
      </p>
    ),
  },
  {
    id: 'haklar',
    title: 'İlgili Kişinin Hakları ve Başvuru',
    content: (
      <>
        <p>
          KVKK&apos;nın 11. maddesi uyarınca herkes; kişisel verilerinin işlenip işlenmediğini öğrenme, işlenmişse bilgi
          talep etme, amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde/dışında aktarıldığı 3. kişileri
          bilme, eksik/yanlış işlenmişse düzeltilmesini isteme, silinmesini veya yok edilmesini isteme haklarına sahiptir.
        </p>
        <p>
          Hesabınızı ve kişisel verilerinizi dilediğiniz an tek tıkla silebilirsiniz:{' '}
          <Link href="/hesap-silme" className="text-primary underline">
            Hesap Silme Sayfası
          </Link>
          . Diğer tüm talepleriniz için <span className="text-on-surface">destek@burger.azem.cloud</span> adresine
          başvurabilirsiniz.
        </p>
      </>
    ),
  },
];

export function KvkkPage() {
  return (
    <LegalDocumentLayout
      title="KVKK Aydınlatma Metni"
      subtitle="Kişisel Verilerin Korunması ve İşlenmesi Politikası"
      lastUpdated="13.10.2026"
      surfaceId="kvkk"
      currentPath="/kvkk"
      sections={SECTIONS}
    />
  );
}
