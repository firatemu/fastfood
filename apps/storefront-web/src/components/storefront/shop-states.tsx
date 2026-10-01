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
      <div className="max-w-lg rounded-xl bg-surface-container p-space-lg text-center">
        {compact ? (
          <h2 className="font-headline-md text-headline-md text-on-surface uppercase">{title}</h2>
        ) : (
          <h1 className="font-headline-md text-headline-md text-on-surface uppercase">{title}</h1>
        )}
        <p className="font-body-md text-on-surface-variant mt-space-sm">{message}</p>
        <Link
          href={actionHref}
          className="inline-flex mt-space-md px-space-lg py-3 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
