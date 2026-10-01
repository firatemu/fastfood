/**
 * Column visibility preferences for the orders datagrid. Backed by
 * `localStorage` so operators keep their chosen column set across
 * browser sessions.
 */

const STORAGE_KEY = 'orders:columns:v2';

/**
 * Canonical column identifiers used in the datagrid. Adding a new
 * column means adding an entry here and to the menu's checkbox list.
 */
export type ColumnId =
  | 'orderNo'
  | 'status'
  | 'mode'
  | 'customer'
  | 'items'
  | 'amount'
  | 'elapsed'
  | 'receipt';

export interface ColumnMeta {
  id: ColumnId;
  label: string;
  description: string;
  defaultVisible: boolean;
  locked?: boolean;
}

export const COLUMNS: readonly ColumnMeta[] = [
  {
    id: 'orderNo',
    label: 'Sipariş No',
    description: 'Sipariş numarası.',
    defaultVisible: true,
    locked: true,
  },
  {
    id: 'status',
    label: 'Durum',
    description: 'FSM durumu; satır içi işlemler menüsü ile yönetilir.',
    defaultVisible: true,
  },
  {
    id: 'mode',
    label: 'Kanal',
    description: 'Teslimat veya gel-al modu.',
    defaultVisible: false,
  },
  {
    id: 'customer',
    label: 'Müşteri',
    description: 'Müşteri adı soyadı.',
    defaultVisible: true,
  },
  {
    id: 'items',
    label: 'Kalem',
    description: 'Sipariş kalemi adedi.',
    defaultVisible: true,
  },
  {
    id: 'amount',
    label: 'Tutar',
    description: 'Ödenecek nihai tutar (kuruş → TRY).',
    defaultVisible: true,
  },
  {
    id: 'elapsed',
    label: 'Sipariş yaşı',
    description: 'Oluşturulma zamanından itibaren geçen süre. Tamamlanan siparişlerde sabitlenir.',
    defaultVisible: true,
  },
  {
    id: 'receipt',
    label: 'İşlemler',
    description:
      'Satır içi işlemler menüsü: durum geçişi, fiş yazdırma, süreç geçmişi, sipariş detayı.',
    defaultVisible: true,
    locked: true,
  },
];

export type ColumnVisibility = Record<ColumnId, boolean>;

export function defaultVisibility(): ColumnVisibility {
  const out: Partial<ColumnVisibility> = {};
  for (const col of COLUMNS) {
    out[col.id] = col.defaultVisible;
  }
  return out as ColumnVisibility;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isColumnId(value: unknown): value is ColumnId {
  return typeof value === 'string' && COLUMNS.some((col) => col.id === value);
}

export function loadVisibility(): ColumnVisibility {
  if (typeof window === 'undefined') {
    return defaultVisibility();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultVisibility();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return defaultVisibility();
    const merged = defaultVisibility();
    for (const [k, v] of Object.entries(parsed)) {
      if (isColumnId(k) && typeof v === 'boolean') merged[k] = v;
    }
    return merged;
  } catch {
    return defaultVisibility();
  }
}

export function saveVisibility(visibility: ColumnVisibility): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    // Storage quota or privacy mode — silently drop.
  }
}

export function toggleVisibility(visibility: ColumnVisibility, id: ColumnId): ColumnVisibility {
  const col = COLUMNS.find((c) => c.id === id);
  if (col?.locked) return visibility;
  return { ...visibility, [id]: !visibility[id] };
}

export function visibleColumnIds(visibility: ColumnVisibility): readonly ColumnId[] {
  return COLUMNS.filter((col) => col.locked || visibility[col.id]).map((col) => col.id);
}
