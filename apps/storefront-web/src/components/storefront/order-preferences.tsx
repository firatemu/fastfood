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
    <div className="flex flex-col gap-space-md">
      <label className="flex items-center justify-between gap-space-md cursor-pointer">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Doğa Dostu Paketleme</h3>
          <p className="font-body-sm text-on-surface-variant">
            Plastik çatal, bıçak veya ıslak mendil gönderilmesin.
          </p>
        </div>
        <input
          type="checkbox"
          className="w-5 h-5 accent-secondary-container"
          checked={ecoPackaging}
          onChange={(event) => onEco(event.target.checked)}
          data-ff-eco
        />
      </label>
      {showContactless ? (
        <label className="flex items-center justify-between gap-space-md cursor-pointer">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Temassız teslimat</h3>
            <p className="font-body-sm text-on-surface-variant">Kapıya bırakılsın, temas olmasın.</p>
          </div>
          <input
            type="checkbox"
            className="w-5 h-5 accent-secondary-container"
            checked={contactless}
            onChange={(event) => onContactless(event.target.checked)}
            data-ff-contactless
          />
        </label>
      ) : null}
    </div>
  );
}
