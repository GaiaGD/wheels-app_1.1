import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// vitest globals are off, so RTL does not auto-register cleanup
afterEach(() => cleanup())
