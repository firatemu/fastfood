'use client';

import { useState } from 'react';

import { OpsIcon } from '../../components/ops/ops-icon';
import { ActionButton } from '../../components/ops/ops-ui';
import {
  courierInitials,
  courierLoad,
  toggleDraftBranch,
  type Courier,
  type CourierMetrics,
} from '../../lib/courier-admin';

import type { CourierBranchOption } from './courier-create-dialog';
import styles from './couriers.module.css';

export interface CourierDetailProps {
  courier: Courier;
  metrics: CourierMetrics | undefined;
  branchOptions: readonly CourierBranchOption[];
  /** Only a super admin may move a courier between branches. */
  canEditBranches: boolean;
  busyAction: string | null;
  deliveryBranchName: string;
  onToggleActive: (courier: Courier) => void;
  onSaveBranches: (courier: Courier, branchIds: string[]) => void;
  onResetPassword: (courier: Courier) => void;
  onRequestDelivery: (courier: Courier, orderId: string) => void;
}

/**
 * Everything the operations team needs about one courier, grouped by the
 * decision it belongs to: who they are, how they sign in, which branches
 * claimed them, and what they are carrying right now.
 */
export function CourierDetail({
  courier,
  metrics,
  branchOptions,
  canEditBranches,
  busyAction,
  deliveryBranchName,
  onToggleActive,
  onSaveBranches,
  onResetPassword,
  onRequestDelivery,
}: CourierDetailProps) {
  const [orderId, setOrderId] = useState('');
  const [branchDraft, setBranchDraft] = useState<string[] | null>(null);
  const load = courierLoad(courier, metrics);
  const selectedBranchIds = branchDraft ?? courier.branches.map((branch) => branch.branchId);
  const branchDirty =
    branchDraft !== null &&
    branchDraft.slice().sort().join('|') !==
      courier.branches
        .map((b) => b.branchId)
        .sort()
        .join('|');
  const isBusy = (action: string) => busyAction === action;

  return (
    <aside className={styles.detail} aria-label="Seçili kurye ayrıntısı" data-ff-courier-detail>
      <header className={styles.detailHeader}>
        <span className={styles.avatarLarge}>{courierInitials(courier.displayName)}</span>
        <div className={styles.detailIdentity}>
          <span className={styles.kicker}>SEÇİLİ KURYE</span>
          <h2 data-ff-courier-name>{courier.displayName}</h2>
          <p className={styles.detailLogin}>
            <OpsIcon name="badge" /> @{courier.username}
          </p>
        </div>
        <span className={courier.isActive ? styles.statusReady : styles.statusPaused}>
          <i />
          {courier.isActive ? 'Uygun' : 'Beklemede'}
        </span>
      </header>

      <div className={styles.detailBody}>
        <section className={styles.block}>
          <header className={styles.blockHead}>
            <div>
              <span className={styles.kicker}>HESAP</span>
              <h3>Giriş bilgileri</h3>
            </div>
            <OpsIcon name="key" />
          </header>
          <dl className={styles.factList}>
            <div className={styles.fact}>
              <dt>Kullanıcı adı</dt>
              <dd className={styles.monoValue}>@{courier.username}</dd>
            </div>
            <div className={styles.fact}>
              <dt>Şifre</dt>
              <dd>
                <span className={styles.passwordHidden}>••••••••••</span>
              </dd>
            </div>
            <div className={styles.fact}>
              <dt>Telefon</dt>
              <dd>{courier.phone || 'Kayıtlı değil'}</dd>
            </div>
          </dl>
          <div className={styles.blockActions}>
            <ActionButton disabled={isBusy('password')} onClick={() => onResetPassword(courier)}>
              {isBusy('password') ? 'Sıfırlanıyor' : 'Şifre sıfırla'}
            </ActionButton>
            <ActionButton
              variant={courier.isActive ? 'ghost' : 'primary'}
              disabled={isBusy('active')}
              onClick={() => onToggleActive(courier)}
            >
              {isBusy('active') ? 'Güncelleniyor' : courier.isActive ? 'Beklemeye al' : 'Uygun yap'}
            </ActionButton>
          </div>
        </section>

        <section className={styles.block}>
          <header className={styles.blockHead}>
            <div>
              <span className={styles.kicker}>ŞUBE ATAMASI</span>
              <h3>Görev yerleri</h3>
            </div>
            <OpsIcon name="storefront" />
          </header>

          {courier.branches.length === 0 && branchDraft === null ? (
            <p className={styles.blockWarning}>
              <OpsIcon name="warning" /> Bu kurye henüz hiçbir şubeye atanmadı.
            </p>
          ) : null}

          <ul className={styles.branchList}>
            {courier.branches.map((branch) => (
              <li key={branch.branchId}>
                <OpsIcon name="storefront" />
                <span>{branch.branchName}</span>
                {branch.isPrimary ? <em>ana şube</em> : null}
              </li>
            ))}
          </ul>

          {canEditBranches ? (
            <div className={styles.branchEditor}>
              <span className={styles.branchEditorLabel}>Şubeleri düzenle</span>
              <div className={styles.branchChoices} role="group" aria-label="Şube ataması">
                {branchOptions.map((branch) => {
                  const checked = selectedBranchIds.includes(branch.id);
                  return (
                    <label
                      key={branch.id}
                      className={
                        checked
                          ? `${styles.branchChoice} ${styles.branchChoiceChecked}`
                          : styles.branchChoice
                      }
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isBusy('branches')}
                        onChange={() =>
                          setBranchDraft(toggleDraftBranch(selectedBranchIds, branch.id))
                        }
                      />
                      <span>{branch.name}</span>
                      {checked ? <OpsIcon name="check" /> : null}
                    </label>
                  );
                })}
              </div>
              <div className={styles.blockActions}>
                <ActionButton
                  variant="primary"
                  disabled={!branchDirty || isBusy('branches')}
                  onClick={() => onSaveBranches(courier, selectedBranchIds)}
                >
                  {isBusy('branches') ? 'Kaydediliyor' : 'Atamayı kaydet'}
                </ActionButton>
                {branchDirty ? (
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setBranchDraft(null)}
                    disabled={isBusy('branches')}
                  >
                    Vazgeç
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        <section className={styles.block}>
          <header className={styles.blockHead}>
            <div>
              <span className={styles.kicker}>OPERASYON</span>
              <h3>Yük durumu</h3>
            </div>
            <OpsIcon name="speed" />
          </header>
          <dl className={styles.factList}>
            <div className={styles.fact}>
              <dt>Aktif görev</dt>
              <dd>{load.active}</dd>
            </div>
            <div className={styles.fact}>
              <dt>Kapasite</dt>
              <dd>{load.capacity} teslimat</dd>
            </div>
            <div className={styles.fact}>
              <dt>Tamamlanan</dt>
              <dd>{metrics?.deliveredCount ?? 0}</dd>
            </div>
          </dl>
          <span className={styles.loadTrack}>
            <span className={styles.loadFill} style={{ width: `${load.percent}%` }} />
          </span>
        </section>

        <section className={styles.block}>
          <header className={styles.blockHead}>
            <div>
              <span className={styles.kicker}>HIZLI ATAMA</span>
              <h3>Yeni teslimat görevi</h3>
            </div>
            <OpsIcon name="assignment_ind" />
          </header>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="courier-order-id">
              Sipariş numarası veya ID
            </label>
            <input
              id="courier-order-id"
              className={`${styles.input} ${styles.inputMono}`}
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              placeholder="Örn. SP00030 veya UUID"
            />
          </div>
          <p className={styles.assignmentMeta}>
            <OpsIcon name="storefront" /> {deliveryBranchName}
            <OpsIcon name="speed" /> {load.label} görev
          </p>
          <ActionButton
            variant="primary"
            disabled={isBusy('delivery') || !courier.isActive || orderId.trim().length === 0}
            onClick={() => onRequestDelivery(courier, orderId.trim())}
          >
            {isBusy('delivery') ? 'Atanıyor' : 'Teslimatı ata'}
          </ActionButton>
        </section>
      </div>
    </aside>
  );
}
