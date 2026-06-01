import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['app/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'cobertura'],
      reportsDirectory: './coverage',
      // Scope coverage to the framework-agnostic logic and presentational
      // units that are meaningfully unit-testable. Stateful view/detail/
      // settings components are exercised by integration/e2e instead.
      include: [
        'app/_lib/**/*.ts',
        'app/_data/constants.ts',
        'app/_hooks/useIsMobile.ts',
        'app/_hooks/useDismissable.ts',
        'app/_components/atoms/**/*.tsx',
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 75,
        statements: 75,
      },
    },
  },
});
