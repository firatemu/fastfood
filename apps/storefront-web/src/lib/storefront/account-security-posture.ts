/**
 * Security posture for the account security screen.
 *
 * Kept as a pure function so the derived state is unit-testable and, more
 * importantly, so the page cannot drift into inventing a reassuring headline
 * that the linked-identity payload does not actually support. Every rule here
 * maps to a field the API really returns.
 */

export type SecurityLevel = 'strong' | 'fair' | 'weak';

export type SecurityCheckId = 'password' | 'email' | 'phone';

export type SecurityCheck = {
  id: SecurityCheckId;
  label: string;
  satisfied: boolean;
  /** Honest copy: what the customer can do, never a capability we lack. */
  hint: string;
  /** Shown when the check passes, so the row is still informative. */
  doneHint: string;
};

export type SecurityPosture = {
  level: SecurityLevel;
  /** 0..3 — how many required checks are satisfied. */
  score: number;
  total: number;
  headline: string;
  summary: string;
  checks: SecurityCheck[];
};

export function securityPosture(input: {
  hasPassword: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
}): SecurityPosture {
  const checks: SecurityCheck[] = [
    {
      id: 'password',
      label: 'Parola',
      satisfied: input.hasPassword,
      hint: 'Oturum açmak için bir parola belirle.',
      doneHint: 'Parolan tanımlı.',
    },
    {
      id: 'email',
      label: 'E-posta doğrulaması',
      satisfied: input.emailVerified,
      hint: 'Doğrulama bağlantısı gönder.',
      doneHint: 'E-posta adresin doğrulandı.',
    },
    {
      id: 'phone',
      label: 'Telefon doğrulaması',
      satisfied: input.phoneVerified,
      hint: 'Telefonuna OTP gönder.',
      doneHint: 'Telefonun doğrulandı.',
    },
  ];

  const score = checks.filter((check) => check.satisfied).length;
  const total = checks.length;

  const level: SecurityLevel = score === total ? 'strong' : score >= total - 1 ? 'fair' : 'weak';

  const headline =
    level === 'strong' ? 'Hesabın güçlü korunuyor' : level === 'fair' ? 'Bir adım kaldı' : 'Hesabın korunmaya muhtaç';

  const remaining = total - score;
  const summary =
    remaining === 0
      ? 'Parola ve iki doğrulama kanıtın yerinde.'
      : `${remaining} ${remaining === 1 ? 'adım' : 'adım'} tamamlanmadı.`;

  return { level, score, total, headline, summary, checks };
}