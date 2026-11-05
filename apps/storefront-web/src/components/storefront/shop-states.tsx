import Link from 'next/link';

const AUTH_REQUIRED_PATTERN = /oturum gerekli|giriş yap/i;

export function ShopSkeleton() {
  return (
    <div className="w-full pt-20 bg-background min-h-screen" data-ff-shop-state="loading">
      <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-xl flex flex-col gap-space-lg">
        <div className="h-10 w-64 rounded bg-surface-container animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <div className="lg:col-span-8 h-[32rem] rounded-2xl bg-surface-container animate-pulse" />
          <div className="lg:col-span-4 h-96 rounded-2xl bg-surface-container animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function ShopError({
  title,
  message,
  onRetry,
  surface,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  surface?: string;
}) {
  const needsAuth = AUTH_REQUIRED_PATTERN.test(message);
  const nextParam =
    typeof window !== 'undefined'
      ? `?next=${encodeURIComponent(window.location.pathname + window.location.search)}`
      : '';
  return (
    <div
      className="w-full pt-20 bg-background min-h-screen flex items-center justify-center px-margin-sm"
      data-ff-shop-state="error"
      data-ff-surface={surface}
    >
      <div className="max-w-lg rounded-xl bg-surface-container p-space-lg text-center">
        <h1 className="font-headline-md text-headline-md text-on-surface uppercase">{title}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-space-sm">{message}</p>
        <div className="flex flex-wrap justify-center gap-space-sm mt-space-md">
          {onRetry && !needsAuth ? (
            <button
              type="button"
              className="px-space-lg py-3 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
              onClick={onRetry}
            >
              Tekrar dene
            </button>
          ) : null}
          {needsAuth ? (
            <>
              <Link
                href={`/auth${nextParam}`}
                className="px-space-lg py-3 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
                data-ff-cta="login"
              >
                Giriş Yap
              </Link>
              <Link
                href={`/auth?mode=register${nextParam.includes('?') ? nextParam.replace('?', '&') : nextParam}`}
                className="px-space-lg py-3 rounded-lg bg-primary-container text-on-primary-container font-label-lg uppercase"
                data-ff-cta="register"
              >
                Üye Ol
              </Link>
            </>
          ) : (
            <Link
              href="/"
              className="px-space-lg py-3 rounded-lg bg-surface-container-high font-label-lg uppercase"
            >
              Ana sayfa
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function ShopEmpty({
  title,
  message,
  actionHref,
  actionLabel,
  compact = false,
  surface,
}: {
  title: string;
  message: string;
  actionHref: string;
  actionLabel: string;
  compact?: boolean;
  surface?: string;
}) {
  return (
    <div
      className={
        compact
          ? 'w-full py-space-lg flex items-center justify-center'
          : 'w-full pt-20 bg-background min-h-screen flex items-center justify-center px-margin-sm'
      }
      data-ff-shop-state="empty"
      data-ff-surface={surface}
    >
      <div className="relative max-w-lg w-full rounded-3xl bg-[#12151f]/90 border border-white/[0.08] backdrop-blur-xl p-8 sm:p-10 text-center shadow-2xl overflow-hidden flex flex-col items-center gap-4">
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-1 shadow-[0_0_20px_rgba(254,179,0,0.2)]">
          <span className="material-symbols-outlined text-3xl notranslate" translate="no">shopping_basket</span>
        </div>
        {compact ? (
          <h2 className="font-anton text-2xl sm:text-3xl text-white uppercase tracking-wide">{title}</h2>
        ) : (
          <h1 className="font-anton text-3xl sm:text-4xl text-white uppercase tracking-wide">{title}</h1>
        )}
        <p className="font-body-md text-sm sm:text-base text-neutral-300 max-w-sm leading-relaxed">{message}</p>
        <Link
          href={actionHref}
          className="inline-flex mt-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-neutral-950 font-anton text-base tracking-wider uppercase shadow-[0_4px_20px_rgba(254,179,0,0.35)] hover:brightness-110 active:scale-95 transition-all"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
