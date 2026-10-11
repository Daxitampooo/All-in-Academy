import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Simulation and fuzz tests are heavy; CI machines and parallel runs can be slow.
    testTimeout: 60_000,
  },
});
