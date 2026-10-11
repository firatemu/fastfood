'use client';

import { adminPagePermission } from '@fastfood/domain-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { useBranchContext } from '../../../components/ops/branch-context';
import { OpsIcon } from '../../../components/ops/ops-icon';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { hasStaffPermission, useStaffAccess } from '../../../components/ops/staff-access-context';
import { createAdminClient } from '../../../lib/api';
import {
  formatBbox,
  parsePolygonGeoJson,
  readPolygonFacts,
  type PolygonFacts,
} from '../../../lib/fulfillment-ops';
import { serviceAreasSchema, unknownDataSchema } from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

import styles from './service-areas.module.css';

type Area = z.infer<typeof serviceAreasSchema>['data'][number];

/**
 * The GeoJSON shape shown as a placeholder only. ADR-019 §7 forbids seeding a
 * form with data: an operator who saved the example untouched would store a
 * delivery zone that is not theirs. The field always starts empty and the
 * submit button stays disabled until the text parses.
 */
const GEOJSON_HINT = [
  '{',
  '  "type": "Polygon",',
  '  "coordinates": [[[28.9, 41.0], [29.0, 41.0], [29.0, 41.1], [28.9, 41.0]]]',
  '}',
].join('\n');

const NAME_MAX = 128;

/**
 * A module-level empty list, so the "no rows yet" branch hands the memos below
 * a stable reference. A fresh `[]` per render made both `useMemo`s recompute on
 * every keystroke, which eslint reports as a dependency that changes every time.
 */
const NO_AREAS: readonly Area[] = [];

function factsFor(value: unknown): PolygonFacts | null {
  return readPolygonFacts(value);
}

export default function ServiceAreasPage() {
  const branch = useBranchContext();
  const branchId = branch.branchId;
  const access = useStaffAccess();
  const canCreate = hasStaffPermission(access, adminPagePermission('service-areas', 'create'));
  const { markStale, markSynced, registerRefresh } = useOpsSync();

  const [state, setState] = useState<LoadState<Area[]>>({ status: 'loading' });
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('0');
  const [geoJson, setGeoJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await createAdminClient().request({
        path: `admin/branches/${branchId}/service-areas`,
        schema: serviceAreasSchema,
      });
      if (res.data.length === 0) setState({ status: 'empty' });
      else setState({ status: 'ready', data: res.data });
      markSynced();
    } catch (error) {
      setState({ status: 'error', error });
      markStale();
    }
  }, [branchId, markStale, markSynced]);

  useEffect(() => {
    registerRefresh(() => load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  // Parsed live, not on submit: `coordinates` is `z.unknown()` server-side, so
  // this read is the only place a swapped axis or a broken ring can be seen.
  const typedPolygon = useMemo(
    () => (geoJson.trim() ? parsePolygonGeoJson(geoJson) : null),
    [geoJson],
  );
  const liveFacts = useMemo(() => factsFor(typedPolygon), [typedPolygon]);

  // A parse failure is reported while typing, not on blur: the whole point of
  // this field is that the server validates nothing inside `coordinates`, so
  // silence would leave a broken polygon looking fine until it was stored.
  const geoInvalid = geoJson.trim().length > 0 && typedPolygon === null;
  const boundsInvalid = Boolean(liveFacts && !liveFacts.withinBounds);
  const priorityFilled = priority.trim().length > 0;
  const priorityValue = Number(priority);
  const priorityInvalid = priorityFilled && !/^\d+$/.test(priority.trim());
  const readyToSubmit =
    canCreate &&
    name.trim().length > 0 &&
    typedPolygon !== null &&
    // A coordinate pair outside ±90 / ±180 cannot be WGS84 at all, so the
    // composer refuses to store one while it is showing that error.
    !boundsInvalid &&
    priorityFilled &&
    !priorityInvalid &&
    Number.isInteger(priorityValue);

  const areas: readonly Area[] = state.status === 'ready' ? state.data : NO_AREAS;
  const factsById = useMemo(
    () => new Map(areas.map((area) => [area.id, factsFor(area.polygonGeoJson ?? area.polygon)])),
    [areas],
  );

  const metrics = useMemo(() => {
    const list = areas.map((area) => ({
      area,
      facts: factsById.get(area.id) ?? null,
      priority: typeof area.priority === 'number' ? area.priority : null,
    }));
    const priorities = list.map((r) => r.priority).filter((p): p is number => p !== null);
    return {
      list,
      total: list.length,
      polygons: list.filter((r) => r.facts?.type === 'Polygon').length,
      multiPolygons: list.filter((r) => r.facts?.type === 'MultiPolygon').length,
      lowest: priorities.length ? Math.min(...priorities) : null,
    };
  }, [areas, factsById]);

  function resetForm() {
    setName('');
    setPriority('0');
    setGeoJson('');
  }

  async function createArea() {
    setFormError(null);
    setFlash(null);

    if (!canCreate) return;
    if (!name.trim()) {
      setFormError('Alan adı zorunlu.');
      return;
    }
    if (name.trim().length > NAME_MAX) {
      setFormError(`Alan adı en fazla ${NAME_MAX} karakter olabilir.`);
      return;
    }
    if (!typedPolygon) {
      setFormError(
        'Polygon GeoJSON zorunlu. Koordinatları şube konumuna göre girin; alan örnek değerle doldurulmaz.',
      );
      return;
    }
    if (priorityInvalid) {
      setFormError('Öncelik 0 veya pozitif tam sayı olmalı.');
      return;
    }

    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'POST',
        path: `admin/branches/${branchId}/service-areas`,
        body: { name: name.trim(), polygonGeoJson: typedPolygon, priority: priorityValue },
        schema: unknownDataSchema,
      });
      setFlash('Servis alanı oluşturuldu.');
      resetForm();
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            Operasyon <span>/</span> Şubeler
          </div>
          <h1 className={styles.title}>Servis alanları</h1>
          <p className={styles.lede}>
            Şubeye gelen sipariş adreslerinin kabul edileceği coğrafi sınırlar. Her alan bir
            çokgen poligonuyla tanımlanır; birden çok alan aynı noktayı kapsadığında önceliği
            küçük olan kazanır.
          </p>
        </div>
        <span className={styles.scopeTag}>{branch.selected?.name ?? 'Tüm şubeler'}</span>
      </header>

      <dl className={styles.metrics}>
        <div className={styles.metric}>
          <dt>Aktif alan</dt>
          <dd>{metrics.total}</dd>
          <p className={styles.metricHint}>Listede yalnızca aktif alanlar döner.</p>
        </div>
        <div className={styles.metric}>
          <dt>Polygon</dt>
          <dd>{metrics.polygons}</dd>
          <p className={styles.metricHint}>Tek dış halka.</p>
        </div>
        <div className={styles.metric}>
          <dt>MultiPolygon</dt>
          <dd>{metrics.multiPolygons}</dd>
          <p className={styles.metricHint}>Birden çok poligon.</p>
        </div>
        <div className={styles.metric}>
          <dt>En düşük öncelik</dt>
          <dd>{metrics.lowest ?? '—'}</dd>
          <p className={styles.metricHint}>Çakışmada bu değer kazanır.</p>
        </div>
      </dl>

      {flash ? (
        <p className={styles.notice} role="status">
          <OpsIcon name="check_circle" />
          {flash}
          <button
            type="button"
            className={styles.noticeClose}
            aria-label="Bildirimi kapat"
            onClick={() => setFlash(null)}
          >
            ×
          </button>
        </p>
      ) : null}

      <div className={styles.split}>
        <section className={`${styles.panel} ${styles.composer}`} aria-label="Servis alanı oluştur">
          <header className={styles.panelHead}>
            <div>
              <span className={styles.eyebrow}>{branch.selected?.code ?? 'Şube'}</span>
              <h2 className={styles.panelTitle}>Yeni alan</h2>
            </div>
          </header>
          <div className={styles.panelBody}>
            {canCreate ? (
              <div className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="sa-name">
                    Alan adı
                    <span className={styles.labelHint}>
                      {name.length}/{NAME_MAX}
                    </span>
                  </label>
                  <input
                    id="sa-name"
                    className={styles.input}
                    value={name}
                    maxLength={NAME_MAX}
                    placeholder="Örn. Kadıköy merkez"
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="sa-priority">
                      Öncelik
                    </label>
                    <input
                      id="sa-priority"
                      className={priorityInvalid ? `${styles.input} ${styles.inputInvalid}` : styles.input}
                      value={priority}
                      inputMode="numeric"
                      aria-invalid={priorityInvalid ? true : undefined}
                      onChange={(event) => setPriority(event.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Aktif</span>
                    <span className={styles.hint}>
                      Alan kaydedildiğinde aktif olur; API pasife alma uç noktası sunmuyor.
                    </span>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="sa-geo">
                    Poligon GeoJSON
                    <span className={styles.labelHint}>boylam, enlem</span>
                  </label>
                  <textarea
                    id="sa-geo"
                    className={
                      geoInvalid || boundsInvalid
                        ? `${styles.textarea} ${styles.textareaInvalid}`
                        : styles.textarea
                    }
                    value={geoJson}
                    spellCheck={false}
                    placeholder={GEOJSON_HINT}
                    aria-invalid={geoInvalid || boundsInvalid ? true : undefined}
                    onChange={(event) => setGeoJson(event.target.value)}
                  />
                  {boundsInvalid ? (
                    <p className={styles.formError} role="alert">
                      <OpsIcon name="error" />
                      Bazı koordinatlar WGS84 sınırları dışında. GeoJSON sırası boylam, enlem
                      olmalı; eksenler ters yazılmış olabilir.
                    </p>
                  ) : geoInvalid ? (
                    <p className={styles.formError} role="alert">
                      <OpsIcon name="error" />
                      GeoJSON okunamadı. Polygon ya da MultiPolygon bekleniyor.
                    </p>
                  ) : (
                    <p className={styles.hint}>Koordinatlar WGS84, sıra boylam (x) ve enlem (y).</p>
                  )}
                </div>

                {liveFacts ? (
                  <dl className={styles.reader}>
                    <div className={styles.readerCell}>
                      <dt>Tür</dt>
                      <dd>{liveFacts.type}</dd>
                    </div>
                    <div className={styles.readerCell}>
                      <dt>Halka</dt>
                      <dd>{liveFacts.ringCount}</dd>
                    </div>
                    <div className={styles.readerCell}>
                      <dt>Köşe</dt>
                      <dd>{liveFacts.vertexCount}</dd>
                    </div>
                    <div
                      className={
                        liveFacts.withinBounds ? styles.readerCell : `${styles.readerCell} ${styles.readerCellWarn}`
                      }
                    >
                      <dt>Kapsam</dt>
                      <dd>{formatBbox(liveFacts)}</dd>
                    </div>
                  </dl>
                ) : null}

                <p className={styles.priorityNote}>
                  <OpsIcon name="low_priority" />
                  Çakışan alanlarda önceliği küçük olan kazanır: 0, 1 değerinden önce gelir. Değer
                  benzersiz olmak zorunda değildir.
                </p>

                {formError ? (
                  <p className={styles.formError} role="alert">
                    <OpsIcon name="error" />
                    {formError}
                  </p>
                ) : null}

                <div className={styles.actions}>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    disabled={busy || !readyToSubmit}
                    onClick={() => void createArea()}
                  >
                    <OpsIcon name="add" />
                    {busy ? 'Oluşturuluyor' : 'Alan oluştur'}
                  </button>
                  <button
                    className={styles.toolButton}
                    type="button"
                    disabled={busy}
                    onClick={resetForm}
                  >
                    Formu temizle
                  </button>
                </div>
              </div>
            ) : (
              <p className={styles.readOnlyNote}>
                <OpsIcon name="lock" />
                Bu rolde <code>service-areas / create</code> yetkisi yok, alan oluşturulamaz.
                Alanları görüntülemek ve yenilemek için <code>branches.read</code> gerekir.
              </p>
            )}
          </div>
        </section>

        <section className={styles.panel} aria-label="Kayıtlı servis alanları">
          <header className={styles.panelHead}>
            <div>
              <span className={styles.eyebrow}>KAYITLI ALANLAR</span>
              <h2 className={styles.panelTitle}>{branch.selected?.name ?? 'Tüm şubeler'}</h2>
            </div>
            <button
              className={styles.toolButton}
              type="button"
              onClick={() => void load()}
              aria-label="Servis alanlarını yenile"
            >
              <OpsIcon name="refresh" />
              Yenile
            </button>
          </header>

          {state.status === 'loading' ? (
            <div className={styles.statePanel} role="status">
              <OpsIcon name="progress_activity" />
              <strong>Alanlar yükleniyor</strong>
              <span>Güncel servis alanları getiriliyor.</span>
            </div>
          ) : state.status === 'error' ? (
            <div className={styles.statePanel} role="alert">
              <OpsIcon name="error" />
              <strong>Alanlar alınamadı</strong>
              <span>{errorMessage(state.error)}</span>
              <button className={styles.toolButton} type="button" onClick={() => void load()}>
                Tekrar dene
              </button>
            </div>
          ) : state.status === 'empty' ? (
            <div className={styles.statePanel}>
              <OpsIcon name="map" />
              <strong>Servis alanı yok</strong>
              <span>
                Bu şubeye bağlı servis alanı kaydı yok. Soldaki formdan ilk alanı tanımlayın.
              </span>
            </div>
          ) : (
            <>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <caption className={styles.panelCount}>
                    {metrics.total} aktif alan · önceliğe göre değil, kayıt sırasına göre listelenir
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Alan</th>
                      <th scope="col">Tür</th>
                      <th scope="col">Kapsam</th>
                      <th scope="col" style={{ textAlign: 'right' }}>
                        Öncelik
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.list.map(({ area, facts }) => (
                      <tr key={area.id}>
                        <td>
                          <span className={styles.cellName}>
                            <strong>{area.name ?? '—'}</strong>
                            <span>{area.id}</span>
                          </span>
                        </td>
                        <td>
                          <span className={styles.typeTag}>{facts?.type ?? 'GeoJSON'}</span>
                        </td>
                        <td className={styles.cellMono}>{facts ? formatBbox(facts) : '—'}</td>
                        <td className={styles.cellNum}>
                          {typeof area.priority === 'number' ? area.priority : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
