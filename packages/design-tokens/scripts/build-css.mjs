// Standalone CSS generator. Keeps the committed web.css in sync with the TS source.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
mkdirSync(distDir, { recursive: true });

// Use the published dist copy to avoid TS source compilation during this script.
const { buildAllThemesCss } = await import('../dist/web.js');
const css = buildAllThemesCss();
writeFileSync(join(distDir, 'web.css'), css);
console.log(`Wrote ${join(distDir, 'web.css')} (${css.length} bytes)`);
