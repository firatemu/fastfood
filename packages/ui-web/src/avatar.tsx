import type { HTMLAttributes } from 'react';

import './styles.css';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  /** Optional image URL. */
  src?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Avatar — initials fallback when no image. role=img with aria-label.
 */
export function Avatar(props: AvatarProps) {
  const { name, src, size = 'md', className, ...rest } = props;
  const initials = name
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const classes = ['ff-avatar', `ff-avatar--${size}`, className ?? ''].filter(Boolean).join(' ');
  return (
    <span {...rest} role="img" aria-label={name} className={classes}>
      {src ? (
        <img src={src} alt="" className="ff-avatar__img" />
      ) : (
        <span aria-hidden="true" className="ff-avatar__initials">
          {initials || '?'}
        </span>
      )}
    </span>
  );
}
