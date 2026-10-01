import type { CustomerProfile } from './schemas';

export type ProfileForm = {
  displayName: string;
  email: string;
  locale: string;
};

export function profileToForm(profile: CustomerProfile): ProfileForm {
  return {
    displayName: profile.displayName ?? '',
    email: profile.email ?? '',
    locale: profile.locale ?? 'tr-TR',
  };
}

export type ProfilePatchResult =
  | { ok: true; patch: { displayName?: string; email?: string; locale?: string } }
  | { ok: false; message: string };

export function profileFormToPatch(form: ProfileForm, original: CustomerProfile): ProfilePatchResult {
  const displayName = form.displayName.trim();
  const email = form.email.trim();
  const locale = form.locale.trim();
  if (displayName.length > 120) return { ok: false, message: 'İsim en fazla 120 karakter olabilir.' };
  if (email.length > 0 && !email.includes('@')) return { ok: false, message: 'Geçerli bir e-posta girin.' };
  const patch: { displayName?: string; email?: string; locale?: string } = {};
  if (displayName !== (original.displayName ?? '')) {
    if (displayName.length < 1) return { ok: false, message: 'İsim boş olamaz.' };
    patch.displayName = displayName;
  }
  if (email !== (original.email ?? '') && email.length > 0) {
    patch.email = email;
  }
  if (locale.length >= 2 && locale !== (original.locale ?? '')) {
    patch.locale = locale;
  }
  if (Object.keys(patch).length === 0) return { ok: false, message: 'Değişiklik yok.' };
  return { ok: true, patch };
}
