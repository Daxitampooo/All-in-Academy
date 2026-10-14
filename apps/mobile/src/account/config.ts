/**
 * Server address, set when the app is built (EXPO_PUBLIC_API_URL, e.g. https://api.pokerall.app).
 * Null until the server runs on hosting: accounts are then off and the account screen says so.
 */
export const API_URL: string | null = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '') || null;
