export const HOME_SLIDE_SETTINGS_KEY = 'storefront.home_slides';
export const MIN_HOME_SLIDE_DURATION_SECONDS = 2;
export const MAX_HOME_SLIDE_DURATION_SECONDS = 30;

export interface HomeSlideSettings {
  transitionDurationSeconds: number;
  loop: boolean;
}

export const DEFAULT_HOME_SLIDE_SETTINGS: HomeSlideSettings = {
  transitionDurationSeconds: 5,
  loop: true,
};

export function parseHomeSlideSettings(value: unknown): HomeSlideSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_HOME_SLIDE_SETTINGS };
  }
  const record = value as Record<string, unknown>;
  const duration = record['transitionDurationSeconds'];
  const loop = record['loop'];
  return {
    transitionDurationSeconds:
      typeof duration === 'number' &&
      Number.isInteger(duration) &&
      duration >= MIN_HOME_SLIDE_DURATION_SECONDS &&
      duration <= MAX_HOME_SLIDE_DURATION_SECONDS
        ? duration
        : DEFAULT_HOME_SLIDE_SETTINGS.transitionDurationSeconds,
    loop: typeof loop === 'boolean' ? loop : DEFAULT_HOME_SLIDE_SETTINGS.loop,
  };
}
