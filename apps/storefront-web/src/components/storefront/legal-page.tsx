'use client';

import { useEffect, useState } from 'react';

import { errorMessage } from '../../lib/load-state';
import {
  fetchAllergens,
  fetchPublishedContent,
  type StorefrontAllergen,
  type StorefrontContent,
} from '../../lib/storefront/discover';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { ShopError, ShopSkeleton } from './shop-states';

export function LegalPage() {
  const [docs, setDocs] = useState<StorefrontContent[]>([]);
  const [allergens, setAllergens] = useState<StorefrontAllergen[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useDeferredLoad(() => {
    void (async () => {
      try {
        const [content, allergenRows] = await Promise.all([fetchPublishedContent(), fetchAllergens()]);
        setDocs(content);
        setAllergens(allergenRows);
        setStatus('ready');
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
        setStatus('error');
      }
    })();
  }, [nonce]);

  useEffect(() => {
    if (status !== 'ready') return;
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [status]);

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error') {
    return <ShopError title="Yasal" message={error ?? 'İçerik yüklenemedi.'} onRetry={() => setNonce((n) => n + 1)} />;
  }

  const legal = docs.filter((d) => d.kind === 'LEGAL' || d.kind === 'COMPANY' || d.kind === 'ALLERGEN_DISCLAIMER');

  return (
    <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="legal">
      <div className="max-w-3xl mx-auto px-margin-sm lg:px-margin py-space-lg flex flex-col gap-space-xl">
        <div>
          <p className="font-label-sm uppercase text-primary-container">Yasal ve onaylar</p>
          <h1 className="font-headline-lg uppercase mt-1">Bilgilendirme</h1>
          <p className="font-body-md text-on-surface-variant mt-2">
            Metinler içerik kayıtlarından gelir. Kayıtlı olmayan sicil bilgisi uydurulmaz.
          </p>
        </div>
        {legal.map((doc) => (
          <article key={doc.slug} id={doc.slug} className="scroll-mt-24">
            <h2 className="font-headline-sm uppercase">{doc.title}</h2>
            {doc.effectiveAt ? (
              <p className="font-label-sm text-on-surface-variant mt-1">
                Yürürlük: {new Date(doc.effectiveAt).toLocaleDateString('tr-TR')}
              </p>
            ) : null}
            <p className="font-body-md text-on-surface-variant mt-2 whitespace-pre-wrap">{doc.body}</p>
            {doc.sections.map((section) => (
              <div key={section.id} className="mt-space-sm">
                <h3 className="font-headline-sm text-headline-sm">{section.heading}</h3>
                <p className="font-body-md text-on-surface-variant mt-1 whitespace-pre-wrap">{section.body}</p>
              </div>
            ))}
          </article>
        ))}
        <article id="alerjen-sozlugu" className="scroll-mt-24">
          <h2 className="font-headline-sm uppercase">Alerjen sözlüğü</h2>
          <ul className="mt-space-sm flex flex-col gap-2">
            {allergens.map((item) => (
              <li key={item.id} className="rounded-lg bg-surface-container-low p-space-sm">
                <p className="font-label-md uppercase">{item.name}</p>
                {item.description ? <p className="font-body-sm text-on-surface-variant">{item.description}</p> : null}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </main>
  );
}
