import { MaterialIcon } from './material-icon';

export function FulfillmentSelector({
  mode,
  onChange,
}: {
  mode: 'DELIVERY' | 'PICKUP';
  onChange: (mode: 'DELIVERY' | 'PICKUP') => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 p-1.5 bg-[#0a0c13] border border-white/[0.08] rounded-xl mb-space-md">
      <button
        type="button"
        className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3 rounded-lg font-anton tracking-wide text-xs sm:text-sm uppercase transition-all duration-200 ${
          mode === 'DELIVERY'
            ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-neutral-950 shadow-[0_4px_16px_rgba(254,179,0,0.3)] font-bold'
            : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
        }`}
        onClick={() => onChange('DELIVERY')}
        data-ff-fulfillment="DELIVERY"
      >
        <MaterialIcon name="moped" className="text-base sm:text-lg shrink-0" />
        <span className="truncate">Adrese Teslimat</span>
      </button>
      <button
        type="button"
        className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3 rounded-lg font-anton tracking-wide text-xs sm:text-sm uppercase transition-all duration-200 ${
          mode === 'PICKUP'
            ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-neutral-950 shadow-[0_4px_16px_rgba(254,179,0,0.3)] font-bold'
            : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
        }`}
        onClick={() => onChange('PICKUP')}
        data-ff-fulfillment="PICKUP"
      >
        <MaterialIcon name="storefront" className="text-base sm:text-lg shrink-0" />
        <span className="truncate">
          Şubeden Gel-Al{' '}
          <span className={mode === 'PICKUP' ? 'text-neutral-950 font-black' : 'text-amber-400 font-bold'}>
            (-%10)
          </span>
        </span>
      </button>
    </div>
  );
}
