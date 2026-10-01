import type { ImgHTMLAttributes } from 'react';

import './styles.css';

export interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  ratio?: '1:1' | '4:3' | '16:9';
}

/**
 * Image — semantic <img> with optional aspect-ratio frame.
 */
export function Image(props: ImageProps) {
  const { fallbackSrc, ratio, className, alt, ...rest } = props;
  const classes = ['ff-image', ratio ? `ff-image--${ratio.replace(':', '-')}` : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return <img {...rest} alt={alt ?? ''} className={classes} data-fallback={fallbackSrc ?? ''} />;
}
