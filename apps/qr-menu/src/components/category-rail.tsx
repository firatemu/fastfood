'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface RailCategory {
  id: string;
  name: string;
  count: number;
}

interface CategoryRailProps {
  categories: RailCategory[];
  activeCategoryId: string | null;
  onSelect: (categoryId: string) => void;
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path
        d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CategoryRail({ categories, activeCategoryId, onSelect }: CategoryRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const element = scrollerRef.current;
    if (!element) return;
    const overflow = element.scrollWidth - element.clientWidth;
    setEdges({
      left: element.scrollLeft > 4,
      right: overflow > 4 && element.scrollLeft < overflow - 4,
    });
  }, []);

  // Measured after paint: the rail only knows its overflow once it has a width.
  useEffect(() => {
    const frame = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
    };
  }, [measure, categories.length]);

  // Keep the highlighted pill visible while the reader scrolls the menu.
  useEffect(() => {
    const rail = scrollerRef.current;
    if (!rail || !activeCategoryId) return;
    const pill = rail.querySelector<HTMLElement>(`[data-qr-rail-item="${activeCategoryId}"]`);
    if (!pill) return;

    const railBox = rail.getBoundingClientRect();
    const pillBox = pill.getBoundingClientRect();
    if (pillBox.left >= railBox.left && pillBox.right <= railBox.right) return;

    rail.scrollTo({
      left: rail.scrollLeft + (pillBox.left - railBox.left) - 16,
      behavior: 'smooth',
    });
  }, [activeCategoryId]);

  const nudge = (direction: 'left' | 'right') => {
    const rail = scrollerRef.current;
    if (!rail) return;
    const max = rail.scrollWidth - rail.clientWidth;
    const page = Math.max(240, rail.clientWidth * 0.75);
    // Clamp so the last press lands exactly on the end instead of overshooting.
    const target = direction === 'right' ? Math.min(rail.scrollLeft + page, max) : Math.max(rail.scrollLeft - page, 0);
    rail.scrollTo({ left: target, behavior: 'smooth' });
  };

  if (categories.length <= 1) return null;

  return (
    <nav
      aria-label="Menü kategorileri"
      className="qr-no-print sticky top-[8.25rem] z-20 border-b border-line bg-paper/85 backdrop-blur-md"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <div
            ref={scrollerRef}
            onScroll={measure}
            className="qr-rail flex gap-1 overflow-x-auto py-3 scroll-smooth"
          >
            {categories.map((category) => {
              const isActive = category.id === activeCategoryId;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSelect(category.id)}
                  aria-current={isActive ? 'true' : undefined}
                  data-qr-rail-item={category.id}
                  className={`shrink-0 rounded-pill border px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'border-ink bg-ink text-brand'
                      : 'border-line bg-paper text-ink-soft hover:border-line-strong hover:text-ink'
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>

          {/* Overflow affordances: only rendered while the rail actually scrolls. */}
          {edges.left ? (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-paper to-transparent"
              />
              <button
                type="button"
                onClick={() => nudge('left')}
                aria-label="Önceki kategoriler"
                data-qr-rail-prev
                className="absolute top-1/2 left-0 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-pill border border-line bg-paper text-ink-soft shadow-lift transition hover:text-ink"
              >
                <ChevronIcon direction="left" />
              </button>
            </>
          ) : null}

          {edges.right ? (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-paper to-transparent"
              />
              <button
                type="button"
                onClick={() => nudge('right')}
                aria-label="Sonraki kategoriler"
                data-qr-rail-next
                className="absolute top-1/2 right-0 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-pill border border-line bg-paper text-ink-soft shadow-lift transition hover:text-ink"
              >
                <ChevronIcon direction="right" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}