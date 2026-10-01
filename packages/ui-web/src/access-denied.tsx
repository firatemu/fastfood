import type { ReactNode } from 'react';

import './styles.css';
import { Button } from './button.js';

export type AccessDeniedKind = 'permission' | 'not_found' | 'auth_required';

export interface AccessDeniedProps {
  kind?: AccessDeniedKind;
  title?: string;
  description?: string;
  /** Required permission code shown for permission-denied (presentation only). */
  permissionCode?: string;
  action?: ReactNode;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
}

const DEFAULTS: Record<AccessDeniedKind, { title: string; description: string }> = {
  permission: {
    title: 'Bu sayfaya erişim izniniz yok',
    description: 'Gerekli yetkiye sahip değilsiniz. Yöneticinize başvurun.',
  },
  not_found: {
    title: 'Kaynak bulunamadı',
    description: 'İstenen kayıt mevcut değil veya silinmiş olabilir.',
  },
  auth_required: {
    title: 'Oturum gerekli',
    description: 'Bu içeriği görüntülemek için giriş yapmalısınız.',
  },
};

/**
 * AccessDenied — canonical authorization / resource-unavailable state for Admin.
 * Presentation only; callers decide navigation.
 */
export function AccessDenied(props: AccessDeniedProps) {
  const {
    kind = 'permission',
    title,
    description,
    permissionCode,
    action,
    onPrimaryAction,
    primaryActionLabel,
  } = props;
  const defaults = DEFAULTS[kind];
  const resolvedTitle = title ?? defaults.title;
  const resolvedDescription = description ?? defaults.description;
  const defaultLabel =
    kind === 'auth_required'
      ? 'Giriş yap'
      : kind === 'not_found'
        ? 'Listeye dön'
        : 'Genel bakışa dön';

  return (
    <div
      role="alert"
      className={`ff-access-denied ff-access-denied--${kind}`}
      data-testid={`access-denied-${kind}`}
    >
      <p className="ff-access-denied__eyebrow">
        {kind === 'permission'
          ? 'Yetki gerekli'
          : kind === 'not_found'
            ? 'Bulunamadı'
            : 'Kimlik doğrulama'}
      </p>
      <h3 className="ff-access-denied__title">{resolvedTitle}</h3>
      <p className="ff-access-denied__desc">{resolvedDescription}</p>
      {permissionCode && kind === 'permission' ? (
        <p className="ff-access-denied__code">
          Gerekli izin: <code>{permissionCode}</code>
        </p>
      ) : null}
      {action ? (
        <div className="ff-access-denied__action">{action}</div>
      ) : onPrimaryAction ? (
        <div className="ff-access-denied__action">
          <Button size="sm" variant="secondary" onClick={onPrimaryAction}>
            {primaryActionLabel ?? defaultLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
