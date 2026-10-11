'use client';

export type HeroSliderSlide = { id: string; name: string };

/**
 * Dots-only indicator for the hero vitrine slider.
 *
 * The previous/next arrows and the numeric counter were dropped in human QA:
 * auto-advance plus direct dot selection is enough, and the smaller control can
 * sit centred at the bottom of the hero. A faint dark pill keeps the dots
 * readable both over the dark copy area and over the product image.
 */
export function HeroSliderControl({
  slides,
  activeIndex,
  onSelect,
}: {
  slides: ReadonlyArray<HeroSliderSlide>;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const current = Math.min(activeIndex, Math.max(slides.length - 1, 0));

  return (
    <div
      role="group"
      aria-label="Vitrin slaytları"
      className="flex items-center rounded-full bg-black/45 backdrop-blur-md p-1"
    >
      {slides.map((slide, index) => (
        <button
          key={slide.id}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={`${index + 1}. slayt: ${slide.name}`}
          aria-current={index === current ? 'true' : undefined}
          className="grid h-6 w-6 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-container"
        >
          <span
            className={`h-2 rounded-full transition-all ${
              index === current ? 'w-5 bg-secondary-container' : 'w-2 bg-white/60'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
