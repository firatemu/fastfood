export const BRANCH_STORAGE_KEY = 'ff_admin_branch_id';

export type BranchOption = { id: string; name: string; code?: string; status?: string };

export function resolveBranchId(
  stored: string | null | undefined,
  branches: BranchOption[],
  fallback: string,
): string {
  if (stored && branches.some((b) => b.id === stored)) return stored;
  if (branches.some((b) => b.id === fallback)) return fallback;
  return branches[0]?.id ?? fallback;
}
