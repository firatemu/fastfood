'use client';

import { formatTryMinor } from '@fastfood/contracts';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { ConfirmDialog } from '../../../components/ops/confirm-dialog';
import { OpsBoundary } from '../../../components/ops/ops-boundary';
import { OpsPageHeader } from '../../../components/ops/ops-page-header';
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
      <OpsBoundary state={state} onRetry={() => void load()}>
        {(p) => (
          <>
            <OpsPageHeader
              title={p.name ?? p.code ?? 'Promosyon'}
              scope={p.code ?? undefined}
              lede="Kampanyanın tanımını ve vitrindeki kullanım durumunu görüntüleyin. Bu ekrandan yalnızca aktiflik durumu değiştirilebilir; indirim tutarı, geçerlilik koşulları ve kullanım sınırları katalog verisinden gelir."
              actions={
                <StatusBadge tone={p.isActive === false ? 'idle' : 'ready'}>
                  {p.isActive === false ? 'Pasif' : 'Aktif'}
                </StatusBadge>
              }
            />
            <KeylineCard title="Kampanya tanımı">
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
                  <dd className="mono">
                    {p.minMerchandiseMinor ? formatTryMinor(p.minMerchandiseMinor) : '—'}
                  </dd>
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
                  <ActionButton
                    variant="danger"
                    disabled={busy}
                    onClick={() => setConfirmOff(true)}
                  >
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
          </>
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
