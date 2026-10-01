import { BRAND_NAME, WORDMARK_SRC } from '../../lib/storefront/brand-copy';

export function BrandLogo({ className }: { className?: string }) {
  return (
    // Wordmark is a wide raster (1500×500); CSS height matches Stitch h-8 / md:h-10.
    <img src={WORDMARK_SRC} alt={BRAND_NAME} className={className ?? 'h-8 md:h-10 object-contain'} />
  );
}
