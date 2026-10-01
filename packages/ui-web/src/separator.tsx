import type { HTMLAttributes } from 'react';

import './styles.css';

export interface SeparatorProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
}

export function Separator(props: SeparatorProps) {
  const { orientation = 'horizontal', className, ...rest } = props;
  const classes = ['ff-separator', `ff-separator--${orientation}`, className ?? '']
    .filter(Boolean)
    .join(' ');
  return <hr {...rest} className={classes} />;
}
