import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ManifestSchema, type Manifest } from './schema.js';

/**
 * Load a synthetic work-item manifest from disk.
 * Manifests live under `.fastfood-controller/manifests/<id>.json` (version-controlled).
 */
export async function loadManifest(manifestsDir: string, id: string): Promise<Manifest | null> {
  const p = path.join(manifestsDir, `${id}.json`);
  try {
    const raw = await readFile(p, 'utf8');
    const parsed = ManifestSchema.parse(JSON.parse(raw));
    return parsed;
  } catch {
    return null;
  }
}
