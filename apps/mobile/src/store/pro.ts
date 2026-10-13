/**
 * Whether the player has Pro. There is no subscription yet: it arrives with the server (stage 7), where
 * Google Play purchases are checked. Until then nobody has Pro, and Pro items can only be tried on.
 */
export function usePro(): boolean {
  return false;
}
