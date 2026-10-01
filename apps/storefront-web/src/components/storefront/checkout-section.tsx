import type { ReactNode } from 'react';

import { MaterialIcon } from './material-icon';

export function CheckoutSection({
  step,
  title,
  children,
  verified = false,
  trailing,
}: {
  step?: number;
  title: string;
  children: ReactNode;
  verified?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <section className="bg-surface-container-low p-space-md lg:p-space-lg rounded-xl shadow-md">
      <div className="flex items-center justify-between mb-space-md gap-space-sm">
        <div className="flex items-center gap-3 min-w-0">
          {step !== undefined ? (
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md shrink-0">
              {step}
            </span>
          ) : null}
          <h2 className="font-headline-md text-headline-md uppercase text-on-surface truncate">{title}</h2>
        </div>
        {trailing}
        {verified ? <MaterialIcon name="verified" className="text-secondary-container text-xl" filled /> : null}
      </div>
      {children}
    </section>
  );
}
