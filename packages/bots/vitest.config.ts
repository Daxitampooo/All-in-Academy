import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Simulation and fuzz tests are heavy; CI machines and parallel runs can be slow.
    testTimeout: 60_000,
    // `CALIBRATE=1 pnpm vitest run` runs the long bot-strength calibration instead of the tests.
    include: process.env.CALIBRATE ? ['calibration/**/*.ts'] : ['test/**/*.test.ts'],
  },
});
