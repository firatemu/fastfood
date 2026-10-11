'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import type { ComposerForm, ComposerOption } from '../../lib/storefront/address-form';
import type { AddressMapPoint } from '../../lib/storefront/address-map-html';

import { AddressLocationPicker } from './address-location-picker';
import { MaterialIcon } from './material-icon';

/**
 * Address composer — create and edit.
 *
 * Redesigned from a stacked form into a workbench, because the map is a *tool*
 * for choosing a point, not another input. Sitting it inside the column of
 * fields meant every address edit pushed the street fields below the fold; now
 * it sits beside them and the readout under it tells you what you have chosen.
 *
 * The dialog is capped to the viewport. Its footer carries the save button, so
 * a long form scrolls the *pane* — the previous version let the dialog grow to
 * 1045px on a 1000px screen and pushed "Adresi kaydet" off the bottom entirely.
 *
 * Fields are grouped into four named sections (Kayıt · Bölge · Adres satırı ·
 * Tarif) because ten anonymous inputs in a column read as a form dump; four
 * named ones read as four things you have to decide.
 */
export function AddressComposer(props: {
  mode: 'create' | 'edit';
  form: ComposerForm;
  onFormChange: (form: ComposerForm) => void;
  provinces: ComposerOption[];
  districts: ComposerOption[];
  neighborhoods: ComposerOption[];
  districtsLoading: boolean;
  neighborhoodsLoading: boolean;
  selectedLocation: AddressMapPoint | null;
  onSelectLocation: (point: AddressMapPoint | null) => void;
  initialPoint: AddressMapPoint | null;
  devicePoint: AddressMapPoint | null;
  locating: boolean;
  locationError: string | null;
  onUseDeviceLocation: () => void;
  error: string | null;
  saving: boolean;
  canSave: boolean;
  /**
   * A precondition this form cannot satisfy on its own, e.g. the profile has no
   * phone in the format the address API requires. Stated up front rather than
   * discovered on submit: a fully filled form with an enabled save button that
   * was never going to work is a lie the interface should not tell.
   */
  blockedReason?: string | null;
  blockedHref?: string;
  blockedHrefLabel?: string;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const labelRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(props.onClose);

  useEffect(() => {
    onCloseRef.current = props.onClose;
  }, [props.onClose]);

  useEffect(() => {
    labelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const set = <K extends keyof ComposerForm>(key: K, value: ComposerForm[K]) =>
    props.onFormChange({ ...props.form, [key]: value });

  // A point picked before the region was chosen cannot belong to the region the
  // user just switched to, and the address API rejects a point that falls
  // outside the selected province. Changing the region therefore invalidates the
  // point: otherwise SAVE enables on a coordinate the API will refuse, and the
  // contradiction only surfaces after the form has been filled in full.
  const setRegion = (patch: Partial<ComposerForm>) => {
    props.onFormChange({ ...props.form, ...patch });
    props.onSelectLocation(null);
  };

  const nameOf = (options: ComposerOption[], id: string) =>
    options.find((option) => String(option.id) === id)?.name ?? null;

  const selectedProvince = props.provinces.find(
    (option) => String(option.id) === props.form.provinceId,
  );
  const provinceCenter =
    selectedProvince?.centerLatitude !== undefined && selectedProvince.centerLongitude !== undefined
      ? {
          latitude: selectedProvince.centerLatitude,
          longitude: selectedProvince.centerLongitude,
        }
      : null;

  const provinceName = nameOf(props.provinces, props.form.provinceId);
  const districtName = nameOf(props.districts, props.form.districtId);
  const neighborhoodName = nameOf(props.neighborhoods, props.form.neighborhoodId);
  const point = props.selectedLocation;

  return (
    // `.ff-acct` because this dialog is a sibling of the page shell, not a
    // descendant of it; without the scope it would paint with the storefront's
    // warm theme instead of the account surface's tokens.
    <div className="ff-acct">
      <div
        className="ff-overlay"
        style={{ zIndex: 60 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) props.onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="address-composer-title"
          className="ff-dialog ff-dialog-wide"
          data-ff-address-form
        >
          <header className="ff-dialog-head">
            <div style={{ minWidth: 0 }}>
              <div className="ff-toolbar-eyebrow">
                {props.mode === 'edit' ? 'Düzenleme' : 'Yeni kayıt'}
              </div>
              <h2 className="ff-dialog-title" id="address-composer-title">
                {props.mode === 'edit' ? 'Adresi düzenle' : 'Adres ekle'}
              </h2>
            </div>
            <button type="button" onClick={props.onClose} aria-label="Kapat" className="ff-icon-btn">
              <MaterialIcon name="close" />
            </button>
          </header>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              props.onSubmit();
            }}
            style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column' }}
          >
            <div className="ff-dialog-pane ff-scroll">
              {props.blockedReason ? (
                <div
                  className="ff-notice"
                  data-tone="warn"
                  role="status"
                  data-ff-address-blocked
                  style={{ marginBottom: '1rem' }}
                >
                  <MaterialIcon name="warning" />
                  <span>
                    {props.blockedReason}
                    {props.blockedHref ? (
                      <>
                        {' '}
                        <Link
                          href={props.blockedHref}
                          style={{
                            color: 'var(--color-secondary-container)',
                            textDecoration: 'underline',
                            textUnderlineOffset: 3,
                          }}
                        >
                          {props.blockedHrefLabel ?? 'Düzenle'}
                        </Link>
                      </>
                    ) : null}
                  </span>
                </div>
              ) : null}

              <div className="ff-workbench">
                {/* ------------------------------ fields ------------------------ */}
                <div>
                  <fieldset className="ff-fieldset">
                    <legend className="ff-fieldset-label">Kayıt</legend>
                    <label className="ff-field">
                      <span className="ff-field-label">Adres ismi</span>
                      <input
                        ref={labelRef}
                        className="ff-input"
                        placeholder="Ev, Ofis, Anne evi…"
                        aria-label="Adres ismi"
                        required
                        value={props.form.label}
                        onChange={(event) => set('label', event.target.value)}
                      />
                      <span className="ff-field-hint">
                        Listede ve sipariş özetinde bu isimle görünür.
                      </span>
                    </label>
                  </fieldset>

                  <fieldset className="ff-fieldset">
                    <legend className="ff-fieldset-label">Bölge</legend>
                    <div className="ff-field-grid">
                      <label className="ff-field">
                        <span className="ff-field-label">İl</span>
                        <select
                          className="ff-select"
                          aria-label="İl"
                          required
                          value={props.form.provinceId}
                          onChange={(event) =>
                            setRegion({
                              provinceId: event.target.value,
                              districtId: '',
                              neighborhoodId: '',
                            })
                          }
                        >
                          <option value="">İl seçin</option>
                          {props.provinces.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="ff-field">
                        <span className="ff-field-label">İlçe</span>
                        <select
                          className="ff-select"
                          aria-label="İlçe"
                          required
                          disabled={!props.form.provinceId || props.districtsLoading}
                          value={props.form.districtId}
                          onChange={(event) =>
                            setRegion({
                              districtId: event.target.value,
                              neighborhoodId: '',
                            })
                          }
                        >
                          <option value="">
                            {props.districtsLoading ? 'Yükleniyor…' : 'İlçe seçin'}
                          </option>
                          {props.districts.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="ff-field">
                        <span className="ff-field-label">Mahalle</span>
                        <select
                          className="ff-select"
                          aria-label="Mahalle"
                          required
                          disabled={!props.form.districtId || props.neighborhoodsLoading}
                          value={props.form.neighborhoodId}
                          onChange={(event) => setRegion({ neighborhoodId: event.target.value })}
                        >
                          <option value="">
                            {props.neighborhoodsLoading ? 'Yükleniyor…' : 'Mahalle seçin'}
                          </option>
                          {props.neighborhoods.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="ff-fieldset">
                    <legend className="ff-fieldset-label">Adres satırı</legend>
                    <div className="ff-field-grid">
                      <label className="ff-field">
                        <span className="ff-field-label">Cadde</span>
                        <input
                          className="ff-input"
                          placeholder="Moda Caddesi"
                          aria-label="Cadde"
                          value={props.form.avenue}
                          onChange={(event) => set('avenue', event.target.value)}
                        />
                      </label>
                      <label className="ff-field">
                        <span className="ff-field-label">Sokak</span>
                        <input
                          className="ff-input"
                          placeholder="Sokak adı"
                          aria-label="Sokak"
                          value={props.form.street}
                          onChange={(event) => set('street', event.target.value)}
                        />
                      </label>
                      <label className="ff-field">
                        <span className="ff-field-label">Bina no / isim</span>
                        <input
                          className="ff-input"
                          placeholder="No 12"
                          aria-label="Bina no veya isim"
                          value={props.form.buildingNumber}
                          onChange={(event) => set('buildingNumber', event.target.value)}
                        />
                      </label>
                      <label className="ff-field">
                        <span className="ff-field-label">Kat</span>
                        <input
                          className="ff-input"
                          placeholder="3"
                          aria-label="Kat"
                          value={props.form.floor}
                          onChange={(event) => set('floor', event.target.value)}
                        />
                      </label>
                      <label className="ff-field">
                        <span className="ff-field-label">Daire no</span>
                        <input
                          className="ff-input"
                          placeholder="7"
                          aria-label="Daire no"
                          value={props.form.apartmentNumber}
                          onChange={(event) => set('apartmentNumber', event.target.value)}
                        />
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="ff-fieldset">
                    <legend className="ff-fieldset-label">Tarif</legend>
                    <label className="ff-field">
                      <span className="ff-field-label">Adres tarif olarak</span>
                      <textarea
                        className="ff-textarea"
                        style={{ minHeight: '4.25rem' }}
                        placeholder="Zil çalışmıyor, kapıda bırak…"
                        aria-label="Adres tarif olarak"
                        value={props.form.deliveryNote}
                        onChange={(event) => set('deliveryNote', event.target.value)}
                      />
                      <span className="ff-field-hint">Kuryeye iletilir.</span>
                    </label>

                    <div className="ff-rows" style={{ marginTop: '0.25rem' }}>
                      <div className="ff-row">
                        <label className="ff-row-key" htmlFor="address-is-default">
                          <span className="ff-row-label">Varsayılan adres</span>
                          <span className="ff-row-hint">
                            Sipariş özetinde bu adres seçili gelsin.
                          </span>
                        </label>
                        <div className="ff-row-actions">
                          <span className="ff-switch">
                            <input
                              id="address-is-default"
                              type="checkbox"
                              checked={props.form.isDefault}
                              onChange={(event) => set('isDefault', event.target.checked)}
                            />
                            <span className="ff-switch-track" aria-hidden />
                          </span>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                </div>

                {/* ------------------------------ the point --------------------- */}
                <aside className="ff-workbench-side">
                  <AddressLocationPicker
                    key={`${props.mode}-${props.form.provinceId || 'province-unselected'}`}
                    initialPoint={props.initialPoint}
                    focusPoint={props.devicePoint}
                    center={provinceCenter}
                    onSelect={props.onSelectLocation}
                  />

                  <button
                    type="button"
                    onClick={props.onUseDeviceLocation}
                    disabled={props.locating}
                    data-ff-use-device-location
                    className="ff-btn ff-btn-outline"
                  >
                    <MaterialIcon name="my_location" />
                    {props.locating ? 'Konum alınıyor' : 'Konumumu bul'}
                  </button>
                  {props.locationError ? (
                    <span className="ff-field-error" role="status">
                      {props.locationError}
                    </span>
                  ) : null}

                  {/* Readout: the point is the part of an address people get
                      wrong, so it gets stated back rather than left implied. */}
                  <div className="ff-point-card" data-ff-address-point>
                    <span className="ff-point-title">Seçilen nokta</span>
                    {point ? (
                      <>
                        <div className="ff-point-line">
                          <span className="ff-point-key">Koordinat</span>
                          <span className="ff-point-value">
                            {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                          </span>
                        </div>
                        <div className="ff-point-line">
                          <span className="ff-point-key">Bölge</span>
                          <span className="ff-point-value">
                            {[neighborhoodName, districtName, provinceName]
                              .filter(Boolean)
                              .join(' · ') || 'Bölge seçilmedi'}
                          </span>
                        </div>
                        <span className="ff-tag" data-tone="ok">
                          Nokta hazır
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="ff-row-hint">
                          Haritaya dokun ya da cihaz konumunu kullan.
                        </span>
                        <span className="ff-tag" data-tone="warn">
                          Nokta gerekli
                        </span>
                      </>
                    )}
                  </div>
                </aside>
              </div>
            </div>

            <footer
              className="ff-dialog-foot"
              style={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <p
                className="ff-row-hint"
                role={props.error ? 'alert' : undefined}
                style={{ textAlign: 'left' }}
              >
                {props.error ??
                (props.blockedReason ??
                  'Adres ismi, il, ilçe, mahalle ve harita noktası gerekli.')}
              </p>
              <button
                type="submit"
                disabled={!props.canSave || props.saving || Boolean(props.blockedReason)}
                className="ff-btn ff-btn-primary"
                data-ff-address-save
              >
                {props.saving
                  ? 'Kaydediliyor'
                  : props.mode === 'edit'
                    ? 'Değişiklikleri kaydet'
                    : 'Adresi kaydet'}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </div>
  );
}