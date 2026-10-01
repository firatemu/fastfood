'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { ConfirmDialog } from '../../../components/ops/confirm-dialog';
import { OpsBoundary } from '../../../components/ops/ops-boundary';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { ActionButton, KeylineCard, StatusBadge } from '../../../components/ops/ops-ui';
import { createAdminClient } from '../../../lib/api';
import { promotionKindLabel, promotionValueSummary } from '../../../lib/finance-ops';
import { adminPromotionSchema } from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

type Promo = z.infer<typeof adminPromotionSchema>['data'];

export default function PromotionDetailPage() {
  const params = useParams<{ promotionId: string }>();
  const promotionId = params.promotionId;
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [state, setState] = useState<LoadState<Promo>>({ status: 'loading' });
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await createAdminClient().request({
        path: `admin/promotions/${promotionId}`,
        schema: adminPromotionSchema,
      });
      setState({ status: 'ready', data: res.data });
      markSynced();
    } catch (error) {
      setState({ status: 'error', error });
      markStale();
    }
  }, [markStale, markSynced, promotionId]);

  useEffect(() => {
    registerRefresh(() => load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  async function setActive(isActive: boolean) {
    setBusy(true);
    setFormError(null);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/promotions/${promotionId}`,
        body: { isActive },
        schema: adminPromotionSchema,
      });
      setFlash(isActive ? 'Aktif.' : 'Pasif.');
      setConfirmOff(false);
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
        `GLOBAL_MASTER_DATA` · `GET/PATCH admin/promotions/:id` · PATCH alanı yalnızca isActive ·
        alan düzenleme yok.
      </p>
      <OpsBoundary state={state} onRetry={() => void load()}>
        {(p) => (
          <KeylineCard
            title={p.name ?? p.code ?? p.id}
            actions={
              <StatusBadge tone={p.isActive === false ? 'idle' : 'ready'}>
                {p.isActive === false ? 'Pasif' : 'Aktif'}
              </StatusBadge>
            }
          >
            <dl className="ops-form">
              <div>
                <dt>Kod</dt>
                <dd className="mono">{p.code ?? '—'}</dd>
              </div>
              <div>
                <dt>Tür</dt>
                <dd>{promotionKindLabel(p.kind)}</dd>
              </div>
              <div>
                <dt>Değer</dt>
                <dd>{promotionValueSummary(p)}</dd>
              </div>
              <div>
                <dt>Min. sepet</dt>
                <dd className="mono">{p.minMerchandiseMinor ?? '—'} kuruş</dd>
              </div>
              <div>
                <dt>İlk sipariş</dt>
                <dd>{p.firstOrderOnly ? 'Evet' : 'Hayır'}</dd>
              </div>
              <div>
                <dt>Storefront listeli</dt>
                <dd>{p.listedOnStorefront ? 'Evet' : 'Hayır'}</dd>
              </div>
            </dl>
            <div className="ops-form-actions">
              {p.isActive === false ? (
                <ActionButton disabled={busy} onClick={() => void setActive(true)}>
                  Aktifleştir
                </ActionButton>
              ) : (
                <ActionButton variant="danger" disabled={busy} onClick={() => setConfirmOff(true)}>
                  Pasifleştir
                </ActionButton>
              )}
              <Link href="/promotions">Liste</Link>
            </div>
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
          </KeylineCard>
        )}
      </OpsBoundary>
      <ConfirmDialog
        open={confirmOff}
        title="Promosyonu pasifleştir"
        body="Checkout uygunluğu Admin’de hesaplanmaz; backend otoritedir."
        confirmLabel="Pasifleştir"
        danger
        busy={busy}
        onCancel={() => setConfirmOff(false)}
        onConfirm={() => void setActive(false)}
      />
    </div>
  );
}
