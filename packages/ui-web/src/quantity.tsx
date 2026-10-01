import './styles.css';

export interface QuantityProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  label?: string;
}

/**
 * Quantity — accessible numeric stepper (input + +/- buttons).
 */
export function Quantity(props: QuantityProps) {
  const { value, min = 0, max = 99, onChange, label = 'Adet' } = props;
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div role="group" aria-label={label} className="ff-quantity">
      <button
        type="button"
        className="ff-quantity__btn"
        onClick={dec}
        disabled={value <= min}
        aria-label="Azalt"
      >
        −
      </button>
      <input
        type="number"
        className="ff-quantity__input"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        aria-label={label}
      />
      <button
        type="button"
        className="ff-quantity__btn"
        onClick={inc}
        disabled={value >= max}
        aria-label="Arttır"
      >
        +
      </button>
    </div>
  );
}
