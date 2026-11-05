export function PaymentMethodSelector({
  methods,
  selected,
  onSelect,
}: {
  methods: Array<{
    code: string;
    label: string;
    available: boolean;
    disabledReason?: string | null;
  }>;
  selected: string;
  onSelect: (code: string) => void;
}) {
  const icons: Record<string, string> = {
    iyzico_hosted: 'credit_card',
    masterpass: 'contactless',
    card_on_delivery: 'point_of_sale',
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-space-md">
      {methods.map((method) => {
        const active = selected === method.code && method.available;
        return (
          <button
            key={method.code}
            type="button"
            disabled={!method.available}
            onClick={() => method.available && onSelect(method.code)}
            className={`py-3.5 px-3 rounded-xl font-anton text-xs uppercase tracking-wide flex flex-col items-center gap-2 border transition-all duration-200 ${
              active
                ? 'bg-amber-500/15 border-amber-400 text-white shadow-[0_0_20px_rgba(254,179,0,0.2)]'
                : 'bg-[#0e111a]/90 border-white/[0.08] text-neutral-400 hover:text-white hover:border-white/[0.15]'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            data-ff-pay-method={method.code}
          >
            <span
              className={`material-symbols-outlined text-2xl ${
                active ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(254,179,0,0.5)]' : 'text-neutral-400'
              }`}
            >
              {icons[method.code] ?? 'payments'}
            </span>
            <span className="text-center leading-tight font-medium">{method.label}</span>
            {!method.available && method.disabledReason ? (
              <span className="font-sans text-[10px] text-neutral-500 normal-case">
                {method.disabledReason}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
