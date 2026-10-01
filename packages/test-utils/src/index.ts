/**
 * Shared testing utilities placeholder. Phase 0 keeps the package minimal;
 * domain factories and database reset helpers are added in the phases that
 * introduce the corresponding domains.
 */
export const TEST_DB_NAME_DEFAULT = 'fastfood_test';

export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test';
}
