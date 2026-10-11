'use client';

import { useState } from 'react';

import { OpsIcon } from '../../components/ops/ops-icon';
import { ActionButton } from '../../components/ops/ops-ui';
import {
  EMPTY_COURIER_DRAFT,
  MAX_COURIER_CAPACITY,
  passwordPolicyState,
  toggleDraftBranch,
  usernameHint,
  validateCourierDraft,
  type CourierDraft,
} from '../../lib/courier-admin';

import styles from './couriers.module.css';

export interface CourierBranchOption {
  id: string;
  name: string;
}

export interface CourierCreateDialogProps {
  branches: readonly CourierBranchOption[];
  /**
   * Set for a branch manager: the roster they may write is their own branch
   * only, so the picker collapses to a single locked choice instead of
   * offering an edit the API would reject.
   */
  lockedBranchId: string | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (draft: CourierDraft) => void;
}

/**
 * "Yeni kurye" — one form for the three things that must be decided together:
 * who the courier is, how they sign in, and which branches they belong to.
 * The server creates all three in a single transaction, so this dialog never
 * offers a partial state. The parent mounts it only while open, which is what
 * gives each visit a clean draft.
 */
export function CourierCreateDialog({
  branches,
  lockedBranchId,
  busy,
  onClose,
  onSubmit,
}: CourierCreateDialogProps) {
  const [draft, setDraft] = useState<CourierDraft>(EMPTY_COURIER_DRAFT);
  const [error, setError] = useState<string | null>(null);

  const lockedBranch = lockedBranchId
    ? branches.find((branch) => branch.id === lockedBranchId)
    : undefined;
  const selectableBranches = lockedBranchId
    ? branches.filter((branch) => branch.id === lockedBranchId)
    : branches;
  const effectiveBranchIds = lockedBranchId ? [lockedBranchId] : draft.branchIds;
  const passwordState = passwordPolicyState(draft.password);
  const loginHint = usernameHint(draft.username);
  const passwordsDiffer =
    draft.passwordConfirmation.length > 0 && draft.password !== draft.passwordConfirmation;

  function update<K extends keyof CourierDraft>(key: K, value: CourierDraft[K]): void {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function submit(): void {
    const complete = lockedBranchId ? { ...draft, branchIds: [lockedBranchId] } : draft;
    const message = validateCourierDraft(complete);
    if (message) {
      setError(message);
      return;
    }
    onSubmit(complete);
  }

  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onMouseDown={() => {
        if (!busy) onClose();
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="courier-create-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.kicker}>FİLOYA EKLE</span>
            <h2 id="courier-create-title">Yeni kurye hesabı</h2>
            <p>Profil, giriş bilgileri ve şube ataması tek işlemde kaydedilir.</p>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Pencereyi kapat"
            onClick={onClose}
            disabled={busy}
          >
            <OpsIcon name="close" />
          </button>
        </header>

        <div className={styles.modalBody}>
          <fieldset className={styles.formGroup} disabled={busy}>
            <legend className={styles.formGroupTitle}>Kurye bilgileri</legend>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="courier-display-name">
                  Ad soyad
                </label>
                <input
                  id="courier-display-name"
                  className={styles.input}
                  value={draft.displayName}
                  onChange={(event) => update('displayName', event.target.value)}
                  placeholder="Örn. Deniz Yılmaz"
                  autoComplete="off"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="courier-phone">
                  Telefon
                </label>
                <input
                  id="courier-phone"
                  className={styles.input}
                  value={draft.phone}
                  onChange={(event) => update('phone', event.target.value)}
                  placeholder="05xx xxx xx xx"
                  inputMode="tel"
                  autoComplete="off"
                />
              </div>
              <div className={`${styles.field} ${styles.fieldNarrow}`}>
                <label className={styles.fieldLabel} htmlFor="courier-capacity">
                  Azami aktif görev
                </label>
                <input
                  id="courier-capacity"
                  className={styles.input}
                  value={draft.maxActiveDeliveries}
                  onChange={(event) => update('maxActiveDeliveries', event.target.value)}
                  inputMode="numeric"
                  aria-describedby="courier-capacity-hint"
                />
                <span className={styles.fieldHint} id="courier-capacity-hint">
                  1–{MAX_COURIER_CAPACITY} teslimat
                </span>
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.formGroup} disabled={busy}>
            <legend className={styles.formGroupTitle}>Giriş bilgileri</legend>
            <p className={styles.formGroupHint}>
              Kurye bu kullanıcı adı ve şifreyle kurye uygulamasına giriş yapar.
            </p>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="courier-username">
                  Kullanıcı adı
                </label>
                <input
                  id="courier-username"
                  className={`${styles.input} ${styles.inputMono}`}
                  value={draft.username}
                  onChange={(event) => update('username', event.target.value)}
                  placeholder="deniz.y"
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby={loginHint ? 'courier-username-hint' : undefined}
                />
                {loginHint ? (
                  <span className={styles.fieldHint} id="courier-username-hint">
                    {loginHint}
                  </span>
                ) : null}
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="courier-password">
                  Şifre
                </label>
                <input
                  id="courier-password"
                  className={styles.input}
                  type="password"
                  value={draft.password}
                  onChange={(event) => update('password', event.target.value)}
                  autoComplete="new-password"
                  aria-describedby="courier-password-hint"
                />
                <span
                  className={passwordState.met ? styles.fieldHintOk : styles.fieldHint}
                  id="courier-password-hint"
                >
                  {passwordState.met
                    ? 'Uzunluk kuralı karşılandı.'
                    : `En az 12 karakter · ${passwordState.remaining} karakter eksik`}
                </span>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="courier-password-confirm">
                  Şifre tekrar
                </label>
                <input
                  id="courier-password-confirm"
                  className={styles.input}
                  type="password"
                  value={draft.passwordConfirmation}
                  onChange={(event) => update('passwordConfirmation', event.target.value)}
                  autoComplete="new-password"
                  aria-describedby={passwordsDiffer ? 'courier-password-confirm-hint' : undefined}
                />
                {passwordsDiffer ? (
                  <span className={styles.fieldHint} id="courier-password-confirm-hint">
                    Şifreler aynı değil.
                  </span>
                ) : null}
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.formGroup} disabled={busy}>
            <legend className={styles.formGroupTitle}>Şube ataması</legend>
            <p className={styles.formGroupHint}>
              {lockedBranchId
                ? 'Kurye, şubeye bağlı personelin kendi şubesine atanır.'
                : 'Kurye hangi şubelerde görev alacak? Birden fazla şube seçilebilir.'}
            </p>
            <div className={styles.branchChoices} role="group" aria-label="Şube seçimi">
              {selectableBranches.length === 0 ? (
                <p className={styles.branchChoiceEmpty}>Atanabilir şube bulunamadı.</p>
              ) : (
                selectableBranches.map((branch) => {
                  const checked = effectiveBranchIds.includes(branch.id);
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
                        disabled={Boolean(lockedBranchId)}
                        onChange={() =>
                          update('branchIds', toggleDraftBranch(draft.branchIds, branch.id))
                        }
                      />
                      <span>{branch.name}</span>
                      {checked ? <OpsIcon name="check" /> : null}
                    </label>
                  );
                })
              )}
            </div>
            {lockedBranch ? (
              <p className={styles.formNote}>
                <OpsIcon name="lock" /> {lockedBranch.name} şubesi atandı.
              </p>
            ) : (
              <p className={styles.formNote}>
                <OpsIcon name="info" /> Seçilen şube sayısı: {effectiveBranchIds.length}
              </p>
            )}
          </fieldset>

          {error ? (
            <p className={styles.formError} role="alert">
              <OpsIcon name="error" /> {error}
            </p>
          ) : null}
        </div>

        <footer className={styles.modalFooter}>
          <button type="button" className={styles.cancelButton} onClick={onClose} disabled={busy}>
            Vazgeç
          </button>
          <ActionButton variant="primary" disabled={busy} onClick={submit}>
            {busy ? 'Kaydediliyor' : 'Kuryeyi oluştur'}
          </ActionButton>
        </footer>
      </section>
    </div>
  );
}
