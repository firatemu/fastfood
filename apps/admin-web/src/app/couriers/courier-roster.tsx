'use client';

import { OpsIcon } from '../../components/ops/ops-icon';
import {
  COURIER_FILTERS,
  courierBranchLabel,
  courierInitials,
  courierLoad,
  type Courier,
  type CourierFilter,
  type CourierMetrics,
} from '../../lib/courier-admin';

import styles from './couriers.module.css';

export interface CourierRosterProps {
  couriers: readonly Courier[];
  metrics: Readonly<Record<string, CourierMetrics>>;
  selectedId: string;
  query: string;
  filter: CourierFilter;
  branchOptions: ReadonlyArray<{ id: string; name: string }>;
  branchScope: string | null;
  /** False for a branch manager, whose roster is pinned to their own branch. */
  canPickBranch: boolean;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: CourierFilter) => void;
  onBranchScopeChange: (branchId: string | null) => void;
  onSelect: (courierId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

/**
 * The roster column. A row answers the three questions an operations manager
 * has about a courier at a glance: who they are, which branch claimed them,
 * and how much of their capacity is already committed.
 */
export function CourierRoster({
  couriers,
  metrics,
  selectedId,
  query,
  filter,
  branchOptions,
  branchScope,
  canPickBranch,
  onQueryChange,
  onFilterChange,
  onBranchScopeChange,
  onSelect,
  onRefresh,
  refreshing,
}: CourierRosterProps) {
  return (
    <section className={styles.roster} aria-label="Kurye filosu">
      <header className={styles.rosterHead}>
        <div>
          <span className={styles.kicker}>FİLO GÖRÜNÜMÜ</span>
          <h2>Kurye filosu</h2>
          <p>{couriers.length} kayıt listeleniyor</p>
        </div>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={onRefresh}
          disabled={refreshing}
        >
          <OpsIcon name="refresh" /> Yenile
        </button>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <OpsIcon name="search" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Ad, kullanıcı adı, telefon veya şube ara"
            aria-label="Kurye ara"
          />
          {query ? (
            <button type="button" aria-label="Aramayı temizle" onClick={() => onQueryChange('')}>
              <OpsIcon name="close" />
            </button>
          ) : null}
        </label>

        {canPickBranch ? (
          <label className={styles.branchScope}>
            <OpsIcon name="storefront" />
            <select
              value={branchScope ?? ''}
              onChange={(event) => onBranchScopeChange(event.target.value || null)}
              aria-label="Şubeye göre filtrele"
            >
              <option value="">Tüm şubeler</option>
              {branchOptions.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className={styles.filters} role="tablist" aria-label="Kurye durumu filtresi">
          {COURIER_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={filter === option.value}
              className={filter === option.value ? styles.filterActive : undefined}
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.rosterList}>
        {couriers.length === 0 ? (
          <div className={styles.listEmpty}>
            <OpsIcon name="manage_search" />
            <strong>Sonuç bulunamadı</strong>
            <span>Arama, şube veya durum filtresini değiştirin.</span>
          </div>
        ) : (
          couriers.map((courier) => {
            const load = courierLoad(courier, metrics[courier.id]);
            const isSelected = courier.id === selectedId;
            return (
              <button
                type="button"
                key={courier.id}
                data-ff-courier-row={courier.id}
                aria-current={isSelected}
                className={
                  isSelected ? `${styles.rosterRow} ${styles.rosterRowSelected}` : styles.rosterRow
                }
                onClick={() => onSelect(courier.id)}
              >
                <span className={styles.avatar}>{courierInitials(courier.displayName)}</span>
                <span className={styles.identity}>
                  <strong>{courier.displayName}</strong>
                  <small className={styles.identityLogin}>@{courier.username}</small>
                  <small>{courier.phone || 'Telefon yok'}</small>
                </span>
                <span
                  className={
                    courier.branches.length
                      ? styles.branchChip
                      : `${styles.branchChip} ${styles.branchChipEmpty}`
                  }
                >
                  <OpsIcon name={courier.branches.length ? 'storefront' : 'warning'} />
                  {courierBranchLabel(courier)}
                </span>
                <span className={styles.load}>
                  <span className={styles.loadValue}>
                    <b>{load.label}</b> görev
                  </span>
                  <span className={styles.loadTrack}>
                    <span className={styles.loadFill} style={{ width: `${load.percent}%` }} />
                  </span>
                </span>
                <span className={courier.isActive ? styles.statusReady : styles.statusPaused}>
                  <i />
                  {courier.isActive ? 'Uygun' : 'Beklemede'}
                </span>
                <OpsIcon name="chevron_right" />
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
