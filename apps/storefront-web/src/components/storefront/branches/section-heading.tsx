'use client';

import type { ReactNode } from 'react';

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}): React.ReactElement {
  return (
    <header className="flex flex-col gap-space-xs">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-secondary-container" aria-hidden />
        <p className="font-label-sm uppercase tracking-[0.22em] text-secondary-container">
          {eyebrow}
        </p>
      </div>
      <h2 className="font-headline-xl-mobile md:font-headline-xl uppercase leading-[1.05] tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="mt-space-xs max-w-2xl font-body-md leading-relaxed text-on-surface-variant">
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function GoldDivider(): ReactNode {
  return (
    <div
      aria-hidden
      className="h-px w-full bg-gradient-to-r from-transparent via-secondary-container/30 to-transparent"
    />
  );
}
