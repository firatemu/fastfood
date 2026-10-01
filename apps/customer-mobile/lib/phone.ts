const E164 = /^\+\d{10,15}$/;

export function normalizePhoneInput(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) return trimmed.replace(/\s+/g, '');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('0')) return `+9${digits}`;
  if (digits.startsWith('5')) return `+90${digits}`;
  return trimmed;
}

export function isE164Phone(raw: string): boolean {
  return E164.test(raw);
}

export function looksLikeEmail(raw: string): boolean {
  return raw.includes('@');
}

export function looksLikePhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 && !raw.includes('@');
}
