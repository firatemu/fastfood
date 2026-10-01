import Link from 'next/link';

export function HomeSkeleton() {
  return (
    <div className="w-full pt-20 bg-background min-h-screen" data-ff-home-state="loading">
      <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-xl flex flex-col gap-space-lg">
        <div className="h-72 rounded-2xl bg-surface-container animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
          <div className="h-80 rounded-xl bg-surface-container animate-pulse" />
          <div className="h-80 rounded-xl bg-surface-container animate-pulse" />
          <div className="h-80 rounded-xl bg-surface-container animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function HomeError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="w-full pt-20 bg-background min-h-screen flex items-center justify-center px-margin-sm"
      data-ff-home-state="error"
    >
      <div className="max-w-lg rounded-xl bg-surface-container p-space-lg text-center">
        <h1 className="font-headline-md text-headline-md text-on-surface uppercase">Menü yüklenemedi</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-space-sm">{message}</p>
        <div className="flex flex-wrap justify-center gap-space-sm mt-space-md">
          <button
            type="button"
            className="px-space-lg py-3 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
            onClick={onRetry}
          >
            Tekrar dene
          </button>
          <Link href="/" className="px-space-lg py-3 rounded-lg bg-surface-container-high font-label-lg uppercase">
            Ana sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HomeEmpty() {
  return (
    <div
      className="w-full pt-20 bg-background min-h-screen flex items-center justify-center px-margin-sm"
      data-ff-home-state="empty"
    >
      <div className="max-w-lg rounded-xl bg-surface-container p-space-lg text-center">
        <h1 className="font-headline-md text-headline-md text-on-surface uppercase">Menü hazırlanıyor</h1>
        <p className="font-body-md text-on-surface-variant mt-space-sm">
          Aktif vitrin ürünü yok. Şube kataloğu açıldığında burada görünecek.
        </p>
      </div>
    </div>
  );
}
