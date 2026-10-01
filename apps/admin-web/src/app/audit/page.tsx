'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { z } from 'zod';

import { type LoadState } from '../../components/async-boundary';
import { OpsBoundary } from '../../components/ops/ops-boundary';
import { useOpsSync } from '../../components/ops/ops-sync';
import { OperationalTable } from '../../components/ops/ops-table';
import {
  auditActorId,
  filterAuditLogs,
  type AuditRow,
} from '../../lib/access-ops';
import { createAdminClient } from '../../lib/api';
import { formatOpsDateTime, shortId } from '../../lib/ops-time';
import { adminAuditSchema } from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

type Row = z.infer<typeof adminAuditSchema>['data'][number];

export default function AuditPage() {
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [state, setState] = useState<LoadState<Row[]>>({ status: 'loading' });
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [resource, setResource] = useState('');

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await createAdminClient().request({
        path: 'admin/audit',
        schema: adminAuditSchema,
      });
      if (res.data.length === 0) setState({ status: 'empty' });
      else setState({ status: 'ready', data: res.data });
      markSynced();
    } catch (error) {
      setState({ status: 'error', error });
      markStale();
    }
  }, [markStale, markSynced]);

  useEffect(() => {
    registerRefresh(() => load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  const actions = useMemo(() => {
    if (state.status !== 'ready') return [];
    return [...new Set(state.data.map((r) => r.action).filter((v): v is string => Boolean(v)))].sort();
  }, [state]);

  const rows = useMemo(() => {
    if (state.status !== 'ready') return [];
    return filterAuditLogs(state.data, { q, action, actor, resource });
  }, [action, actor, q, resource, state]);

  return (
    <div className="ops-page">
      <p className="ops-page__lede">
        `SYSTEM_GLOBAL` · `GET admin/audit` (sunucu limiti 50) · detay uç yok · ham payload yok ·
        filtre istemci · şifre/token alanı API’de yok.
      </p>
      <div className="ops-filters">
        <label className="ops-field">
          Arama
          <input
            className="ops-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="aksiyon / aktör / kaynak / request"
            aria-label="Denetim ara"
          />
        </label>
        <label className="ops-field">
          Aksiyon
          <select
            className="ops-select"
            aria-label="Aksiyon filtresi"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">Tümü</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="ops-field">
          Aktör
          <input
            className="ops-input"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="user id"
            aria-label="Aktör filtresi"
          />
        </label>
        <label className="ops-field">
          Kaynak
          <input
            className="ops-input"
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            placeholder="type / id"
            aria-label="Kaynak filtresi"
          />
        </label>
      </div>
      <OpsBoundary
        state={state}
        emptyTitle="Kayıt yok"
        emptyDescription="Denetim satırı dönmedi."
        onRetry={() => void load()}
      >
        {() =>
          rows.length === 0 ? (
            <p className="ops-page__lede">Arama sonucu yok.</p>
          ) : (
            <OperationalTable<AuditRow>
              ariaLabel="Denetim kaydı"
              rowKey={(r) => r.id}
              columns={[
                {
                  key: 'when',
                  header: 'Zaman',
                  mono: true,
                  render: (r) => formatOpsDateTime(r.createdAt),
                },
                {
                  key: 'actor',
                  header: 'Aktör',
                  mono: true,
                  render: (r) => `${r.actorType ?? '—'} ${shortId(auditActorId(r))}`,
                },
                { key: 'action', header: 'Aksiyon', render: (r) => r.action ?? '—' },
                {
                  key: 'resource',
                  header: 'Kaynak',
                  render: (r) =>
                    r.resourceType ? `${r.resourceType}:${shortId(r.resourceId ?? '')}` : '—',
                },
                {
                  key: 'branch',
                  header: 'Şube',
                  mono: true,
                  render: (r) => (r.branchId ? shortId(r.branchId) : '—'),
                },
                {
                  key: 'req',
                  header: 'Request',
                  mono: true,
                  render: (r) => (r.requestId ? shortId(r.requestId) : '—'),
                },
                { key: 'reason', header: 'Gerekçe', render: (r) => r.reason ?? '—' },
              ]}
              rows={rows}
            />
          )
        }
      </OpsBoundary>
    </div>
  );
}
