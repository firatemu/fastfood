export type OAuthProviderCode = 'google' | 'apple';

export type OAuthReadiness =
  | 'OPERATIONAL'
  | 'CONFIG_READY_BUT_CREDENTIALS_MISSING'
  | 'MOBILE_NATIVE_CONFIG_REQUIRED'
  | 'EXTERNAL_PROVIDER_BLOCKED';

/**
 * Mobile OAuth cannot complete today: API callbacks redirect to the Storefront
 * web origin, not `fastfoodcustomer://`. Credentials in env would still need a
 * native redirect URI + provider SDK/capability.
 */
export function classifyOAuthProvider(input: {
  configured: boolean;
  platform: 'android' | 'ios';
  provider: OAuthProviderCode;
}): OAuthReadiness {
  if (!input.configured) return 'CONFIG_READY_BUT_CREDENTIALS_MISSING';
  if (input.provider === 'apple' && input.platform === 'android') {
    return 'MOBILE_NATIVE_CONFIG_REQUIRED';
  }
  return 'MOBILE_NATIVE_CONFIG_REQUIRED';
}

export function oauthUnavailableCopy(readiness: OAuthReadiness, provider: OAuthProviderCode): string {
  const name = provider === 'google' ? 'Google' : 'Apple';
  if (readiness === 'CONFIG_READY_BUT_CREDENTIALS_MISSING') {
    return `${name} girişi henüz yapılandırılmadı.`;
  }
  if (readiness === 'MOBILE_NATIVE_CONFIG_REQUIRED') {
    return `${name} girişi mobil yönlendirme olmadan tamamlanamaz.`;
  }
  if (readiness === 'EXTERNAL_PROVIDER_BLOCKED') {
    return `${name} girişi şu an kullanılamıyor.`;
  }
  return `${name} ile devam`;
}
