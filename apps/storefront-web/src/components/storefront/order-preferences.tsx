export function OrderPreferences({
  ecoPackaging,
  onEco,
  contactless,
  onContactless,
  showContactless,
}: {
  ecoPackaging: boolean;
  onEco: (value: boolean) => void;
  contactless: boolean;
  onContactless: (value: boolean) => void;
  showContactless: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#0e111a]/90 border border-white/[0.08] hover:border-white/[0.15] cursor-pointer transition-all">
        <div>
          <h3 className="font-anton text-sm sm:text-base text-white uppercase tracking-wide">
            Doğa Dostu Paketleme
          </h3>
          <p className="font-sans text-xs sm:text-sm text-neutral-400 mt-0.5">
            Plastik çatal, bıçak veya ıslak mendil gönderilmesin.
          </p>
        </div>
        <input
          type="checkbox"
          className="w-5 h-5 accent-amber-400 rounded cursor-pointer shrink-0"
          checked={ecoPackaging}
          onChange={(event) => onEco(event.target.checked)}
          data-ff-eco
        />
      </label>
      {showContactless ? (
        <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#0e111a]/90 border border-white/[0.08] hover:border-white/[0.15] cursor-pointer transition-all">
          <div>
            <h3 className="font-anton text-sm sm:text-base text-white uppercase tracking-wide">
              Temassız Teslimat
            </h3>
            <p className="font-sans text-xs sm:text-sm text-neutral-400 mt-0.5">
              Kapıya bırakılsın, kurye ile temas olmasın.
            </p>
          </div>
          <input
            type="checkbox"
            className="w-5 h-5 accent-amber-400 rounded cursor-pointer shrink-0"
            checked={contactless}
            onChange={(event) => onContactless(event.target.checked)}
            data-ff-contactless
          />
        </label>
      ) : null}
    </div>
  );
}
