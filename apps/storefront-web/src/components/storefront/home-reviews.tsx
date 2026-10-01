import { formatRatingBps, formatRelativeTr } from '../../lib/storefront/format';
import type { StorefrontHome } from '../../lib/storefront/home';

import { MaterialIcon } from './material-icon';

export function HomeReviews({ home }: { home: StorefrontHome }) {
  const rating = formatRatingBps(home.socialProof.averageRatingBps);
  if (home.reviews.length === 0) {
    return (
      <section className="w-full bg-surface-container-lowest py-space-xl">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin">
          <h2 className="font-headline-lg text-headline-lg text-on-surface uppercase">
            MİSAFİRLERİMİZİN SÖZLERİ
          </h2>
          <p className="font-body-md text-on-surface-variant mt-space-sm">Henüz yayımlanmış yorum yok.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-surface-container-lowest py-space-xl overflow-hidden">
      <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin flex flex-col gap-space-lg">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-sm">
          <div>
            <span className="font-label-sm text-label-sm text-primary-container uppercase tracking-widest">
              GERÇEK DENEYİMLER
            </span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface uppercase">
              MİSAFİRLERİMİZİN SÖZLERİ
            </h2>
          </div>
          {rating ? (
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <MaterialIcon key={i} name="star" className="text-primary-container" filled />
              ))}
              <span className="font-headline-sm text-headline-sm text-on-surface ml-2">
                {rating} / 5.0
              </span>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {home.reviews.map((review) => (
            <article
              key={review.id}
              className="p-space-md rounded-xl bg-surface-container flex flex-col justify-between gap-space-sm"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center text-primary text-sm">{'★'.repeat(review.rating)}</div>
                <p className="font-body-md text-body-md text-on-surface">“{review.body}”</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center font-headline-sm text-primary">
                  {review.authorInitials}
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface">{review.authorDisplayName}</span>
                  <span className="font-body-sm text-[12px] text-on-surface-variant">
                    {[review.branchLabel, formatRelativeTr(review.publishedAt)].filter(Boolean).join(' • ')}
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
