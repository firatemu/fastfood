import { formatRatingBps, formatRelativeTr } from '../../lib/storefront/format';
import type { StorefrontHome } from '../../lib/storefront/home';

import { MaterialIcon } from './material-icon';

export function HomeReviews({ home }: { home: StorefrontHome }) {
  const rating = formatRatingBps(home.socialProof.averageRatingBps);
  if (home.reviews.length === 0) {
    return (
      <section className="w-full py-16 border-t border-white/[0.06] bg-neutral-950/60">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin flex flex-col gap-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(254,179,0,0.6)]" />
                <span className="font-label-sm text-label-sm text-amber-400 font-semibold uppercase tracking-widest">
                  ZANAAT & KALİTE TAAHHÜDÜ
                </span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-white font-anton uppercase tracking-wide">
                MİSAFİRLERİMİZİN SÖZLERİ
              </h2>
            </div>
            <p className="font-body-sm text-neutral-400 text-sm max-w-md">
              Henüz yayımlanmış yorum yok. İlk değerlendirmeyi siparişiniz teslim edildikten sonra sipariş detay sayfanızdan bırakabilirsiniz.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#12151f]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col gap-3 hover:border-amber-400/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <MaterialIcon name="verified" className="text-2xl" />
              </div>
              <h3 className="font-anton text-xl text-white uppercase tracking-wide">
                100% Taze Dana Döş
              </h3>
              <p className="text-neutral-400 font-body-sm text-sm leading-relaxed">
                Katkısız, dondurulmamış yerli et. Her siparişinizde yüksek ısılı döküm ızgarada sipariş anında taze smashlenir.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#12151f]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col gap-3 hover:border-amber-400/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <MaterialIcon name="bakery_dining" className="text-2xl" />
              </div>
              <h3 className="font-anton text-xl text-white uppercase tracking-wide">
                Günlük Brioche Ekmeği
              </h3>
              <p className="text-neutral-400 font-body-sm text-sm leading-relaxed">
                Tereyağlı özel reçeteli brioche ekmeklerimiz her sabah taze pişirilir ve sipariş anında hafifçe karamelize edilir.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#12151f]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col gap-3 hover:border-amber-400/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <MaterialIcon name="soup_kitchen" className="text-2xl" />
              </div>
              <h3 className="font-anton text-xl text-white uppercase tracking-wide">
                Şef İmzalı Taze Soslar
              </h3>
              <p className="text-neutral-400 font-body-sm text-sm leading-relaxed">
                Trüflü mayonezden füme barbekü sosuna kadar tüm soslarımız mutfağımızda katkısız ve taze olarak hazırlanır.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full py-16 border-t border-white/[0.06] bg-neutral-950/60 overflow-hidden">
      <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin flex flex-col gap-space-lg">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(254,179,0,0.6)]" />
              <span className="font-label-sm text-label-sm text-amber-400 font-semibold uppercase tracking-widest">
                GERÇEK DENEYİMLER
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-white font-anton uppercase tracking-wide">
              MİSAFİRLERİMİZİN SÖZLERİ
            </h2>
          </div>
          {rating ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 backdrop-blur-md">
              {Array.from({ length: 5 }).map((_, i) => (
                <MaterialIcon key={i} name="star" className="text-amber-400 text-lg" filled />
              ))}
              <span className="font-anton text-xl text-amber-400 ml-2 tracking-wide">
                {rating} / 5.0
              </span>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {home.reviews.map((review) => (
            <article
              key={review.id}
              className="p-6 rounded-2xl bg-[#12151f]/85 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between gap-4 shadow-xl hover:border-amber-400/30 transition-all"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center text-amber-400 text-base">
                  {'★'.repeat(review.rating)}
                </div>
                <p className="font-body-md text-body-md text-neutral-200 italic leading-relaxed">“{review.body}”</p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06]">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center font-anton text-amber-400">
                  {review.authorInitials}
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-white font-semibold">
                    {review.authorDisplayName}
                  </span>
                  <span className="font-body-sm text-[12px] text-neutral-400">
                    {[review.branchLabel, formatRelativeTr(review.publishedAt)]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
