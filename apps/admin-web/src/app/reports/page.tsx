'use client';

import { formatTryMinor } from '@fastfood/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { type LoadState } from '../../components/async-boundary';
import { OpsBoundary } from '../../components/ops/ops-boundary';
import { useOpsSync } from '../../components/ops/ops-sync';
import { OperationalTable } from '../../components/ops/ops-table';
import { ActionButton, OperationalMetric } from '../../components/ops/ops-ui';
import {
  REPORT_TABS,
  sumSalesReport,
  type ReportTabId,
  type SalesReportRow,
} from '../../lib/access-ops';
import { createAdminClient } from '../../lib/api';
import { shortId } from '../../lib/ops-time';
import {
  reportBranchesSchema,
  reportCouriersSchema,
  reportProductsSchema,
  reportSalesSchema,
} from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

type ReportRow = {
  key: string;
  day?: string;
  orderCount?: string;
  gross?: string;
  refunded?: string;
  net?: string;
  branchId?: string;
  productId?: string;
  quantity?: string;
  courierId?: string;
  delivered?: string;
  active?: string;
};

export default function ReportsPage() {
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [tab, setTab] = useState<ReportTabId>('sales');
  const [state, setState] = useState<LoadState<ReportRow[]>>({ status: 'loading' });
  const [sales, setSales] = useState<SalesReportRow[]>([]);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const client = createAdminClient();
      if (tab === 'sales') {
        const res = await client.request({ path: 'admin/reports/sales', schema: reportSalesSchema });
        setSales(res.data);
        const rows: ReportRow[] = res.data.map((row) => ({
          key: row.day ?? '—',
          day: row.day ?? '—',
          orderCount: String(row.orderCount ?? 0),
          gross: row.grossMinor ? formatTryMinor(row.grossMinor, 'TRY') : '—',
          refunded: row.refundedMinor ? formatTryMinor(row.refundedMinor, 'TRY') : '—',
          net: row.netMinor ? formatTryMinor(row.netMinor, 'TRY') : '—',
        }));
        if (rows.length === 0) setState({ status: 'empty' });
        else setState({ status: 'ready', data: rows });
      } else if (tab === 'branches') {
        const res = await client.request({
          path: 'admin/reports/branches',
          schema: reportBranchesSchema,
        });
        setSales([]);
        const rows: ReportRow[] = res.data.map((row) => ({
          key: row.branchId,
          branchId: row.branchId,
          orderCount: String(row.orderCount ?? 0),
          gross: row.grossMinor ? formatTryMinor(row.grossMinor, 'TRY') : '—',
        }));
        if (rows.length === 0) setState({ status: 'empty' });
        else setState({ status: 'ready', data: rows });
      } else if (tab === 'products') {
        const res = await client.request({
          path: 'admin/reports/products',
          schema: reportProductsSchema,
        });
        setSales([]);
        const rows: ReportRow[] = res.data.map((row) => ({
          key: row.productId,
          productId: row.productId,
          quantity: String(row.quantity ?? 0),
          gross: row.grossMinor ? formatTryMinor(row.grossMinor, 'TRY') : '—',
        }));
        if (rows.length === 0) setState({ status: 'empty' });
        else setState({ status: 'ready', data: rows });
      } else {
        const res = await client.request({
          path: 'admin/reports/couriers',
          schema: reportCouriersSchema,
        });
        setSales([]);
        const rows: ReportRow[] = res.data.map((row) => ({
          key: row.courierId,
          courierId: row.courierId,
          delivered: String(row.deliveredCount ?? 0),
          active: String(row.activeCount ?? 0),
        }));
        if (rows.length === 0) setState({ status: 'empty' });
        else setState({ status: 'ready', data: rows });
      }
      markSynced();
    } catch (error) {
      setState({ status: 'error', error });
      markStale();
    }
  }, [markStale, markSynced, tab]);

  useEffect(() => {
    registerRefresh(() => load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  const totals = useMemo(() => (tab === 'sales' ? sumSalesReport(sales) : null), [sales, tab]);

  return (
    <div className="ops-page">
      <p className="ops-page__lede">
        `GLOBAL_ANALYTICS` · `GET admin/reports/sales|branches|products|couriers` · tarih/şube
        sorgusu yok · gün alanı UTC `YYYY-MM-DD` (backend) · dışa aktarma API yok · grafik yok.
      </p>
      <div className="ops-filters" role="tablist" aria-label="Rapor türü">
        {REPORT_TABS.map((item) => (
          <ActionButton
            key={item.id}
            variant={tab === item.id ? 'primary' : 'ghost'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </ActionButton>
        ))}
      </div>
      {tab === 'sales' && totals ? (
        <dl className="ops-metrics">
          <OperationalMetric
            label="Sipariş"
            value={String(totals.orderCount)}
            hint="GET admin/reports/sales · tüm günler"
          />
          <OperationalMetric
            label="Brüt"
            value={formatTryMinor(totals.grossMinor.toString(), 'TRY')}
            hint="finalPayableMinor toplamı"
          />
          <OperationalMetric
            label="İade"
            value={formatTryMinor(totals.refundedMinor.toString(), 'TRY')}
            hint="FAILED hariç iadeler"
          />
          <OperationalMetric
            label="Net"
            value={formatTryMinor(totals.netMinor.toString(), 'TRY')}
            hint="brüt − iade (backend)"
          />
        </dl>
      ) : null}
      <OpsBoundary
        state={state}
        emptyTitle="Rapor boş"
        emptyDescription="Bu uç henüz toplanmış satır döndürmedi."
        onRetry={() => void load()}
      >
        {(rows) =>
          tab === 'sales' ? (
            <OperationalTable<ReportRow>
              ariaLabel="Satış raporu"
              rowKey={(r) => r.key}
              columns={[
                { key: 'day', header: 'Gün (UTC)', mono: true, render: (r) => r.day ?? '—' },
                { key: 'orders', header: 'Sipariş', numeric: true, render: (r) => r.orderCount ?? '—' },
                { key: 'gross', header: 'Brüt', numeric: true, render: (r) => r.gross ?? '—' },
                { key: 'refunded', header: 'İade', numeric: true, render: (r) => r.refunded ?? '—' },
                { key: 'net', header: 'Net', numeric: true, render: (r) => r.net ?? '—' },
              ]}
              rows={rows}
            />
          ) : tab === 'branches' ? (
            <OperationalTable<ReportRow>
              ariaLabel="Şube raporu"
              rowKey={(r) => r.key}
              columns={[
                {
                  key: 'branch',
                  header: 'Şube ID',
                  mono: true,
                  render: (r) => shortId(r.branchId ?? ''),
                },
                { key: 'orders', header: 'Sipariş', numeric: true, render: (r) => r.orderCount ?? '—' },
                { key: 'gross', header: 'Brüt', numeric: true, render: (r) => r.gross ?? '—' },
              ]}
              rows={rows}
            />
          ) : tab === 'products' ? (
            <OperationalTable<ReportRow>
              ariaLabel="Ürün raporu"
              rowKey={(r) => r.key}
              columns={[
                {
                  key: 'product',
                  header: 'Ürün ID',
                  mono: true,
                  render: (r) => shortId(r.productId ?? ''),
                },
                { key: 'qty', header: 'Adet', numeric: true, render: (r) => r.quantity ?? '—' },
                { key: 'gross', header: 'Brüt', numeric: true, render: (r) => r.gross ?? '—' },
              ]}
              rows={rows}
            />
          ) : (
            <OperationalTable<ReportRow>
              ariaLabel="Kurye raporu"
              rowKey={(r) => r.key}
              columns={[
                {
                  key: 'courier',
                  header: 'Kurye ID',
                  mono: true,
                  render: (r) => shortId(r.courierId ?? ''),
                },
                { key: 'delivered', header: 'Teslim', numeric: true, render: (r) => r.delivered ?? '—' },
                { key: 'active', header: 'Aktif', numeric: true, render: (r) => r.active ?? '—' },
              ]}
              rows={rows}
            />
          )
        }
      </OpsBoundary>
    </div>
  );
}
