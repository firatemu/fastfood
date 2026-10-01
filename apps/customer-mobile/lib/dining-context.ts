import type { KvStore } from './kv';
import { diningTableSchema, type DiningTable } from './schemas';

const TABLE_KEY = 'ff_dining_table';

let memory: DiningTable | null = null;
let store: KvStore | null = null;

export function configureDiningStore(kv: KvStore | null): void {
  store = kv;
}

export function readDiningContext(): DiningTable | null {
  return memory;
}

export async function restoreDiningContext(): Promise<DiningTable | null> {
  if (!store) return memory;
  try {
    const raw = await store.getItem(TABLE_KEY);
    memory = raw ? diningTableSchema.parse(JSON.parse(raw)) : null;
  } catch {
    memory = null;
  }
  return memory;
}

export async function writeDiningContext(table: DiningTable): Promise<void> {
  memory = table;
  await store?.setItem(TABLE_KEY, JSON.stringify(table));
}

export async function clearDiningContext(): Promise<void> {
  memory = null;
  await store?.removeItem(TABLE_KEY);
}

export function resetDiningContextForTests(): void {
  memory = null;
  store = null;
}
