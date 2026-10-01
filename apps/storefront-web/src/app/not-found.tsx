import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="w-full min-h-screen bg-background flex items-center justify-center px-margin-sm" data-ff-surface="not-found">
      <div className="max-w-lg rounded-xl bg-surface-container p-space-lg text-center">
        <p className="font-label-sm uppercase text-primary-container">BURGER HOME</p>
        <h1 className="font-headline-md uppercase mt-2">Sayfa bulunamadı</h1>
        <p className="font-body-md text-on-surface-variant mt-space-sm">
          Bu adres menüde yok. Ana sayfadan devam edebilirsin.
        </p>
        <Link
          href="/"
          className="inline-flex mt-space-md px-space-lg py-3 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
        >
          Ana sayfa
        </Link>
      </div>
    </main>
  );
}
