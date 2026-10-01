export function PaymentMethodSelector({
  methods,
  selected,
  onSelect,
}: {
  methods: Array<{ code: string; label: string; available: boolean; disabledReason?: string | null }>;
  selected: string;
  onSelect: (code: string) => void;
}) {
  const icons: Record<string, string> = {
    iyzico_hosted: 'credit_card',
    masterpass: 'contactless',
    card_on_delivery: 'point_of_sale',
  };
  return (
    <div className="grid grid-cols-3 gap-2 mb-space-md">
      {methods.map((method) => {
        const active = selected === method.code && method.available;
        return (
          <button
            key={method.code}
            type="button"
            disabled={!method.available}
            onClick={() => method.available && onSelect(method.code)}
            className={`py-2.5 px-2 rounded-lg font-label-sm text-label-sm uppercase flex flex-col items-center gap-1.5 ${
              active
                ? 'bg-surface-container-high text-on-surface shadow-sm'
                : 'bg-surface-container text-on-surface-variant'
            } disabled:opacity-50`}
            data-ff-pay-method={method.code}
          >
            <span className="material-symbols-outlined text-xl">{icons[method.code] ?? 'payments'}</span>
            <span className="text-center leading-tight">{method.label}</span>
            {!method.available && method.disabledReason ? (
              <span className="font-label-sm text-[10px] normal-case">{method.disabledReason}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
