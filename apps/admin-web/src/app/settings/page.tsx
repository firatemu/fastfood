'use client';

import { useCallback, useEffect, useState } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../components/async-boundary';
import { ConfirmDialog } from '../../components/ops/confirm-dialog';
import { OpsBoundary } from '../../components/ops/ops-boundary';
import { useOpsSync } from '../../components/ops/ops-sync';
import { OperationalTable } from '../../components/ops/ops-table';
import { ActionButton, KeylineCard, StatusBadge } from '../../components/ops/ops-ui';
import {
  canPatchSetting,
  classifySetting,
  displaySettingValue,
  parseSettingJson,
  settingClassLabel,
  type SettingClass,
  type SettingRow,
} from '../../lib/access-ops';
import { createAdminClient } from '../../lib/api';
import { adminSettingPatchSchema, adminSettingsSchema } from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

type Setting = z.infer<typeof adminSettingsSchema>['data'][number];

function toneFor(kind: SettingClass) {
  if (kind === 'SECURITY_SENSITIVE') return 'critical' as const;
  if (kind === 'CUSTOMER_BEHAVIOR_AFFECTING') return 'warn' as const;
  if (kind === 'READ_ONLY_RUNTIME_INFO') return 'idle' as const;
  return 'ready' as const;
}

export default function SettingsPage() {
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [state, setState] = useState<LoadState<Setting[]>>({ status: 'loading' });
  const [selectedKey, setSelectedKey] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await createAdminClient().request({
        path: 'admin/settings',
        schema: adminSettingsSchema,
      });
      if (res.data.length === 0) setState({ status: 'empty' });
      else {
        setState({ status: 'ready', data: res.data });
        const first = res.data.find((row) => canPatchSetting(row)) ?? res.data[0];
        if (first) {
          setSelectedKey((prev) => prev || first.key);
          setDraft((prev) => prev || JSON.stringify(first.valueJson ?? null, null, 2));
        }
      }
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

  const selected =
    state.status === 'ready' ? state.data.find((row) => row.key === selectedKey) : undefined;
  const selectedClass = selected ? classifySetting(selected) : null;

  function selectRow(row: Setting) {
    setSelectedKey(row.key);
    setDraft(JSON.stringify(row.valueJson ?? null, null, 2));
    setFormError(null);
    setFlash(null);
  }

  async function save() {
    if (!selected || !canPatchSetting(selected)) {
      setFormError('Bu ayar Admin UI’dan değiştirilemez.');
      return;
    }
    const parsed = parseSettingJson(draft);
    if (!parsed.ok) {
      setFormError('valueJson geçerli JSON olmalı.');
      return;
    }
    setBusy(true);
    setFormError(null);
    setFlash(null);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/settings/${encodeURIComponent(selected.key)}`,
        body: { valueJson: parsed.value },
        schema: adminSettingPatchSchema,
      });
      setFlash(`Kaydedildi: ${selected.key}`);
      setConfirm(false);
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
        `SYSTEM_GLOBAL` · `GET admin/settings` · `PATCH :key` yalnızca `mutable` · gizli anahtarlar
        gösterilmez/düzenlenmez · sağlayıcı sırları yok · ortam değişkenleri burada değil.
      </p>
      <div className="ops-split">
        <OpsBoundary
          state={state}
          emptyTitle="Ayar yok"
          emptyDescription="Business setting satırı yok."
          onRetry={() => void load()}
        >
          {(rows) => (
            <OperationalTable<SettingRow>
              ariaLabel="İş ayarları"
              rowKey={(r) => r.key}
              onRowClick={(row) => selectRow(row as Setting)}
              columns={[
                { key: 'key', header: 'Key', mono: true, render: (r) => r.key },
                {
                  key: 'class',
                  header: 'Sınıf',
                  render: (r) => {
                    const kind = classifySetting(r);
                    return <StatusBadge tone={toneFor(kind)}>{settingClassLabel(kind)}</StatusBadge>;
                  },
                },
                {
                  key: 'value',
                  header: 'Değer',
                  mono: true,
                  render: (r) => displaySettingValue(r),
                },
                {
                  key: 'mut',
                  header: 'Yazılır',
                  render: (r) => (r.mutable ? 'Evet' : 'Hayır'),
                },
              ]}
              rows={rows}
            />
          )}
        </OpsBoundary>
        <KeylineCard title="Ayar düzenle">
          {selected ? (
            <div className="ops-form">
              <p>
                <code>{selected.key}</code>
              </p>
              <p className="ops-page__lede">
                {selected.description ?? 'Açıklama yok'} · {selected.category ?? '—'} ·{' '}
                {selectedClass ? settingClassLabel(selectedClass) : ''}
              </p>
              {selectedClass === 'CUSTOMER_BEHAVIOR_AFFECTING' ? (
                <p className="ops-page__lede">
                  Müşteri davranışı anahtarı. Club earn yolu şu an bu kaydı okumuyor; Web/Mobile
                  sözleşme değişmedi.
                </p>
              ) : null}
              <label className="ops-field">
                valueJson
                <textarea
                  className="ops-input"
                  rows={6}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={!canPatchSetting(selected)}
                  aria-label="Ayar JSON değeri"
                />
              </label>
              <ActionButton
                variant="primary"
                disabled={busy || !canPatchSetting(selected)}
                onClick={() => setConfirm(true)}
              >
                Kaydet
              </ActionButton>
              {flash ? <p className="ops-page__lede">{flash}</p> : null}
              {formError ? (
                <p className="ops-page__lede" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="ops-page__lede">Listeden bir ayar seçin.</p>
          )}
        </KeylineCard>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Ayar yazılsın mı?"
        body={`${selected?.key ?? ''} kaydı PATCH edilecek. Backend mutable değilse reddeder.`}
        confirmLabel="Kaydet"
        busy={busy}
        danger={selectedClass === 'CUSTOMER_BEHAVIOR_AFFECTING'}
        onCancel={() => setConfirm(false)}
        onConfirm={() => void save()}
      />
    </div>
  );
}
