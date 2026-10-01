export type AdminColorMode = 'dark' | 'light';

export const ADMIN_COLOR_MODE_KEY = 'fastfood-admin-color-mode';
const ADMIN_COLOR_MODE_EVENT = 'fastfood-admin-color-mode-change';

function isColorMode(value: string | null | undefined): value is AdminColorMode {
  return value === 'dark' || value === 'light';
}

export function getAdminColorModeSnapshot(): AdminColorMode {
  return document.documentElement.dataset.colorMode === 'light' ? 'light' : 'dark';
}

export function subscribeAdminColorMode(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== ADMIN_COLOR_MODE_KEY) return;
    applyAdminColorMode(isColorMode(event.newValue) ? event.newValue : 'dark');
    onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(ADMIN_COLOR_MODE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(ADMIN_COLOR_MODE_EVENT, onChange);
  };
}

function applyAdminColorMode(mode: AdminColorMode) {
  document.documentElement.dataset.colorMode = mode;
  document.documentElement.style.colorScheme = mode;
}

export function setAdminColorMode(mode: AdminColorMode) {
  applyAdminColorMode(mode);
  try {
    window.localStorage.setItem(ADMIN_COLOR_MODE_KEY, mode);
  } catch {
    // The current page still changes theme when persistent storage is unavailable.
  }
  window.dispatchEvent(new Event(ADMIN_COLOR_MODE_EVENT));
}
