// Vite's file globbing, used by the tests to list content folders.
interface ImportMeta {
  glob(pattern: string): Record<string, () => Promise<unknown>>;
}
