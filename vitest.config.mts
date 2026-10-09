import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    // Stand-in for @svgr/webpack: svg imports become an empty <svg> component.
    {
      name: 'svg-component-stub',
      enforce: 'pre',
      transform: (_code, id) =>
        id.endsWith('.svg')
          ? "import { createElement } from 'react'; export default (props) => createElement('svg', props)"
          : null,
    },
  ],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'server-only': path.resolve(__dirname, 'tests/stubs/server-only.ts'),
    },
  },
})
