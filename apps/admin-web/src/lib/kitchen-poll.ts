export const KITCHEN_POLL_MS = 8000;

export function shouldRunKitchenPoll(documentHidden: boolean): boolean {
  return !documentHidden;
}
