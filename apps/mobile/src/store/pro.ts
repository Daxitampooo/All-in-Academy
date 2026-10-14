/**
 * Whether the player has Pro. There is no subscription yet: it comes with the server, where Google Play
 * purchases are checked. Until then nobody has Pro, and Pro items can only be tried on.
 *
 * The owner's web preview is built with EXPO_PUBLIC_PREVIEW_PRO=1, so Pro lessons and items can be checked
 * there. APK and store builds never set it.
 */
const PREVIEW_PRO = process.env.EXPO_PUBLIC_PREVIEW_PRO === '1';

export function usePro(): boolean {
  return PREVIEW_PRO;
}
