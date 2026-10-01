#!/usr/bin/env node
/**
 * Local development JWT signing-key generator.
 *
 * The API signs staff/courier access tokens with RS256 and reads the key pair
 * from disk (document 32 §5). `apps/api/secrets/` is intentionally git-ignored:
 * a private signing key must never enter source control (AGENTS.md §8).
 *
 * This script produces a throwaway 2048-bit RSA key pair for local development
 * and automated tests only. It is not a production key-management tool and it
 * never talks to a network service.
 *
 * Usage:
 *   pnpm keys:dev            # write apps/api/secrets/dev/jwt-{private,public}.pem
 *   pnpm keys:dev --force    # overwrite an existing key pair
 *
 * Overwriting invalidates every already-issued access token, because the public
 * key used for verification changes with it.
 */
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

const force = process.argv.includes('--force');
const root = process.cwd();

/** Resolve a key path the same way `staff-access-token.ts` does. */
function resolveKey(path) {
  return isAbsolute(path) ? path : resolve(root, path);
}

function readKeyPath(envName, fallback) {
  const raw = process.env[envName];
  return resolveKey(raw && raw.trim() !== '' ? raw : fallback);
}

// Defaults mirror `.env.example`; exported env wins so a custom dev layout
// does not need to edit this script.
const privateKeyPath = readKeyPath('JWT_PRIVATE_KEY_PATH', './secrets/dev/jwt-private.pem');
const publicKeyPath = readKeyPath('JWT_PUBLIC_KEY_PATH', './secrets/dev/jwt-public.pem');

if (!force && (existsSync(privateKeyPath) || existsSync(publicKeyPath))) {
  console.error(
    `Refusing to overwrite an existing key pair:\n  private: ${privateKeyPath}\n  public:  ${publicKeyPath}\n` +
      'Re-run with --force if you intend to invalidate current access tokens.',
  );
  process.exit(1);
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

for (const path of [privateKeyPath, publicKeyPath]) {
  mkdirSync(dirname(path), { recursive: true });
}

writeFileSync(privateKeyPath, privateKey, { encoding: 'utf8', mode: 0o600 });
writeFileSync(publicKeyPath, publicKey, { encoding: 'utf8', mode: 0o644 });

console.log(`Development JWT key pair written.`);
console.log(`  private: ${privateKeyPath} (mode 0600, never commit)`);
console.log(`  public:  ${publicKeyPath}`);
console.log('Existing access tokens are invalidated if you overwrote the previous pair.');
