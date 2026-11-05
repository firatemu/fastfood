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
    <section className="bg-[#12151f]/85 backdrop-blur-xl border border-white/[0.08] p-4 sm:p-5 md:p-6 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] relative overflow-hidden transition-all duration-300 hover:border-white/[0.12]">
      <div className="flex items-center justify-between mb-4 md:mb-5 gap-2 sm:gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {step !== undefined ? (
            <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-neutral-950 font-anton text-sm sm:text-base font-bold shadow-[0_2px_10px_rgba(254,179,0,0.35)] shrink-0">
              {step}
            </span>
          ) : null}
          <h2 className="font-anton text-base sm:text-lg md:text-xl uppercase tracking-wide text-white leading-tight">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {trailing}
          {verified ? (
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_10px_rgba(254,179,0,0.2)]">
              <MaterialIcon name="verified" className="text-base sm:text-lg" filled />
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
