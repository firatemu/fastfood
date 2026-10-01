import { MaterialIcon } from './material-icon';

export function FulfillmentSelector({
  mode,
  onChange,
}: {
  mode: 'DELIVERY' | 'PICKUP';
  onChange: (mode: 'DELIVERY' | 'PICKUP') => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-lowest rounded-lg mb-space-md">
      <button
        type="button"
        className={`flex items-center justify-center gap-2 py-2.5 rounded-md font-label-md text-label-md uppercase transition-all ${
          mode === 'DELIVERY'
            ? 'bg-secondary-container text-on-secondary-container shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
        }`}
        onClick={() => onChange('DELIVERY')}
        data-ff-fulfillment="DELIVERY"
      >
        <MaterialIcon name="moped" className="text-lg" />
        Adrese Teslimat
      </button>
      <button
        type="button"
        className={`flex items-center justify-center gap-2 py-2.5 rounded-md font-label-md text-label-md uppercase transition-all ${
          mode === 'PICKUP'
            ? 'bg-secondary-container text-on-secondary-container shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
        }`}
        onClick={() => onChange('PICKUP')}
        data-ff-fulfillment="PICKUP"
      >
        <MaterialIcon name="storefront" className="text-lg" />
        Şubeden Gel-Al (<span className="text-primary-container font-bold">-%10</span>)
      </button>
    </div>
  );
}
