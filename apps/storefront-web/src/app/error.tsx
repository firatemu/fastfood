'use client';

import Link from 'next/link';

export default function ErrorBoundary({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="w-full min-h-screen bg-background flex items-center justify-center px-margin-sm" data-ff-surface="error">
      <div className="max-w-lg rounded-xl bg-surface-container p-space-lg text-center">
        <p className="font-label-sm uppercase text-primary-container">BURGER HOME</p>
        <h1 className="font-headline-md uppercase mt-2">Bir sorun oluştu</h1>
        <p className="font-body-md text-on-surface-variant mt-space-sm">
          Sayfa yüklenirken bir sorun oluştu. Tekrar deneyebilir veya ana sayfaya dönebilirsin.
        </p>
        <div className="flex justify-center gap-space-sm mt-space-md">
          <button
            type="button"
            className="px-space-lg py-3 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
            onClick={reset}
          >
            Tekrar dene
          </button>
          <Link href="/" className="px-space-lg py-3 rounded-lg bg-surface-container-high font-label-lg uppercase">
            Ana sayfa
          </Link>
        </div>
      </div>
    </main>
  );
}
