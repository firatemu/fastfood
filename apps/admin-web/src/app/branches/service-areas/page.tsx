'use client';

import { useCallback, useEffect, useState } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { useBranchContext } from '../../../components/ops/branch-context';
import { OpsBoundary } from '../../../components/ops/ops-boundary';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { OperationalTable } from '../../../components/ops/ops-table';
import { ActionButton, KeylineCard, StatusBadge } from '../../../components/ops/ops-ui';
import { createAdminClient } from '../../../lib/api';
import {
  DEMO_SERVICE_POLYGON,
  parsePolygonGeoJson,
  polygonSummary,
} from '../../../lib/fulfillment-ops';
import { serviceAreasSchema, unknownDataSchema } from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

type Area = z.infer<typeof serviceAreasSchema>['data'][number];

export default function ServiceAreasPage() {
  const branch = useBranchContext();
  const branchId = branch.branchId;
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [state, setState] = useState<LoadState<Area[]>>({ status: 'loading' });
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('0');
  const [geoJson, setGeoJson] = useState(() => JSON.stringify(DEMO_SERVICE_POLYGON, null, 2));
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

  async function createArea() {
    setBusy(true);
    setFormError(null);
    setFlash(null);
    const polygon = parsePolygonGeoJson(geoJson);
    const pri = Number(priority);
    if (!name.trim()) {
      setFormError('Ad zorunlu.');
      setBusy(false);
      return;
    }
    if (!polygon) {
      setFormError('Polygon GeoJSON (Polygon veya MultiPolygon) gerekli. Harita yok.');
      setBusy(false);
      return;
    }
    if (!Number.isInteger(pri) || pri < 0) {
      setFormError('Öncelik 0 veya pozitif tam sayı olmalı.');
      setBusy(false);
      return;
    }
    try {
      await createAdminClient().request({
        method: 'POST',
        path: `admin/branches/${branchId}/service-areas`,
        body: { name: name.trim(), polygonGeoJson: polygon, priority: pri },
        schema: unknownDataSchema,
      });
      setFlash('Servis alanı oluşturuldu.');
      setName('');
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ops-page">
      <p className="ops-page__lede">
        `BRANCH_SCOPED` · topbar şubesi `{branch.selected?.name ?? branchId}` · `GET/POST
        admin/branches/:id/service-areas` · PATCH/DELETE yok · harita yok.
      </p>
      <div className="ops-split">
        <KeylineCard title="Yeni alan">
          <div className="ops-form">
            <label className="ops-field">
              Ad
              <input className="ops-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="ops-field">
              Öncelik
              <input
                className="ops-input"
                value={priority}
                inputMode="numeric"
                onChange={(e) => setPriority(e.target.value)}
              />
            </label>
            <label className="ops-field">
              polygonGeoJson
              <textarea
                className="ops-textarea"
                rows={10}
                value={geoJson}
                aria-label="Servis alanı GeoJSON"
                onChange={(e) => setGeoJson(e.target.value)}
              />
            </label>
            <ActionButton variant="primary" onClick={() => void createArea()} disabled={busy}>
              {busy ? 'Oluşturuluyor' : 'Oluştur'}
            </ActionButton>
            {flash ? (
              <p className="ops-flash ops-flash--ok" role="status">
                {flash}
              </p>
            ) : null}
            {formError ? (
              <p className="ops-flash ops-flash--err" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
        </KeylineCard>
        <OpsBoundary
          state={state}
          emptyTitle="Servis alanı yok"
          emptyDescription="Bu şubede servis alanı kaydı yok."
          onRetry={() => void load()}
        >
          {(rows) => (
            <OperationalTable<Area>
              ariaLabel="Servis alanları"
              rowKey={(r) => r.id}
              columns={[
                { key: 'name', header: 'Ad', render: (r) => r.name ?? '—' },
                {
                  key: 'priority',
                  header: 'Öncelik',
                  numeric: true,
                  render: (r) => String(r.priority ?? '—'),
                },
                {
                  key: 'geo',
                  header: 'GeoJSON',
                  mono: true,
                  render: (r) => polygonSummary(r.polygonGeoJson ?? r.polygon),
                },
                {
                  key: 'active',
                  header: 'Durum',
                  render: (r) => (
                    <StatusBadge tone={r.isActive === false ? 'idle' : 'ready'}>
                      {r.isActive === false ? 'Pasif' : 'Aktif'}
                    </StatusBadge>
                  ),
                },
              ]}
              rows={rows}
            />
          )}
        </OpsBoundary>
      </div>
    </div>
  );
}
