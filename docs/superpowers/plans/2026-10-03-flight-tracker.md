# Wheels App 1.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild wheels-app as a Next.js (App Router, TypeScript) flight tracker with server-side API keys, typed error handling on every provider call, shareable flight pages for all flight states, and two search entry points (route, flight number).

**Architecture:** Server components call a validated provider layer (`src/lib/providers/*`) that returns `Result<T>` (data or typed error) and never throws into the UI. The flight page awaits the core flight data; weather and photos stream in separately with Suspense so each can fail alone. A `USE_MOCK_DATA` mode serves fixtures for every flight state and error kind.

**Tech Stack:** Next.js (App Router), React 18+, TypeScript, zod, CSS Modules, Vitest + Testing Library, Playwright (one smoke test), Vercel.

Spec: `docs/superpowers/specs/2026-10-03-flight-tracker-design.md`

## Global Constraints

- App Router, TypeScript, React 18+. In Next 15+ `params` and `searchParams` in pages are Promises: always `await` them.
- API keys are server-only env vars with NO `NEXT_PUBLIC_` prefix: `AIRLABS_API_KEY`, `RAPIDAPI_KEY`, `OPENWEATHER_API_KEY`, `UNSPLASH_ACCESS_KEY`. Optional: `USE_MOCK_DATA`.
- Every file in `src/lib/providers/` and `src/lib/http.ts` and `src/lib/env.ts` starts with `import 'server-only'`.
- Provider calls return `Result<T>`; error kinds are exactly: `bad_input`, `not_found`, `rate_limited`, `provider_down`, `bad_data`, `misconfigured`.
- HTTP calls: timeout 8000 ms, one retry only for `provider_down`. Logs contain error kind, provider and status only: never API keys or full request URLs.
- No `alert()` anywhere. Clickable things are real `<button>`/`<a>`. Inputs have labels. Plane animation respects `prefers-reduced-motion`.
- Look: Work Sans; text `#231f20`; page background `#d9d9d9`; cards `#ffffff`; unavailable values `#c9c9c9`; buttons background `#231f20` with text `#d9d9d9`; card radius 20px.
- Never show a guessed flight: if no AeroDataBox entry matches the requested airports/date, show the "couldn't confirm this flight" state.
- Commit messages end with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (shown in each commit command below). Do not push; the owner pushes.

## File Structure

```
package.json, tsconfig.json, next.config.ts      (from create-next-app)
vitest.config.ts, vitest.setup.ts, tests/stubs/server-only.ts
playwright.config.ts, e2e/smoke.spec.ts
.env.example, README.md
scripts/build-data.mjs                           one-off data normalizer
public/                                          logo, plane icon, logotype, go-back svg, gif
src/
  app/
    layout.tsx, globals.css, page.tsx
    error.tsx, global-error.tsx, not-found.tsx
    search/page.tsx
    flight/[flightIata]/page.tsx
    api/airports/route.ts, api/airlines/route.ts
  lib/
    result.ts, http.ts, env.ts, validate.ts, messages.ts, autocomplete.ts
    flight/types.ts, time.ts, status.ts, progress.ts, match.ts
    providers/aerodatabox.ts, airlabs.ts, weather.ts, photos.ts
    mocks/index.ts
  data/airports.json, airlines.json
  components/
    StatusBanner/, AirportCard/, FlightPath/, FlightView/, ErrorState/,
    Unavailable/, AirportPhoto/, WeatherCard/, SearchForm/, AutocompleteField/, FlightList/
```

Each component folder holds `Name.tsx`, `Name.module.css` and (where listed) `Name.test.tsx`.

---

### Task 1: Scaffold, tooling, assets, tokens

**Files:**
- Create: everything from `create-next-app`, plus `vitest.config.ts`, `vitest.setup.ts`, `tests/stubs/server-only.ts`, `.env.example`, `public/*` assets
- Modify: `package.json` (scripts), `src/app/layout.tsx`, `src/app/globals.css`, `.gitignore`

**Interfaces:**
- Produces: `npm test` (Vitest), `npm run dev`, `npm run build`; CSS variables `--ink`, `--bg`, `--card`, `--muted`, `--radius` in `globals.css`; alias `@/` → `src/`.

- [ ] **Step 1: Scaffold Next.js into the existing folder**

Run from `/Users/gaiadigregorio/Documents/Flight-tracker-26`:

```bash
npx create-next-app@latest . --ts --app --src-dir --eslint --no-tailwind --import-alias "@/*" --use-npm --yes
```

If it refuses because the folder is not empty, run it in a temp folder (`npx create-next-app@latest ../ft-tmp ...same flags`) and move its contents here (excluding `.git`), keeping our `docs/` folder.
Expected: `package.json`, `src/app/page.tsx`, `next.config.ts` exist.

- [ ] **Step 2: Install dependencies**

```bash
npm install zod server-only
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
```

- [ ] **Step 3: Vitest config and setup**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
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
```

`vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

`tests/stubs/server-only.ts`:

```ts
export {}
```

In `package.json` add to `scripts`: `"test": "vitest run"`, `"test:watch": "vitest"`, `"e2e": "playwright test"`.

- [ ] **Step 4: Copy the old assets**

```bash
git clone --depth 1 https://github.com/GaiaGD/wheels-app "$TMPDIR/wheels-old"
cp "$TMPDIR/wheels-old/public/"{wheels-app-logo.gif,plane-icon.svg,wa-logotype.svg,wa-logo.svg,go-back.svg} public/
ls public
```

Expected: the five files listed alongside Next's default svgs (delete the default `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg` if present).

- [ ] **Step 5: Env example and gitignore**

`.env.example`:

```
# Server-only keys. Copy to .env.local and fill in. Never prefix with NEXT_PUBLIC_.
AIRLABS_API_KEY=
RAPIDAPI_KEY=
OPENWEATHER_API_KEY=
UNSPLASH_ACCESS_KEY=
# Set to true to serve fixture data (no API calls, no quota used)
USE_MOCK_DATA=true
```

Ensure `.gitignore` contains these lines (add any missing): `.env*` with `!.env.example`, `/test-results`, `/playwright-report`.

Run: `git check-ignore .env.local && echo ignored`
Expected: `.env.local` then `ignored`.

- [ ] **Step 6: Tokens and font**

`src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Work_Sans } from 'next/font/google'
import './globals.css'

const workSans = Work_Sans({ subsets: ['latin'], variable: '--font-work-sans' })

export const metadata: Metadata = {
  title: 'Wheels App',
  description: 'Look up any flight: live, upcoming or landed.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={workSans.variable}>
      <body>{children}</body>
    </html>
  )
}
```

`src/app/globals.css` (replace contents):

```css
:root {
  --ink: #231f20;
  --bg: #d9d9d9;
  --card: #ffffff;
  --muted: #c9c9c9;
  --radius: 20px;
  --shadow: 0 5px 12px 0 #9393937a, 0 2px 10px 0 #7370712e;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -webkit-text-size-adjust: 100%;
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: var(--font-work-sans), sans-serif;
  font-weight: 400;
  font-size: 12px;
  color: var(--ink);
  background-color: var(--bg);
}

a { color: inherit; text-decoration: none; }
img { max-width: 100%; max-height: 100%; }
h1, h2, h3, h4 { font-weight: 400; margin: 0; }

:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

.button {
  display: inline-block;
  border: 0;
  cursor: pointer;
  font: inherit;
  font-size: 15px;
  padding: 14px 28px;
  border-radius: var(--radius);
  background: var(--ink);
  color: var(--bg);
  box-shadow: 0 5px 12px 0 #231f207a, 0 15px 10px 0 #231f202e;
  text-align: center;
}
```

Replace `src/app/page.tsx` with a stub so the build passes:

```tsx
export default function Home() {
  return <main>Wheels App</main>
}
```

- [ ] **Step 7: Verify and commit**

```bash
npm test -- --passWithNoTests && npm run build
```

Expected: tests pass (none found), build succeeds.

```bash
git add -A
git commit -m "chore: scaffold Next.js app with vitest, tokens and assets" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Result type, env helpers and the HTTP wrapper

**Files:**
- Create: `src/lib/result.ts`, `src/lib/env.ts`, `src/lib/http.ts`
- Test: `src/lib/http.test.ts`

**Interfaces:**
- Produces:
  - `type ErrorKind = 'bad_input' | 'not_found' | 'rate_limited' | 'provider_down' | 'bad_data' | 'misconfigured'`
  - `interface ProviderError { kind: ErrorKind; provider: string; message: string; status?: number }`
  - `type Result<T> = { ok: true; data: T } | { ok: false; error: ProviderError }`
  - `ok<T>(data: T): Result<T>`; `fail(kind, provider, message, status?): Result<never>`
  - `isMockMode(): boolean`; `requireKey(name: string, provider: string): Result<string>`
  - `fetchJson<T>(opts: { provider: string; url: string; init?: RequestInit; schema: ZodType<T>; timeoutMs?: number; retries?: number; revalidate?: number }): Promise<Result<T>>`

- [ ] **Step 1: Write the failing tests**

`src/lib/http.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { fetchJson } from './http'

const schema = z.object({ a: z.number() })
const base = { provider: 'test', url: 'https://example.test/x?api_key=SECRET', schema }
const reply = (body: string | null, status = 200) => () =>
  Promise.resolve(new Response(body, { status }))

let errorSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchJson', () => {
  it('returns parsed data on success', async () => {
    vi.stubGlobal('fetch', vi.fn(reply('{"a":1}')))
    expect(await fetchJson(base)).toEqual({ ok: true, data: { a: 1 } })
  })

  it.each([
    [404, 'not_found'],
    [204, 'not_found'],
    [429, 'rate_limited'],
    [401, 'misconfigured'],
    [403, 'misconfigured'],
    [400, 'bad_input'],
  ])('maps status %i to %s', async (status, kind) => {
    vi.stubGlobal('fetch', vi.fn(reply(status === 204 ? null : '{}', status)))
    const res = await fetchJson(base)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.kind).toBe(kind)
  })

  it('returns bad_data for an empty 200 body (the old "Unexpected end of JSON" crash)', async () => {
    vi.stubGlobal('fetch', vi.fn(reply('')))
    const res = await fetchJson(base)
    expect(res.ok === false && res.error.kind).toBe('bad_data')
  })

  it('returns bad_data for invalid JSON and for schema mismatches', async () => {
    vi.stubGlobal('fetch', vi.fn(reply('not json')))
    expect((await fetchJson(base)) as any).toMatchObject({ ok: false, error: { kind: 'bad_data' } })
    vi.stubGlobal('fetch', vi.fn(reply('{"a":"x"}')))
    expect((await fetchJson(base)) as any).toMatchObject({ ok: false, error: { kind: 'bad_data' } })
  })

  it('retries once on 5xx, then reports provider_down', async () => {
    const fetchMock = vi.fn(reply('{}', 503))
    vi.stubGlobal('fetch', fetchMock)
    const res = await fetchJson(base)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(res.ok === false && res.error.kind).toBe('provider_down')
  })

  it('succeeds when the retry succeeds', async () => {
    const fetchMock = vi.fn().mockImplementationOnce(reply('{}', 500)).mockImplementationOnce(reply('{"a":2}'))
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchJson(base)).toEqual({ ok: true, data: { a: 2 } })
  })

  it('maps network failures to provider_down', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('fetch failed'))))
    const res = await fetchJson(base)
    expect(res.ok === false && res.error.kind).toBe('provider_down')
  })

  it('does not retry a rate limit', async () => {
    const fetchMock = vi.fn(reply('{}', 429))
    vi.stubGlobal('fetch', fetchMock)
    await fetchJson(base)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never logs the URL or API key', async () => {
    vi.stubGlobal('fetch', vi.fn(reply('{}', 500)))
    await fetchJson(base)
    const logged = JSON.stringify(errorSpy.mock.calls)
    expect(logged).not.toContain('SECRET')
    expect(logged).not.toContain('example.test')
    expect(logged).toContain('provider_down')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/http.test.ts`
Expected: FAIL (cannot find module `./http`).

- [ ] **Step 3: Implement**

`src/lib/result.ts`:

```ts
export type ErrorKind =
  | 'bad_input'
  | 'not_found'
  | 'rate_limited'
  | 'provider_down'
  | 'bad_data'
  | 'misconfigured'

export interface ProviderError {
  kind: ErrorKind
  provider: string
  message: string
  status?: number
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ProviderError }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })

export const fail = (
  kind: ErrorKind,
  provider: string,
  message: string,
  status?: number,
): Result<never> => ({ ok: false, error: { kind, provider, message, status } })
```

`src/lib/env.ts`:

```ts
import 'server-only'
import { fail, ok, type Result } from './result'

export const isMockMode = (): boolean => process.env.USE_MOCK_DATA === 'true'

export function requireKey(name: string, provider: string): Result<string> {
  const value = process.env[name]
  if (!value) {
    console.error(`[config] missing env var ${name}`)
    return fail('misconfigured', provider, `Missing ${name}`)
  }
  return ok(value)
}
```

`src/lib/http.ts`:

```ts
import 'server-only'
import type { ZodType } from 'zod'
import { fail, ok, type Result } from './result'

export interface FetchJsonOptions<T> {
  provider: string
  url: string
  init?: RequestInit
  schema: ZodType<T>
  timeoutMs?: number
  retries?: number
  revalidate?: number
}

async function attempt<T>(o: FetchJsonOptions<T>): Promise<Result<T>> {
  const { provider, url, init, schema, timeoutMs = 8000, revalidate } = o
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      ...(revalidate !== undefined ? { next: { revalidate } } : {}),
    } as RequestInit)
    const status = response.status
    if (status === 204 || status === 404) return fail('not_found', provider, 'Not found', status)
    if (status === 429) return fail('rate_limited', provider, 'Rate limited', status)
    if (status === 401 || status === 403) return fail('misconfigured', provider, 'Rejected credentials', status)
    if (status >= 500) return fail('provider_down', provider, 'Provider error', status)
    if (status >= 400) return fail('bad_input', provider, 'Request rejected', status)

    const text = await response.text()
    if (!text) return fail('bad_data', provider, 'Empty response', status)
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      return fail('bad_data', provider, 'Invalid JSON', status)
    }
    const parsed = schema.safeParse(json)
    if (!parsed.success) return fail('bad_data', provider, 'Unexpected response shape', status)
    return ok(parsed.data)
  } catch {
    return fail('provider_down', provider, 'Network error or timeout')
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchJson<T>(opts: FetchJsonOptions<T>): Promise<Result<T>> {
  const retries = opts.retries ?? 1
  let result = await attempt(opts)
  for (let i = 0; i < retries && !result.ok && result.error.kind === 'provider_down'; i++) {
    result = await attempt(opts)
  }
  if (!result.ok) {
    const { kind, provider, status } = result.error
    console.error('[provider-error]', JSON.stringify({ provider, kind, status }))
  }
  return result
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/http.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/result.ts src/lib/env.ts src/lib/http.ts src/lib/http.test.ts
git commit -m "feat: add Result type, env helpers and validated HTTP wrapper" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Input validation and user-facing error messages

**Files:**
- Create: `src/lib/validate.ts`, `src/lib/messages.ts`
- Test: `src/lib/validate.test.ts`, `src/lib/messages.test.ts`

**Interfaces:**
- Consumes: `Result`, `ok`, `fail`, `ProviderError` from `./result`
- Produces:
  - `parseFlightNumber(input: string): Result<string>` (uppercased, spaces removed, e.g. `"aa 123"` → `"AA123"`)
  - `parseIata(input: string): Result<string>` (3 letters, uppercased)
  - `parseAirlineCode(input: string): Result<string>` (2 letters/digits, uppercased)
  - `parseDate(input: string): Result<string>` (real `YYYY-MM-DD`)
  - `userMessage(error: ProviderError): { title: string; body: string }`

- [ ] **Step 1: Write the failing tests**

`src/lib/validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseAirlineCode, parseDate, parseFlightNumber, parseIata } from './validate'

describe('parseFlightNumber', () => {
  it('normalizes valid numbers', () => {
    expect(parseFlightNumber(' aa 123 ')).toEqual({ ok: true, data: 'AA123' })
    expect(parseFlightNumber('U21234')).toEqual({ ok: true, data: 'U21234' })
    expect(parseFlightNumber('BA7B')).toEqual({ ok: true, data: 'BA7B' })
  })
  it.each(['', 'A', '123', 'AA', 'AA12345', 'AA-12', '!!123'])('rejects %j', (input) => {
    const res = parseFlightNumber(input)
    expect(res.ok === false && res.error.kind).toBe('bad_input')
  })
})

describe('parseIata', () => {
  it('accepts 3 letters', () => expect(parseIata('jfk')).toEqual({ ok: true, data: 'JFK' }))
  it.each(['', 'JF', 'JFKK', 'J1K'])('rejects %j', (input) =>
    expect(parseIata(input).ok).toBe(false))
})

describe('parseAirlineCode', () => {
  it('accepts 2 chars', () => expect(parseAirlineCode('aa')).toEqual({ ok: true, data: 'AA' }))
  it.each(['', 'A', 'AAA', '!!'])('rejects %j', (input) =>
    expect(parseAirlineCode(input).ok).toBe(false))
})

describe('parseDate', () => {
  it('accepts real dates', () => expect(parseDate('2026-02-28')).toEqual({ ok: true, data: '2026-02-28' }))
  it.each(['', '2026-13-01', '2026-02-30', '02-28-2026', 'tomorrow'])('rejects %j', (input) =>
    expect(parseDate(input).ok).toBe(false))
})
```

`src/lib/messages.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { ErrorKind } from './result'
import { userMessage } from './messages'

const kinds: ErrorKind[] = ['bad_input', 'not_found', 'rate_limited', 'provider_down', 'bad_data', 'misconfigured']

describe('userMessage', () => {
  it.each(kinds)('has a title and body for %s', (kind) => {
    const m = userMessage({ kind, provider: 'p', message: 'internal detail' })
    expect(m.title.length).toBeGreaterThan(0)
    expect(m.body.length).toBeGreaterThan(0)
    expect(m.body).not.toContain('internal detail')
  })

  it('does not reveal configuration problems', () => {
    const m = userMessage({ kind: 'misconfigured', provider: 'p', message: 'Missing RAPIDAPI_KEY' })
    expect(m.body).not.toMatch(/key|env/i)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/validate.test.ts src/lib/messages.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

`src/lib/validate.ts`:

```ts
import { fail, ok, type Result } from './result'

const bad = (message: string) => fail('bad_input', 'input', message)

export function parseFlightNumber(input: string): Result<string> {
  const v = input.replace(/\s+/g, '').toUpperCase()
  return /^[A-Z0-9]{2}\d{1,4}[A-Z]?$/.test(v) ? ok(v) : bad('Invalid flight number')
}

export function parseIata(input: string): Result<string> {
  const v = input.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(v) ? ok(v) : bad('Invalid airport code')
}

export function parseAirlineCode(input: string): Result<string> {
  const v = input.trim().toUpperCase()
  return /^[A-Z0-9]{2}$/.test(v) ? ok(v) : bad('Invalid airline code')
}

export function parseDate(input: string): Result<string> {
  const v = input.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return bad('Invalid date')
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v) ? ok(v) : bad('Invalid date')
}
```

`src/lib/messages.ts`:

```ts
import type { ProviderError } from './result'

export function userMessage(error: ProviderError): { title: string; body: string } {
  switch (error.kind) {
    case 'bad_input':
      return { title: 'Check your search', body: 'Something in the search doesn’t look right. Check the codes and try again.' }
    case 'not_found':
      return { title: 'No flight found', body: 'We couldn’t find a matching flight. Double-check the flight number and date.' }
    case 'rate_limited':
      return { title: 'Too many requests', body: 'We’ve hit our data limit for now. Please try again in a few minutes.' }
    case 'provider_down':
      return { title: 'Flight data is unavailable', body: 'Our flight data source isn’t responding. Please try again shortly.' }
    case 'bad_data':
      return { title: 'Unreadable flight data', body: 'The data we received didn’t make sense. Please try again later.' }
    case 'misconfigured':
      return { title: 'Something went wrong on our side', body: 'The app is not set up correctly right now. Please try again later.' }
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/validate.test.ts src/lib/messages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validate.ts src/lib/messages.ts src/lib/validate.test.ts src/lib/messages.test.ts
git commit -m "feat: add input validation and user-facing error messages" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Flight domain (types, time, status, progress, matching)

**Files:**
- Create: `src/lib/flight/types.ts`, `time.ts`, `status.ts`, `progress.ts`, `match.ts`
- Test: `src/lib/flight/flight.test.ts`

**Interfaces:**
- Produces (`types.ts`):

```ts
export interface AirportInfo { iata: string | null; icao: string | null; name: string; city: string; countryCode: string | null; lat: number | null; lon: number | null }
export interface EndpointInfo { airport: AirportInfo; scheduledUtc: string | null; scheduledLocal: string | null; revisedUtc: string | null; revisedLocal: string | null; actualUtc: string | null; actualLocal: string | null; terminal: string | null; gate: string | null; checkInDesk: string | null }
export interface Flight { number: string; airlineName: string | null; airlineIata: string | null; aircraftModel: string | null; rawStatus: string | null; departure: EndpointInfo; arrival: EndpointInfo; position: { lat: number; lon: number } | null }
export interface LiveFlightSummary { flightIata: string; airlineIata: string | null; depIata: string | null; arrIata: string | null }
export interface Weather { tempC: number; tempF: number; condition: string; iconUrl: string }
```

- `time.ts`: `bestUtc(e: EndpointInfo): string | null`, `delayMinutes(e: EndpointInfo): number | null`, `localTime(local: string | null): string | null`, `formatDuration(ms: number): string`
- `status.ts`: `type FlightStatus = 'scheduled' | 'delayed' | 'in_air' | 'landed' | 'cancelled' | 'diverted'`, `deriveStatus(f: Flight, now: Date): FlightStatus`
- `progress.ts`: `flightProgress(f: Flight, now: Date): number | null` (0..1)
- `match.ts`: `pickFlight(flights: Flight[], opts: { dep?: string; arr?: string; date?: string; now: Date }): Flight | null`

- [ ] **Step 1: Write the failing tests**

`src/lib/flight/flight.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { EndpointInfo, Flight } from './types'
import { delayMinutes, formatDuration, localTime } from './time'
import { deriveStatus } from './status'
import { flightProgress } from './progress'
import { pickFlight } from './match'

const airport = (iata: string) => ({ iata, icao: null, name: iata, city: iata, countryCode: null, lat: null, lon: null })
const ep = (iata: string, scheduledUtc: string, extra: Partial<EndpointInfo> = {}): EndpointInfo => ({
  airport: airport(iata), scheduledUtc, scheduledLocal: scheduledUtc.slice(0, 16).replace('T', ' ') + '+00:00',
  revisedUtc: null, revisedLocal: null, actualUtc: null, actualLocal: null,
  terminal: null, gate: null, checkInDesk: null, ...extra,
})
const flight = (over: Partial<Flight> & { dep?: EndpointInfo; arr?: EndpointInfo } = {}): Flight => ({
  number: 'AA100', airlineName: 'American', airlineIata: 'AA', aircraftModel: null, rawStatus: null, position: null,
  departure: over.dep ?? ep('JFK', '2026-10-03T10:00:00Z'),
  arrival: over.arr ?? ep('LAX', '2026-10-03T11:30:00Z'),
  ...over,
})
const at = (iso: string) => new Date(iso)

describe('time helpers', () => {
  it('computes delay from revised or actual vs scheduled', () => {
    expect(delayMinutes(ep('JFK', '2026-10-03T10:00:00Z', { revisedUtc: '2026-10-03T10:45:00Z' }))).toBe(45)
    expect(delayMinutes(ep('JFK', '2026-10-03T10:00:00Z', { actualUtc: '2026-10-03T09:55:00Z' }))).toBe(-5)
    expect(delayMinutes(ep('JFK', '2026-10-03T10:00:00Z'))).toBe(0)
  })
  it('extracts HH:MM from a local timestamp', () => {
    expect(localTime('2025-02-01 14:30+01:00')).toBe('14:30')
    expect(localTime(null)).toBeNull()
  })
  it('formats durations', () => {
    expect(formatDuration(135 * 60_000)).toBe('2h 15m')
    expect(formatDuration(40 * 60_000)).toBe('40m')
    expect(formatDuration(-5)).toBe('0m')
  })
})

describe('deriveStatus', () => {
  const f = (rawStatus: string | null, extra: Partial<Flight> = {}) => flight({ rawStatus, ...extra })
  const noon = at('2026-10-03T10:30:00Z')
  it.each([
    ['Canceled', 'cancelled'],
    ['CanceledUncertain', 'cancelled'],
    ['Diverted', 'diverted'],
    ['Arrived', 'landed'],
    ['Departed', 'in_air'],
    ['EnRoute', 'in_air'],
    ['Approaching', 'in_air'],
    ['Boarding', 'scheduled'],
    ['Expected', 'scheduled'],
    ['Delayed', 'delayed'],
  ])('maps %s to %s', (raw, expected) => expect(deriveStatus(f(raw), noon)).toBe(expected))

  it('falls back to timestamps for unknown status', () => {
    expect(deriveStatus(f('Unknown'), at('2026-10-03T09:00:00Z'))).toBe('scheduled')
    expect(deriveStatus(f(null), at('2026-10-03T10:30:00Z'))).toBe('in_air')
    expect(deriveStatus(f(null), at('2026-10-03T12:00:00Z'))).toBe('landed')
  })
  it('flags delays of 15+ minutes before departure, not smaller ones', () => {
    const late = flight({ rawStatus: 'Expected', dep: ep('JFK', '2026-10-03T10:00:00Z', { revisedUtc: '2026-10-03T10:20:00Z' }) })
    const slight = flight({ rawStatus: 'Expected', dep: ep('JFK', '2026-10-03T10:00:00Z', { revisedUtc: '2026-10-03T10:10:00Z' }) })
    expect(deriveStatus(late, at('2026-10-03T08:00:00Z'))).toBe('delayed')
    expect(deriveStatus(slight, at('2026-10-03T08:00:00Z'))).toBe('scheduled')
  })
})

describe('flightProgress', () => {
  it('uses real timestamps (a 90-minute flight is halfway at 45 minutes)', () => {
    expect(flightProgress(flight(), at('2026-10-03T10:45:00Z'))).toBeCloseTo(0.5)
  })
  it('clamps to 0..1', () => {
    expect(flightProgress(flight(), at('2026-10-03T08:00:00Z'))).toBe(0)
    expect(flightProgress(flight(), at('2026-10-03T20:00:00Z'))).toBe(1)
  })
  it('returns null without usable times', () => {
    const f = flight({ dep: { ...ep('JFK', '2026-10-03T10:00:00Z'), scheduledUtc: null } })
    expect(flightProgress(f, at('2026-10-03T10:45:00Z'))).toBeNull()
  })
})

describe('pickFlight', () => {
  const today = flight({ number: 'AA100' })
  const tomorrow = flight({ dep: ep('JFK', '2026-10-04T10:00:00Z'), arr: ep('LAX', '2026-10-04T11:30:00Z') })
  const otherLeg = flight({ dep: ep('LAX', '2026-10-03T14:00:00Z'), arr: ep('SFO', '2026-10-03T15:00:00Z') })
  const now = at('2026-10-03T09:00:00Z')

  it('picks the entry closest to now', () => {
    expect(pickFlight([tomorrow, today], { now })).toBe(today)
  })
  it('filters by departure and arrival airports', () => {
    expect(pickFlight([otherLeg, today], { dep: 'JFK', arr: 'LAX', now })).toBe(today)
    expect(pickFlight([otherLeg], { dep: 'JFK', now })).toBeNull()
  })
  it('filters by local date when given', () => {
    expect(pickFlight([today, tomorrow], { date: '2026-10-04', now })).toBe(tomorrow)
    expect(pickFlight([today], { date: '2026-10-05', now })).toBeNull()
  })
  it('returns null for an empty list', () => expect(pickFlight([], { now })).toBeNull())
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/flight`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

`src/lib/flight/types.ts`: the interfaces exactly as listed under **Interfaces** above (export all five).

`src/lib/flight/time.ts`:

```ts
import type { EndpointInfo } from './types'

export function bestUtc(e: EndpointInfo): string | null {
  return e.actualUtc ?? e.revisedUtc ?? e.scheduledUtc
}

export function delayMinutes(e: EndpointInfo): number | null {
  const best = bestUtc(e)
  if (!best || !e.scheduledUtc) return null
  const diff = Date.parse(best) - Date.parse(e.scheduledUtc)
  return Number.isNaN(diff) ? null : Math.round(diff / 60_000)
}

/** "2025-02-01 14:30+01:00" -> "14:30" */
export function localTime(local: string | null): string | null {
  return local && local.length >= 16 ? local.slice(11, 16) : null
}

export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
```

`src/lib/flight/status.ts`:

```ts
import { bestUtc, delayMinutes } from './time'
import type { Flight } from './types'

export type FlightStatus = 'scheduled' | 'delayed' | 'in_air' | 'landed' | 'cancelled' | 'diverted'

export const DELAY_THRESHOLD_MIN = 15
const PRE_DEPARTURE = ['expected', 'checkin', 'boarding', 'gateclosed', 'delayed']
const AIRBORNE = ['departed', 'enroute', 'approaching']

function preDeparture(f: Flight, raw: string): FlightStatus {
  const d = delayMinutes(f.departure)
  return raw === 'delayed' || (d !== null && d >= DELAY_THRESHOLD_MIN) ? 'delayed' : 'scheduled'
}

function fromTimes(f: Flight, now: Date): FlightStatus {
  const dep = Date.parse(bestUtc(f.departure) ?? '')
  const arr = Date.parse(bestUtc(f.arrival) ?? '')
  if (Number.isNaN(dep) || Number.isNaN(arr)) return 'scheduled'
  if (now.getTime() < dep) return preDeparture(f, '')
  return now.getTime() < arr ? 'in_air' : 'landed'
}

export function deriveStatus(f: Flight, now: Date): FlightStatus {
  const raw = (f.rawStatus ?? '').toLowerCase()
  if (raw.startsWith('cancel')) return 'cancelled'
  if (raw === 'diverted') return 'diverted'
  if (raw === 'arrived') return 'landed'
  if (AIRBORNE.includes(raw)) return 'in_air'
  if (PRE_DEPARTURE.includes(raw)) return preDeparture(f, raw)
  return fromTimes(f, now)
}
```

`src/lib/flight/progress.ts`:

```ts
import { bestUtc } from './time'
import type { Flight } from './types'

/** Fraction of the flight completed, 0..1, from real timestamps. */
export function flightProgress(f: Flight, now: Date): number | null {
  const dep = Date.parse(bestUtc(f.departure) ?? '')
  const arr = Date.parse(bestUtc(f.arrival) ?? '')
  const total = arr - dep
  if (Number.isNaN(total) || total <= 0) return null
  return Math.min(1, Math.max(0, (now.getTime() - dep) / total))
}
```

`src/lib/flight/match.ts`:

```ts
import type { Flight } from './types'

interface PickOptions { dep?: string; arr?: string; date?: string; now: Date }

export function pickFlight(flights: Flight[], { dep, arr, date, now }: PickOptions): Flight | null {
  let candidates = flights
  if (dep) candidates = candidates.filter((f) => f.departure.airport.iata === dep)
  if (arr) candidates = candidates.filter((f) => f.arrival.airport.iata === arr)
  if (date) candidates = candidates.filter((f) => f.departure.scheduledLocal?.startsWith(date))
  if (candidates.length === 0) return null

  const distance = (f: Flight) => {
    const t = Date.parse(f.departure.scheduledUtc ?? '')
    return Number.isNaN(t) ? Infinity : Math.abs(t - now.getTime())
  }
  return [...candidates].sort((a, b) => distance(a) - distance(b))[0]
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/flight`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/flight
git commit -m "feat: add flight domain types, status, progress and matching" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Mock fixtures and the AeroDataBox provider

**Files:**
- Create: `src/lib/mocks/index.ts`, `src/lib/providers/aerodatabox.ts`
- Test: `src/lib/mocks/mocks.test.ts`, `src/lib/providers/aerodatabox.test.ts`

**Interfaces:**
- Consumes: `fetchJson`, `Result/ok/fail`, `isMockMode/requireKey`, `parseFlightNumber/parseDate`, flight types
- Produces:
  - `mockFlightDetails(number: string, now: Date): Result<Flight[]>`: numbers `AA100` (in air), `AA2` (in air), `BA117` (scheduled), `LH400` (landed), `DL1` (cancelled), `AF11` (diverted), `UA900` (delayed); `ER404` → `provider_down`, `ER429` → `rate_limited`; anything else → `not_found`
  - `mockLiveFlights(dep: string, arr: string, airline: string): Result<LiveFlightSummary[]>`: only `JFK`/`LAX`/`AA` returns `[AA100, AA2]`, otherwise `not_found`
  - `getFlightDetails(number: string, opts?: { date?: string }): Promise<Result<Flight[]>>`

- [ ] **Step 1: Write the failing mock tests**

`src/lib/mocks/mocks.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { deriveStatus } from '@/lib/flight/status'
import { mockFlightDetails, mockLiveFlights } from './index'

const now = new Date('2026-10-03T12:00:00Z')

describe('mockFlightDetails', () => {
  it.each([
    ['AA100', 'in_air'],
    ['AA2', 'in_air'],
    ['BA117', 'scheduled'],
    ['LH400', 'landed'],
    ['DL1', 'cancelled'],
    ['AF11', 'diverted'],
    ['UA900', 'delayed'],
  ])('%s is %s', (number, status) => {
    const res = mockFlightDetails(number, now)
    expect(res.ok).toBe(true)
    if (res.ok) expect(deriveStatus(res.data[0], now)).toBe(status)
  })

  it('simulates provider errors and unknown flights', () => {
    const kind = (n: string) => { const r = mockFlightDetails(n, now); return r.ok ? 'ok' : r.error.kind }
    expect(kind('ER404')).toBe('provider_down')
    expect(kind('ER429')).toBe('rate_limited')
    expect(kind('ZZ999')).toBe('not_found')
  })
})

describe('mockLiveFlights', () => {
  it('returns two flights for JFK-LAX-AA and not_found otherwise', () => {
    const hit = mockLiveFlights('JFK', 'LAX', 'AA')
    expect(hit.ok && hit.data.map((f) => f.flightIata)).toEqual(['AA100', 'AA2'])
    const miss = mockLiveFlights('JFK', 'LAX', 'BA')
    expect(miss.ok === false && miss.error.kind).toBe('not_found')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/mocks`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the mocks**

`src/lib/mocks/index.ts`:

```ts
import { fail, ok, type Result } from '../result'
import type { AirportInfo, EndpointInfo, Flight, LiveFlightSummary } from '../flight/types'

const airport = (iata: string, icao: string, name: string, city: string, countryCode: string, lat: number, lon: number): AirportInfo =>
  ({ iata, icao, name, city, countryCode, lat, lon })

const AIRPORTS: Record<string, AirportInfo> = {
  JFK: airport('JFK', 'KJFK', 'John F. Kennedy International', 'New York', 'US', 40.64, -73.78),
  LAX: airport('LAX', 'KLAX', 'Los Angeles International', 'Los Angeles', 'US', 33.94, -118.41),
  LHR: airport('LHR', 'EGLL', 'London Heathrow', 'London', 'GB', 51.47, -0.45),
  FRA: airport('FRA', 'EDDF', 'Frankfurt am Main', 'Frankfurt', 'DE', 50.03, 8.57),
  CDG: airport('CDG', 'LFPG', 'Paris Charles de Gaulle', 'Paris', 'FR', 49.01, 2.55),
}

interface Spec {
  number: string
  airline: [string, string]
  dep: string
  arr: string
  startMin: number
  durMin: number
  status: string
  delayMin?: number
}

const SPECS: Spec[] = [
  { number: 'AA100', airline: ['American Airlines', 'AA'], dep: 'JFK', arr: 'LAX', startMin: -120, durMin: 360, status: 'EnRoute' },
  { number: 'AA2', airline: ['American Airlines', 'AA'], dep: 'JFK', arr: 'LAX', startMin: -30, durMin: 360, status: 'EnRoute' },
  { number: 'BA117', airline: ['British Airways', 'BA'], dep: 'LHR', arr: 'JFK', startMin: 180, durMin: 480, status: 'Expected' },
  { number: 'LH400', airline: ['Lufthansa', 'LH'], dep: 'FRA', arr: 'JFK', startMin: -600, durMin: 500, status: 'Arrived', delayMin: 12 },
  { number: 'DL1', airline: ['Delta Air Lines', 'DL'], dep: 'JFK', arr: 'LAX', startMin: 60, durMin: 360, status: 'Canceled' },
  { number: 'AF11', airline: ['Air France', 'AF'], dep: 'CDG', arr: 'JFK', startMin: -200, durMin: 480, status: 'Diverted' },
  { number: 'UA900', airline: ['United Airlines', 'UA'], dep: 'LAX', arr: 'JFK', startMin: 90, durMin: 300, status: 'Delayed', delayMin: 45 },
]

const MIN = 60_000
const iso = (d: Date) => d.toISOString()
const local = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ') + '+00:00'

function endpoint(a: AirportInfo, scheduled: Date, shiftMin: number, actual: boolean): EndpointInfo {
  const shifted = new Date(scheduled.getTime() + shiftMin * MIN)
  return {
    airport: a,
    scheduledUtc: iso(scheduled),
    scheduledLocal: local(scheduled),
    revisedUtc: shiftMin ? iso(shifted) : null,
    revisedLocal: shiftMin ? local(shifted) : null,
    actualUtc: actual ? iso(shifted) : null,
    actualLocal: actual ? local(shifted) : null,
    terminal: '4',
    gate: null,
    checkInDesk: null,
  }
}

function build(s: Spec, now: Date): Flight {
  const dep = new Date(now.getTime() + s.startMin * MIN)
  const arr = new Date(dep.getTime() + s.durMin * MIN)
  const shift = s.delayMin ?? 0
  const departed = s.startMin < 0 && s.status !== 'Canceled'
  return {
    number: s.number,
    airlineName: s.airline[0],
    airlineIata: s.airline[1],
    aircraftModel: 'Boeing 777-300ER',
    rawStatus: s.status,
    departure: endpoint(AIRPORTS[s.dep], dep, shift, departed),
    arrival: endpoint(AIRPORTS[s.arr], arr, shift, s.status === 'Arrived'),
    position: null,
  }
}

export function mockFlightDetails(number: string, now: Date): Result<Flight[]> {
  if (number === 'ER404') return fail('provider_down', 'mock', 'Simulated outage')
  if (number === 'ER429') return fail('rate_limited', 'mock', 'Simulated rate limit')
  const spec = SPECS.find((s) => s.number === number)
  return spec ? ok([build(spec, now)]) : fail('not_found', 'mock', 'No such mock flight')
}

export function mockLiveFlights(dep: string, arr: string, airline: string): Result<LiveFlightSummary[]> {
  if (dep === 'JFK' && arr === 'LAX' && airline === 'AA') {
    return ok([
      { flightIata: 'AA100', airlineIata: 'AA', depIata: 'JFK', arrIata: 'LAX' },
      { flightIata: 'AA2', airlineIata: 'AA', depIata: 'JFK', arrIata: 'LAX' },
    ])
  }
  return fail('not_found', 'mock', 'No mock flights')
}
```

- [ ] **Step 4: Write the failing provider tests**

`src/lib/providers/aerodatabox.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getFlightDetails } from './aerodatabox'

const sample = [{
  number: 'AA 100',
  status: 'EnRoute',
  airline: { name: 'American Airlines', iata: 'AA' },
  aircraft: { model: 'Boeing 777' },
  departure: {
    airport: { name: 'John F Kennedy Intl', iata: 'JFK', icao: 'KJFK', municipalityName: 'New York', countryCode: 'US', location: { lat: 40.6, lon: -73.7 } },
    scheduledTime: { utc: '2026-10-03 10:00Z', local: '2026-10-03 06:00-04:00' },
    revisedTime: { utc: '2026-10-03 10:20Z', local: '2026-10-03 06:20-04:00' },
    terminal: '8', gate: null,
  },
  arrival: {
    airport: { name: 'Los Angeles Intl', iata: 'LAX', municipalityName: 'Los Angeles', countryCode: 'US' },
    scheduledTime: { utc: '2026-10-03 16:00Z', local: '2026-10-03 09:00-07:00' },
  },
  location: { lat: 39.1, lon: -95.2 },
}]

beforeEach(() => {
  vi.stubEnv('RAPIDAPI_KEY', 'test-key')
  vi.stubEnv('USE_MOCK_DATA', '')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const stubFetch = (body: unknown, status = 200) =>
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))))

describe('getFlightDetails', () => {
  it('maps the API response to Flight objects', async () => {
    stubFetch(sample)
    const res = await getFlightDetails('aa 100')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const f = res.data[0]
    expect(f.number).toBe('AA 100')
    expect(f.airlineName).toBe('American Airlines')
    expect(f.rawStatus).toBe('EnRoute')
    expect(f.departure.airport).toMatchObject({ iata: 'JFK', city: 'New York', lat: 40.6 })
    expect(f.departure.scheduledLocal).toBe('2026-10-03 06:00-04:00')
    expect(f.departure.revisedUtc).toBe('2026-10-03 10:20Z')
    expect(f.departure.terminal).toBe('8')
    expect(f.arrival.airport.lat).toBeNull()
    expect(f.position).toEqual({ lat: 39.1, lon: -95.2 })
  })

  it('sends the key in headers, not in the URL, and includes the date when given', async () => {
    stubFetch(sample)
    await getFlightDetails('AA100', { date: '2026-10-03' })
    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toContain('/flights/number/AA100/2026-10-03')
    expect(url).not.toContain('test-key')
    expect(init.headers['X-RapidAPI-Key']).toBe('test-key')
  })

  it('rejects invalid input before calling the API', async () => {
    stubFetch(sample)
    const res = await getFlightDetails('nope')
    expect(res.ok === false && res.error.kind).toBe('bad_input')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects an invalid date', async () => {
    const res = await getFlightDetails('AA100', { date: '2026-99-99' })
    expect(res.ok === false && res.error.kind).toBe('bad_input')
  })

  it('returns not_found for an empty array', async () => {
    stubFetch([])
    const res = await getFlightDetails('AA100')
    expect(res.ok === false && res.error.kind).toBe('not_found')
  })

  it('returns misconfigured when the key is missing', async () => {
    vi.stubEnv('RAPIDAPI_KEY', '')
    const res = await getFlightDetails('AA100')
    expect(res.ok === false && res.error.kind).toBe('misconfigured')
  })

  it('uses fixtures in mock mode without calling fetch', async () => {
    vi.stubEnv('USE_MOCK_DATA', 'true')
    vi.stubGlobal('fetch', vi.fn())
    const res = await getFlightDetails('AA100')
    expect(res.ok).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 5: Run to verify failure**

Run: `npx vitest run src/lib/mocks src/lib/providers/aerodatabox.test.ts`
Expected: mocks PASS now; aerodatabox FAIL (module not found).

- [ ] **Step 6: Implement the provider**

`src/lib/providers/aerodatabox.ts`:

```ts
import 'server-only'
import { z } from 'zod'
import { isMockMode, requireKey } from '../env'
import { fetchJson } from '../http'
import { mockFlightDetails } from '../mocks'
import { fail, ok, type Result } from '../result'
import { parseDate, parseFlightNumber } from '../validate'
import type { AirportInfo, EndpointInfo, Flight } from '../flight/types'

const PROVIDER = 'aerodatabox'

const time = z.object({ utc: z.string().nullish(), local: z.string().nullish() }).nullish()
const apiAirport = z
  .object({
    name: z.string().nullish(),
    iata: z.string().nullish(),
    icao: z.string().nullish(),
    municipalityName: z.string().nullish(),
    countryCode: z.string().nullish(),
    location: z.object({ lat: z.number(), lon: z.number() }).nullish(),
  })
  .nullish()
const apiEndpoint = z.object({
  airport: apiAirport,
  scheduledTime: time,
  revisedTime: time,
  runwayTime: time,
  terminal: z.string().nullish(),
  gate: z.string().nullish(),
  checkInDesk: z.string().nullish(),
})
const apiFlight = z.object({
  number: z.string(),
  status: z.string().nullish(),
  airline: z.object({ name: z.string().nullish(), iata: z.string().nullish() }).nullish(),
  aircraft: z.object({ model: z.string().nullish() }).nullish(),
  departure: apiEndpoint,
  arrival: apiEndpoint,
  location: z.object({ lat: z.number(), lon: z.number() }).nullish(),
})
const responseSchema = z.array(apiFlight)

type ApiAirport = z.infer<typeof apiAirport>
type ApiEndpoint = z.infer<typeof apiEndpoint>

function toAirport(a: ApiAirport): AirportInfo {
  return {
    iata: a?.iata ?? null,
    icao: a?.icao ?? null,
    name: a?.name ?? 'Unknown airport',
    city: a?.municipalityName ?? a?.name ?? 'Unknown',
    countryCode: a?.countryCode ?? null,
    lat: a?.location?.lat ?? null,
    lon: a?.location?.lon ?? null,
  }
}

function toEndpoint(e: ApiEndpoint): EndpointInfo {
  return {
    airport: toAirport(e.airport),
    scheduledUtc: e.scheduledTime?.utc ?? null,
    scheduledLocal: e.scheduledTime?.local ?? null,
    revisedUtc: e.revisedTime?.utc ?? null,
    revisedLocal: e.revisedTime?.local ?? null,
    actualUtc: e.runwayTime?.utc ?? null,
    actualLocal: e.runwayTime?.local ?? null,
    terminal: e.terminal ?? null,
    gate: e.gate ?? null,
    checkInDesk: e.checkInDesk ?? null,
  }
}

export async function getFlightDetails(
  number: string,
  opts: { date?: string } = {},
): Promise<Result<Flight[]>> {
  const parsedNumber = parseFlightNumber(number)
  if (!parsedNumber.ok) return parsedNumber
  if (opts.date !== undefined) {
    const parsedDate = parseDate(opts.date)
    if (!parsedDate.ok) return parsedDate
  }

  if (isMockMode()) return mockFlightDetails(parsedNumber.data, new Date())

  const key = requireKey('RAPIDAPI_KEY', PROVIDER)
  if (!key.ok) return key

  const datePart = opts.date ? `/${opts.date}` : ''
  const url =
    `https://aerodatabox.p.rapidapi.com/flights/number/${parsedNumber.data}${datePart}` +
    `?withAircraftImage=false&withLocation=true`

  const res = await fetchJson({
    provider: PROVIDER,
    url,
    init: { headers: { 'X-RapidAPI-Key': key.data, 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' } },
    schema: responseSchema,
    revalidate: 60,
  })
  if (!res.ok) return res
  if (res.data.length === 0) return fail('not_found', PROVIDER, 'No flights returned')

  return ok(
    res.data.map((f) => ({
      number: f.number,
      airlineName: f.airline?.name ?? null,
      airlineIata: f.airline?.iata ?? null,
      aircraftModel: f.aircraft?.model ?? null,
      rawStatus: f.status ?? null,
      departure: toEndpoint(f.departure),
      arrival: toEndpoint(f.arrival),
      position: f.location ?? null,
    })),
  )
}
```

- [ ] **Step 7: Run to verify pass**

Run: `npx vitest run src/lib/mocks src/lib/providers/aerodatabox.test.ts`
Expected: PASS.

- [ ] **Step 8: Verify the real response shape (needs your key; skip if you have none yet)**

Put the new key in `.env.local` as `RAPIDAPI_KEY=...`, then run:

```bash
set -a; source .env.local; set +a
curl -s -H "X-RapidAPI-Key: $RAPIDAPI_KEY" -H "X-RapidAPI-Host: aerodatabox.p.rapidapi.com" \
  "https://aerodatabox.p.rapidapi.com/flights/number/AA100?withLocation=true" | head -c 3000
```

Compare against the `sample` in the test. If field names differ (for example `scheduledTimeUtc` instead of `scheduledTime.utc`), update `apiEndpoint`/`toEndpoint` and the test sample to match, and note the AeroDataBox date range that your plan allows in the README. Re-run the tests.

- [ ] **Step 9: Commit**

```bash
git add src/lib/mocks src/lib/providers/aerodatabox.ts src/lib/providers/aerodatabox.test.ts
git commit -m "feat: add AeroDataBox provider and mock fixtures" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: AirLabs provider (route search)

**Files:**
- Create: `src/lib/providers/airlabs.ts`
- Test: `src/lib/providers/airlabs.test.ts`

**Interfaces:**
- Consumes: `fetchJson`, `parseIata`, `parseAirlineCode`, `mockLiveFlights`, `isMockMode`, `requireKey`
- Produces: `searchLiveFlights(q: { dep: string; arr: string; airline: string }): Promise<Result<LiveFlightSummary[]>>`

AirLabs reports errors inside a 200 body (`{ "error": { "message", "code" } }`), which crashed the old app on `airlabData.response.length`.

- [ ] **Step 1: Write the failing tests**

`src/lib/providers/airlabs.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { searchLiveFlights } from './airlabs'

beforeEach(() => {
  vi.stubEnv('AIRLABS_API_KEY', 'test-key')
  vi.stubEnv('USE_MOCK_DATA', '')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const stubFetch = (body: unknown, status = 200) =>
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))))
const q = { dep: 'jfk', arr: 'lax', airline: 'aa' }
const kind = (r: Awaited<ReturnType<typeof searchLiveFlights>>) => (r.ok ? 'ok' : r.error.kind)

describe('searchLiveFlights', () => {
  it('maps live flights and skips entries without a flight code', async () => {
    stubFetch({ response: [
      { flight_iata: 'AA100', airline_iata: 'AA', dep_iata: 'JFK', arr_iata: 'LAX' },
      { flight_iata: null, airline_iata: 'AA', dep_iata: 'JFK', arr_iata: 'LAX' },
    ] })
    const res = await searchLiveFlights(q)
    expect(res).toEqual({ ok: true, data: [{ flightIata: 'AA100', airlineIata: 'AA', depIata: 'JFK', arrIata: 'LAX' }] })
    expect((fetch as any).mock.calls[0][0]).toContain('dep_iata=JFK')
  })

  it('returns not_found when no flights are airborne', async () => {
    stubFetch({ response: [] })
    expect(kind(await searchLiveFlights(q))).toBe('not_found')
  })

  it('maps in-body API errors', async () => {
    stubFetch({ error: { message: 'Unknown api_key', code: 'unknown_api_key' } })
    expect(kind(await searchLiveFlights(q))).toBe('misconfigured')
    stubFetch({ error: { message: 'limit', code: 'minute_limit_exceeded' } })
    expect(kind(await searchLiveFlights(q))).toBe('rate_limited')
    stubFetch({ error: { message: 'other', code: 'something' } })
    expect(kind(await searchLiveFlights(q))).toBe('provider_down')
  })

  it('validates input before calling the API', async () => {
    stubFetch({ response: [] })
    expect(kind(await searchLiveFlights({ dep: 'J', arr: 'LAX', airline: 'AA' }))).toBe('bad_input')
    expect(kind(await searchLiveFlights({ dep: 'JFK', arr: 'LAX', airline: '' }))).toBe('bad_input')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns misconfigured without a key and uses fixtures in mock mode', async () => {
    vi.stubEnv('AIRLABS_API_KEY', '')
    expect(kind(await searchLiveFlights(q))).toBe('misconfigured')
    vi.stubEnv('USE_MOCK_DATA', 'true')
    expect(kind(await searchLiveFlights(q))).toBe('ok')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/providers/airlabs.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/lib/providers/airlabs.ts`:

```ts
import 'server-only'
import { z } from 'zod'
import { isMockMode, requireKey } from '../env'
import { fetchJson } from '../http'
import { mockLiveFlights } from '../mocks'
import { fail, ok, type Result } from '../result'
import { parseAirlineCode, parseIata } from '../validate'
import type { LiveFlightSummary } from '../flight/types'

const PROVIDER = 'airlabs'

const schema = z.object({
  response: z
    .array(
      z.object({
        flight_iata: z.string().nullish(),
        airline_iata: z.string().nullish(),
        dep_iata: z.string().nullish(),
        arr_iata: z.string().nullish(),
      }),
    )
    .optional(),
  error: z.object({ message: z.string().nullish(), code: z.string().nullish() }).optional(),
})

export async function searchLiveFlights(q: {
  dep: string
  arr: string
  airline: string
}): Promise<Result<LiveFlightSummary[]>> {
  const dep = parseIata(q.dep)
  if (!dep.ok) return dep
  const arr = parseIata(q.arr)
  if (!arr.ok) return arr
  const airline = parseAirlineCode(q.airline)
  if (!airline.ok) return airline

  if (isMockMode()) return mockLiveFlights(dep.data, arr.data, airline.data)

  const key = requireKey('AIRLABS_API_KEY', PROVIDER)
  if (!key.ok) return key

  const url =
    `https://airlabs.co/api/v9/flights?api_key=${key.data}` +
    `&dep_iata=${dep.data}&arr_iata=${arr.data}&airline_iata=${airline.data}`

  const res = await fetchJson({ provider: PROVIDER, url, schema, revalidate: 60 })
  if (!res.ok) return res

  if (res.data.error) {
    const code = res.data.error.code ?? ''
    if (code.includes('limit')) return fail('rate_limited', PROVIDER, 'Quota exceeded')
    if (code.includes('api_key')) return fail('misconfigured', PROVIDER, 'Rejected API key')
    return fail('provider_down', PROVIDER, 'Provider reported an error')
  }

  const flights: LiveFlightSummary[] = (res.data.response ?? [])
    .filter((f): f is typeof f & { flight_iata: string } => Boolean(f.flight_iata))
    .map((f) => ({
      flightIata: f.flight_iata,
      airlineIata: f.airline_iata ?? null,
      depIata: f.dep_iata ?? null,
      arrIata: f.arr_iata ?? null,
    }))

  return flights.length > 0 ? ok(flights) : fail('not_found', PROVIDER, 'No live flights on this route')
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/providers/airlabs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/providers/airlabs.ts src/lib/providers/airlabs.test.ts
git commit -m "feat: add AirLabs provider for live route search" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Weather and photo providers

**Files:**
- Create: `src/lib/providers/weather.ts`, `src/lib/providers/photos.ts`
- Test: `src/lib/providers/extras.test.ts`

**Interfaces:**
- Produces:
  - `getWeather(lat: number, lon: number): Promise<Result<Weather>>`
  - `getAirportPhoto(city: string): Promise<Result<string>>` (image URL)
  - `DEFAULT_AIRPORT_PHOTO: string` exported from `photos.ts`

- [ ] **Step 1: Write the failing tests**

`src/lib/providers/extras.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getWeather } from './weather'
import { getAirportPhoto } from './photos'

beforeEach(() => {
  vi.stubEnv('OPENWEATHER_API_KEY', 'w-key')
  vi.stubEnv('UNSPLASH_ACCESS_KEY', 'u-key')
  vi.stubEnv('USE_MOCK_DATA', '')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const stubFetch = (body: unknown, status = 200) =>
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))))

describe('getWeather', () => {
  it('returns Celsius and Fahrenheit and an https icon URL', async () => {
    stubFetch({ main: { temp: 20 }, weather: [{ main: 'Clouds', icon: '04d' }] })
    const res = await getWeather(40.6, -73.7)
    expect(res).toEqual({
      ok: true,
      data: { tempC: 20, tempF: 68, condition: 'Clouds', iconUrl: 'https://openweathermap.org/img/wn/04d@2x.png' },
    })
  })
  it('returns bad_data when the weather array is empty', async () => {
    stubFetch({ main: { temp: 20 }, weather: [] })
    const res = await getWeather(1, 2)
    expect(res.ok === false && res.error.kind).toBe('bad_data')
  })
  it('rejects non-finite coordinates and a missing key', async () => {
    const bad = await getWeather(Number.NaN, 2)
    expect(bad.ok === false && bad.error.kind).toBe('bad_input')
    vi.stubEnv('OPENWEATHER_API_KEY', '')
    const missing = await getWeather(1, 2)
    expect(missing.ok === false && missing.error.kind).toBe('misconfigured')
  })
})

describe('getAirportPhoto', () => {
  it('returns the first result and sends the key in a header', async () => {
    stubFetch({ results: [{ urls: { regular: 'https://img.test/a.jpg' } }] })
    const res = await getAirportPhoto('New York')
    expect(res).toEqual({ ok: true, data: 'https://img.test/a.jpg' })
    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toContain('query=New%20York')
    expect(url).not.toContain('u-key')
    expect(init.headers.Authorization).toBe('Client-ID u-key')
  })
  it('returns not_found when there are no results', async () => {
    stubFetch({ results: [] })
    const res = await getAirportPhoto('Nowhere')
    expect(res.ok === false && res.error.kind).toBe('not_found')
  })
  it('returns bad_input for an empty city', async () => {
    const res = await getAirportPhoto('  ')
    expect(res.ok === false && res.error.kind).toBe('bad_input')
  })
})

describe('mock mode', () => {
  it('returns fixed data without fetching', async () => {
    vi.stubEnv('USE_MOCK_DATA', 'true')
    vi.stubGlobal('fetch', vi.fn())
    expect((await getWeather(1, 2)).ok).toBe(true)
    expect((await getAirportPhoto('Paris')).ok).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/providers/extras.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

`src/lib/providers/weather.ts`:

```ts
import 'server-only'
import { z } from 'zod'
import { isMockMode, requireKey } from '../env'
import { fetchJson } from '../http'
import { fail, ok, type Result } from '../result'
import type { Weather } from '../flight/types'

const PROVIDER = 'openweathermap'

const schema = z.object({
  main: z.object({ temp: z.number() }),
  weather: z.array(z.object({ main: z.string(), icon: z.string() })),
})

export async function getWeather(lat: number, lon: number): Promise<Result<Weather>> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return fail('bad_input', PROVIDER, 'Bad coordinates')
  if (isMockMode()) {
    return ok({ tempC: 18, tempF: 64, condition: 'Clouds', iconUrl: 'https://openweathermap.org/img/wn/04d@2x.png' })
  }
  const key = requireKey('OPENWEATHER_API_KEY', PROVIDER)
  if (!key.ok) return key

  const res = await fetchJson({
    provider: PROVIDER,
    url: `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key.data}`,
    schema,
    revalidate: 600,
  })
  if (!res.ok) return res
  const first = res.data.weather[0]
  if (!first) return fail('bad_data', PROVIDER, 'No weather entry')

  const tempC = Math.round(res.data.main.temp)
  return ok({
    tempC,
    tempF: Math.round((res.data.main.temp * 9) / 5 + 32),
    condition: first.main,
    iconUrl: `https://openweathermap.org/img/wn/${first.icon}@2x.png`,
  })
}
```

Note: the test expects `tempF: 68` for 20 °C (`20 * 9/5 + 32 = 68`) and `tempC: 20`.

`src/lib/providers/photos.ts`:

```ts
import 'server-only'
import { z } from 'zod'
import { isMockMode, requireKey } from '../env'
import { fetchJson } from '../http'
import { fail, ok, type Result } from '../result'

const PROVIDER = 'unsplash'

export const DEFAULT_AIRPORT_PHOTO =
  'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=1000&q=80'

const schema = z.object({
  results: z.array(z.object({ urls: z.object({ regular: z.string() }) })),
})

export async function getAirportPhoto(city: string): Promise<Result<string>> {
  const query = city.trim()
  if (!query) return fail('bad_input', PROVIDER, 'Empty city')
  if (isMockMode()) return ok(DEFAULT_AIRPORT_PHOTO)

  const key = requireKey('UNSPLASH_ACCESS_KEY', PROVIDER)
  if (!key.ok) return key

  const res = await fetchJson({
    provider: PROVIDER,
    url: `https://api.unsplash.com/search/photos?page=1&per_page=1&orientation=landscape&query=${encodeURIComponent(query)}`,
    init: { headers: { Authorization: `Client-ID ${key.data}` } },
    schema,
    revalidate: 86_400,
  })
  if (!res.ok) return res
  const first = res.data.results[0]
  return first ? ok(first.urls.regular) : fail('not_found', PROVIDER, 'No photo found')
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/providers/extras.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/providers/weather.ts src/lib/providers/photos.ts src/lib/providers/extras.test.ts
git commit -m "feat: add weather and photo providers" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Airport/airline data, autocomplete search and API routes

**Files:**
- Create: `scripts/build-data.mjs`, `src/data/airports.json`, `src/data/airlines.json` (generated), `src/lib/autocomplete.ts`, `src/app/api/airports/route.ts`, `src/app/api/airlines/route.ts`
- Test: `src/lib/autocomplete.test.ts`

**Interfaces:**
- Produces:
  - `interface Suggestion { code: string; label: string; detail: string }`
  - `searchAirports(q: string, limit?: number): Suggestion[]` (airport `label` = `"JFK · New York"`, `detail` = `"John F. Kennedy International, United States"`)
  - `searchAirlines(q: string, limit?: number): Suggestion[]` (`label` = `"American Airlines"`, `detail` = `"AA · United States"`)
  - `GET /api/airports?q=` and `GET /api/airlines?q=` → `Suggestion[]` (empty array when `q` is under 2 characters)

- [ ] **Step 1: Write the data build script**

`scripts/build-data.mjs`:

```js
import { writeFile, mkdir } from 'node:fs/promises'

const AIRPORTS_URL = 'https://raw.githubusercontent.com/konsalex/Airport-Autocomplete-JS/master/src/data/airports.json'
const AIRLINES_URL = 'https://raw.githubusercontent.com/npow/airline-codes/master/airlines.json'

const getJson = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json()
}

const [airportsRaw, airlinesRaw] = await Promise.all([getJson(AIRPORTS_URL), getJson(AIRLINES_URL)])

const airports = []
const seenAirports = new Set()
for (const a of airportsRaw) {
  const iata = String(a.IATA ?? '').toUpperCase()
  if (!/^[A-Z]{3}$/.test(iata) || seenAirports.has(iata)) continue
  seenAirports.add(iata)
  airports.push({ iata, name: a.name ?? '', city: a.city ?? '', country: a.country ?? '' })
}

const airlines = []
const seenAirlines = new Set()
for (const a of airlinesRaw) {
  const iata = String(a.iata ?? '').toUpperCase()
  if (!/^[A-Z0-9]{2}$/.test(iata) || a.active === 'N' || seenAirlines.has(iata)) continue
  seenAirlines.add(iata)
  airlines.push({ iata, name: a.name ?? '', country: a.country ?? '' })
}

await mkdir('src/data', { recursive: true })
await writeFile('src/data/airports.json', JSON.stringify(airports))
await writeFile('src/data/airlines.json', JSON.stringify(airlines))
console.log(`airports: ${airports.length}, airlines: ${airlines.length}`)
```

- [ ] **Step 2: Generate the data**

Run: `node scripts/build-data.mjs`
Expected: a line like `airports: 4000+, airlines: 1000+` (exact counts may vary), and both JSON files created. If a count is 0, open the source URL and adjust the field names used in the script (`IATA`, `iata`, `active`) to match.

Check: `node -e "const a=require('./src/data/airports.json');console.log(a.find(x=>x.iata==='JFK'))"`
Expected: an object with `iata: 'JFK'` and a city. If JFK is missing, the source field names differ: fix the script before continuing.

- [ ] **Step 3: Write the failing tests**

`src/lib/autocomplete.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { searchAirlines, searchAirports } from './autocomplete'

describe('searchAirports', () => {
  it('finds an airport by exact code and ranks it first', () => {
    const r = searchAirports('jfk')
    expect(r[0].code).toBe('JFK')
    expect(r[0].label).toMatch(/^JFK · /)
  })
  it('finds by city, case-insensitively', () => {
    expect(searchAirports('new york').some((s) => s.code === 'JFK')).toBe(true)
  })
  it('respects the limit and returns [] for short or blank queries', () => {
    expect(searchAirports('a', 8)).toEqual([])
    expect(searchAirports('   ')).toEqual([])
    expect(searchAirports('lon', 3).length).toBeLessThanOrEqual(3)
  })
  it('does not break on regex characters', () => {
    expect(() => searchAirports('(((')).not.toThrow()
  })
})

describe('searchAirlines', () => {
  it('finds an airline by code and by name', () => {
    expect(searchAirlines('AA')[0].code).toBe('AA')
    expect(searchAirlines('lufthansa').some((s) => s.code === 'LH')).toBe(true)
  })
})
```

- [ ] **Step 4: Run to verify failure**

Run: `npx vitest run src/lib/autocomplete.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 5: Implement search and routes**

`src/lib/autocomplete.ts`:

```ts
import airports from '@/data/airports.json'
import airlines from '@/data/airlines.json'

export interface Suggestion {
  code: string
  label: string
  detail: string
}

const norm = (s: string) => s.trim().toLowerCase()

function rank(code: string, fields: string[], q: string): number {
  if (code.toLowerCase() === q) return 0
  if (code.toLowerCase().startsWith(q)) return 1
  if (fields.some((f) => f.toLowerCase().startsWith(q))) return 2
  if (fields.some((f) => f.toLowerCase().includes(q))) return 3
  return -1
}

export function searchAirports(query: string, limit = 8): Suggestion[] {
  const q = norm(query)
  if (q.length < 2) return []
  return airports
    .map((a) => ({ a, r: rank(a.iata, [a.city, a.name, a.country], q) }))
    .filter((x) => x.r >= 0)
    .sort((x, y) => x.r - y.r)
    .slice(0, limit)
    .map(({ a }) => ({
      code: a.iata,
      label: `${a.iata} · ${a.city}`,
      detail: [a.name, a.country].filter(Boolean).join(', '),
    }))
}

export function searchAirlines(query: string, limit = 8): Suggestion[] {
  const q = norm(query)
  if (q.length < 2) return []
  return airlines
    .map((a) => ({ a, r: rank(a.iata, [a.name, a.country], q) }))
    .filter((x) => x.r >= 0)
    .sort((x, y) => x.r - y.r)
    .slice(0, limit)
    .map(({ a }) => ({
      code: a.iata,
      label: a.name,
      detail: [a.iata, a.country].filter(Boolean).join(' · '),
    }))
}
```

If TypeScript complains about importing JSON, ensure `"resolveJsonModule": true` in `tsconfig.json` (create-next-app sets it).

`src/app/api/airports/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { searchAirports } from '@/lib/autocomplete'

export function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? ''
  return NextResponse.json(searchAirports(q.slice(0, 60)))
}
```

`src/app/api/airlines/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { searchAirlines } from '@/lib/autocomplete'

export function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? ''
  return NextResponse.json(searchAirlines(q.slice(0, 60)))
}
```

- [ ] **Step 6: Run to verify pass and commit**

Run: `npx vitest run src/lib/autocomplete.test.ts`
Expected: PASS.

```bash
git add scripts src/data src/lib/autocomplete.ts src/lib/autocomplete.test.ts src/app/api
git commit -m "feat: add bundled airport/airline data, autocomplete search and API routes" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Flight page, core UI components and error pages

**Files:**
- Create: `src/components/Unavailable/Unavailable.tsx`, `src/components/StatusBanner/StatusBanner.tsx` (+ `.module.css`, `.test.tsx`), `src/components/ErrorState/ErrorState.tsx` (+ css, test), `src/components/FlightPath/FlightPath.tsx` (+ css), `src/components/AirportCard/AirportCard.tsx` (+ css), `src/components/FlightView/FlightView.tsx` (+ css), `src/app/flight/[flightIata]/page.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`

**Interfaces:**
- Consumes: `getFlightDetails`, `pickFlight`, `deriveStatus`, `flightProgress`, `delayMinutes`, `localTime`, `formatDuration`, `bestUtc`, `parseFlightNumber`, `parseDate`, `userMessage`, `ProviderError`
- Produces:
  - `<Unavailable>` renders `<span className=muted>` with children or an em dash
  - `<StatusBanner status: FlightStatus; delayMinutes: number | null />`
  - `<ErrorState error: ProviderError; variant?: 'unconfirmed' />` with a "Search again" link to `/`
  - `<FlightPath progress: number | null; status: FlightStatus; countdown: string | null; flightNumber: string; airline: string | null; aircraft: string | null />`
  - `<AirportCard role: 'departure' | 'arrival'; endpoint: EndpointInfo; photo: ReactNode; weather: ReactNode />`
  - `<FlightView flight: Flight; now: Date />` (Task 10 passes real photo/weather slots; here they are placeholders)

- [ ] **Step 1: Write the failing component tests**

`src/components/StatusBanner/StatusBanner.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBanner } from './StatusBanner'

describe('StatusBanner', () => {
  it.each([
    ['scheduled', 'Scheduled'],
    ['in_air', 'In the air'],
    ['landed', 'Landed'],
    ['cancelled', 'Cancelled'],
    ['diverted', 'Diverted'],
    ['delayed', 'Delayed'],
  ] as const)('shows %s', (status, label) => {
    render(<StatusBanner status={status} delayMinutes={null} />)
    expect(screen.getByRole('status')).toHaveTextContent(label)
  })

  it('shows the delay in minutes, and early arrivals', () => {
    const { rerender } = render(<StatusBanner status="delayed" delayMinutes={45} />)
    expect(screen.getByRole('status')).toHaveTextContent('45 min late')
    rerender(<StatusBanner status="landed" delayMinutes={-8} />)
    expect(screen.getByRole('status')).toHaveTextContent('8 min early')
  })
})
```

`src/components/ErrorState/ErrorState.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('shows a friendly message and a way back, without internal details', () => {
    render(<ErrorState error={{ kind: 'provider_down', provider: 'x', message: 'secret internals' }} />)
    expect(screen.getByRole('heading')).toHaveTextContent('Flight data is unavailable')
    expect(screen.getByRole('link', { name: /search again/i })).toHaveAttribute('href', '/')
    expect(screen.queryByText(/secret internals/)).not.toBeInTheDocument()
  })

  it('shows the unconfirmed variant', () => {
    render(<ErrorState variant="unconfirmed" error={{ kind: 'not_found', provider: 'x', message: '' }} />)
    expect(screen.getByRole('heading')).toHaveTextContent(/couldn.t confirm this flight/i)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement the small components**

`src/components/Unavailable/Unavailable.tsx`:

```tsx
export function Unavailable({ children }: { children?: React.ReactNode }) {
  return <span style={{ color: 'var(--muted)' }}>{children ?? '—'}</span>
}
```

`src/components/StatusBanner/StatusBanner.tsx`:

```tsx
import type { FlightStatus } from '@/lib/flight/status'
import styles from './StatusBanner.module.css'

const LABELS: Record<FlightStatus, string> = {
  scheduled: 'Scheduled',
  delayed: 'Delayed',
  in_air: 'In the air',
  landed: 'Landed',
  cancelled: 'Cancelled',
  diverted: 'Diverted',
}

function delayText(minutes: number | null): string | null {
  if (minutes === null) return null
  if (minutes >= 5) return `${minutes} min late`
  if (minutes <= -5) return `${Math.abs(minutes)} min early`
  return 'On time'
}

export function StatusBanner({ status, delayMinutes }: { status: FlightStatus; delayMinutes: number | null }) {
  const showDelay = status !== 'cancelled' && status !== 'diverted'
  const extra = showDelay ? delayText(delayMinutes) : null
  return (
    <div role="status" className={`${styles.banner} ${styles[status]}`}>
      <strong>{LABELS[status]}</strong>
      {extra && <span> · {extra}</span>}
    </div>
  )
}
```

`src/components/StatusBanner/StatusBanner.module.css`:

```css
.banner { padding: 10px 16px; border-radius: 999px; background: var(--card); box-shadow: var(--shadow); font-size: 13px; text-align: center; }
.in_air { background: var(--ink); color: var(--bg); }
.delayed { border: 1px solid var(--ink); }
.cancelled, .diverted { border: 1px dashed var(--ink); }
```

`src/components/ErrorState/ErrorState.tsx`:

```tsx
import Link from 'next/link'
import { userMessage } from '@/lib/messages'
import type { ProviderError } from '@/lib/result'
import styles from './ErrorState.module.css'

export function ErrorState({ error, variant }: { error: ProviderError; variant?: 'unconfirmed' }) {
  const { title, body } =
    variant === 'unconfirmed'
      ? {
          title: 'We couldn’t confirm this flight',
          body: 'We found flights with this number, but none matching those airports or that date.',
        }
      : userMessage(error)
  return (
    <main className={styles.wrap}>
      <h1>{title}</h1>
      <p>{body}</p>
      <Link href="/" className="button">Search again</Link>
    </main>
  )
}
```

`src/components/ErrorState/ErrorState.module.css`:

```css
.wrap { max-width: 480px; margin: 0 auto; padding: 20vh 16px 40px; text-align: center; display: grid; gap: 16px; justify-items: center; }
.wrap h1 { font-size: 28px; }
.wrap p { font-size: 15px; margin: 0; }
```

- [ ] **Step 4: Run to verify the component tests pass**

Run: `npx vitest run src/components`
Expected: PASS.

- [ ] **Step 5: Implement FlightPath, AirportCard, FlightView**

`src/components/FlightPath/FlightPath.tsx`:

```tsx
import type { CSSProperties } from 'react'
import type { FlightStatus } from '@/lib/flight/status'
import styles from './FlightPath.module.css'

interface Props {
  progress: number | null
  status: FlightStatus
  countdown: string | null
  flightNumber: string
  airline: string | null
  aircraft: string | null
}

export function FlightPath({ progress, status, countdown, flightNumber, airline, aircraft }: Props) {
  const position = status === 'landed' ? 1 : status === 'scheduled' || status === 'delayed' ? 0 : (progress ?? 0.5)
  const showPlane = status !== 'cancelled'
  return (
    <section className={styles.path} aria-label="Flight path">
      <div className={styles.code}>
        <p>{aircraft ?? 'FLIGHT'}</p>
        <h2>{flightNumber}</h2>
        {airline && <h3>{airline}</h3>}
      </div>
      <div className={styles.track}>
        <div className={styles.line} />
        {showPlane && (
          <img
            className={styles.plane}
            src="/plane-icon.svg"
            alt=""
            style={{ '--progress': `${Math.round(position * 100)}%` } as CSSProperties}
          />
        )}
      </div>
      {countdown && <p className={styles.countdown}>Departs in {countdown}</p>}
    </section>
  )
}
```

`src/components/FlightPath/FlightPath.module.css`:

```css
.path { display: grid; gap: 8px; text-align: center; padding: 8px 12px; }
.code p, .code h2, .code h3 { margin: 0; }
.code h2 { font-size: 25px; }
.track { position: relative; width: 95%; margin: 14px auto; height: 20px; }
.line { position: absolute; top: 10px; left: 0; right: 0; border-bottom: 1px dashed var(--ink); }
.plane { position: absolute; top: 0; height: 20px; width: 20px; left: var(--progress, 0%); transform: translateX(-50%); animation: fly 2.5s ease-out; }
.countdown { margin: 0; font-size: 13px; }
@keyframes fly { from { left: 0%; } }
@media (prefers-reduced-motion: reduce) { .plane { animation: none; } }
```

`src/components/AirportCard/AirportCard.tsx`:

```tsx
import type { ReactNode } from 'react'
import { delayMinutes, localTime } from '@/lib/flight/time'
import type { EndpointInfo } from '@/lib/flight/types'
import { Unavailable } from '../Unavailable/Unavailable'
import styles from './AirportCard.module.css'

interface Props {
  role: 'departure' | 'arrival'
  endpoint: EndpointInfo
  photo: ReactNode
  weather: ReactNode
}

export function AirportCard({ role, endpoint, photo, weather }: Props) {
  const a = endpoint.airport
  const code = a.iata ?? a.icao ?? '—'
  const scheduled = localTime(endpoint.scheduledLocal)
  const estimated = localTime(endpoint.actualLocal ?? endpoint.revisedLocal)
  const delay = delayMinutes(endpoint)
  const showEstimate = estimated && estimated !== scheduled && delay !== null && Math.abs(delay) >= 5

  return (
    <section className={`${styles.card} ${styles[role]}`} aria-label={role === 'departure' ? 'Departure' : 'Arrival'}>
      <div className={styles.photo}>{photo}</div>
      <div className={styles.info}>
        <div className={styles.left}>
          <h1>{code}</h1>
          <p>{[a.city, a.countryCode].filter(Boolean).join(', ')}</p>
          <hr className={styles.divider} />
          {weather}
        </div>
        <div className={styles.right}>
          <h1>{scheduled ?? <Unavailable />}</h1>
          {showEstimate && (
            <p>{endpoint.actualLocal ? 'Actual' : 'Estimated'}: {estimated}</p>
          )}
          <hr className={styles.divider} />
          <p>Terminal: {endpoint.terminal ?? <Unavailable />}</p>
          <p>Gate: {endpoint.gate ?? <Unavailable />}</p>
          {role === 'departure' && <p>Check-in desk: {endpoint.checkInDesk ?? <Unavailable />}</p>}
        </div>
      </div>
    </section>
  )
}
```

`src/components/AirportCard/AirportCard.module.css`:

```css
.card { display: flex; flex-direction: column; border-radius: var(--radius); background: var(--card); box-shadow: var(--shadow); overflow: hidden; }
.arrival { flex-direction: column-reverse; }
.photo { min-height: 130px; position: relative; background: var(--bg); }
.info { display: flex; gap: 12px; padding: 14px; }
.left, .right { flex: 1; min-width: 0; }
.left h1, .right h1 { font-size: 35px; margin: 0; }
.left p, .right p { margin: 2px 0; font-size: 12px; }
.divider { border: 0; border-top: 1px solid var(--bg); margin: 10px 0; }
```

`src/components/FlightView/FlightView.tsx`:

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import { deriveStatus } from '@/lib/flight/status'
import { flightProgress } from '@/lib/flight/progress'
import { bestUtc, delayMinutes, formatDuration } from '@/lib/flight/time'
import type { Flight } from '@/lib/flight/types'
import { AirportCard } from '../AirportCard/AirportCard'
import { FlightPath } from '../FlightPath/FlightPath'
import { StatusBanner } from '../StatusBanner/StatusBanner'
import styles from './FlightView.module.css'

interface Props {
  flight: Flight
  now: Date
  departurePhoto: ReactNode
  arrivalPhoto: ReactNode
  departureWeather: ReactNode
  arrivalWeather: ReactNode
}

export function FlightView({ flight, now, departurePhoto, arrivalPhoto, departureWeather, arrivalWeather }: Props) {
  const status = deriveStatus(flight, now)
  const depTime = Date.parse(bestUtc(flight.departure) ?? '')
  const countdown =
    (status === 'scheduled' || status === 'delayed') && !Number.isNaN(depTime) && depTime > now.getTime()
      ? formatDuration(depTime - now.getTime())
      : null
  const bannerDelay = status === 'landed' ? delayMinutes(flight.arrival) : delayMinutes(flight.departure)

  return (
    <main className={styles.page}>
      <div className={styles.banner}>
        <StatusBanner status={status} delayMinutes={bannerDelay} />
      </div>
      <div className={styles.grid}>
        <AirportCard role="departure" endpoint={flight.departure} photo={departurePhoto} weather={departureWeather} />
        <FlightPath
          progress={flightProgress(flight, now)}
          status={status}
          countdown={countdown}
          flightNumber={flight.number}
          airline={flight.airlineName}
          aircraft={flight.aircraftModel}
        />
        <AirportCard role="arrival" endpoint={flight.arrival} photo={arrivalPhoto} weather={arrivalWeather} />
      </div>
      <Link href="/" className={`button ${styles.back}`}>Check another flight</Link>
    </main>
  )
}
```

`src/components/FlightView/FlightView.module.css`:

```css
.page { max-width: 600px; margin: 0 auto; padding: 16px; display: grid; gap: 16px; }
.banner { display: flex; justify-content: center; }
.grid { display: grid; gap: 16px; }
.back { justify-self: center; }
```

- [ ] **Step 6: The flight page and error pages**

`src/app/flight/[flightIata]/page.tsx`:

```tsx
import { ErrorState } from '@/components/ErrorState/ErrorState'
import { FlightView } from '@/components/FlightView/FlightView'
import { pickFlight } from '@/lib/flight/match'
import { getFlightDetails } from '@/lib/providers/aerodatabox'
import { parseDate, parseFlightNumber, parseIata } from '@/lib/validate'

interface Props {
  params: Promise<{ flightIata: string }>
  searchParams: Promise<{ date?: string; dep?: string; arr?: string }>
}

export default async function FlightPage({ params, searchParams }: Props) {
  const { flightIata } = await params
  const sp = await searchParams
  const now = new Date()

  const number = parseFlightNumber(decodeURIComponent(flightIata))
  if (!number.ok) return <ErrorState error={number.error} />

  let date: string | undefined
  if (sp.date) {
    const d = parseDate(sp.date)
    if (!d.ok) return <ErrorState error={d.error} />
    date = d.data
  }
  const dep = sp.dep ? parseIata(sp.dep) : undefined
  const arr = sp.arr ? parseIata(sp.arr) : undefined
  if (dep && !dep.ok) return <ErrorState error={dep.error} />
  if (arr && !arr.ok) return <ErrorState error={arr.error} />

  const res = await getFlightDetails(number.data, { date })
  if (!res.ok) return <ErrorState error={res.error} />

  const flight = pickFlight(res.data, { dep: dep?.ok ? dep.data : undefined, arr: arr?.ok ? arr.data : undefined, date, now })
  if (!flight) {
    return <ErrorState variant="unconfirmed" error={{ kind: 'not_found', provider: 'match', message: 'No matching entry' }} />
  }

  return (
    <FlightView
      flight={flight}
      now={now}
      departurePhoto={null}
      arrivalPhoto={null}
      departureWeather={null}
      arrivalWeather={null}
    />
  )
}
```

`src/app/error.tsx`:

```tsx
'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '20vh 16px', textAlign: 'center', display: 'grid', gap: 16, justifyItems: 'center' }}>
      <h1 style={{ fontSize: 28 }}>Something went wrong</h1>
      <p style={{ fontSize: 15, margin: 0 }}>An unexpected error happened. You can try again.</p>
      <button className="button" onClick={reset}>Try again</button>
    </main>
  )
}
```

`src/app/global-error.tsx`:

```tsx
'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '20vh 16px', background: '#d9d9d9', color: '#231f20' }}>
        <h1>Something went wrong</h1>
        <p>Please reload the page.</p>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  )
}
```

`src/app/not-found.tsx`:

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '20vh 16px', textAlign: 'center', display: 'grid', gap: 16, justifyItems: 'center' }}>
      <h1 style={{ fontSize: 28 }}>Page not found</h1>
      <p style={{ fontSize: 15, margin: 0 }}>That page doesn’t exist.</p>
      <Link href="/" className="button">Back to search</Link>
    </main>
  )
}
```

- [ ] **Step 7: Verify in the browser with mock data**

Run: `USE_MOCK_DATA=true npm run dev`, then open each URL and check:

- `http://localhost:3000/flight/AA100` → "In the air", moving plane
- `/flight/BA117` → "Scheduled", "Departs in …"
- `/flight/LH400` → "Landed", plane at the end
- `/flight/DL1` → "Cancelled", no plane
- `/flight/AF11` → "Diverted"
- `/flight/UA900` → "Delayed · 45 min late"
- `/flight/ER404` and `/flight/ER429` → friendly error pages
- `/flight/ZZ999` → "No flight found"; `/flight/nope` → "Check your search"
- `/flight/AA100?dep=LAX` → "We couldn't confirm this flight"

Expected: all behave as listed. Stop the server, then run `npm test && npm run build`. Expected: PASS and a successful build.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: add flight page with status states, error pages and core components" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Streaming weather and photos with per-card fallbacks

**Files:**
- Create: `src/components/AirportPhoto/AirportPhoto.tsx` (+ css), `src/components/WeatherCard/WeatherCard.tsx` (+ css, `WeatherCard.test.tsx`)
- Modify: `src/app/flight/[flightIata]/page.tsx`

**Interfaces:**
- Consumes: `getWeather`, `getAirportPhoto`, `DEFAULT_AIRPORT_PHOTO`, `Weather`, `Unavailable`
- Produces:
  - `<WeatherView result: Result<Weather> />` (pure, testable)
  - `<WeatherCard lat: number | null; lon: number | null />` (async server component; renders `<WeatherView>`)
  - `<AirportPhoto city: string />` (async server component; falls back to the default photo on any error)

- [ ] **Step 1: Write the failing test**

`src/components/WeatherCard/WeatherCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WeatherView } from './WeatherView'

describe('WeatherView', () => {
  it('shows both temperature units and the condition', () => {
    render(<WeatherView result={{ ok: true, data: { tempC: 20, tempF: 68, condition: 'Clouds', iconUrl: 'https://x.test/i.png' } }} />)
    expect(screen.getByText(/20°C/)).toBeInTheDocument()
    expect(screen.getByText(/68°F/)).toBeInTheDocument()
    expect(screen.getByText('Clouds')).toBeInTheDocument()
  })

  it('shows an unavailable note on failure', () => {
    render(<WeatherView result={{ ok: false, error: { kind: 'provider_down', provider: 'w', message: 'x' } }} />)
    expect(screen.getByText(/weather unavailable/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/WeatherCard`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/components/WeatherCard/WeatherView.tsx`:

```tsx
import type { Weather } from '@/lib/flight/types'
import type { Result } from '@/lib/result'
import { Unavailable } from '../Unavailable/Unavailable'
import styles from './WeatherCard.module.css'

export function WeatherView({ result }: { result: Result<Weather> }) {
  if (!result.ok) {
    return <p className={styles.weather}><Unavailable>Weather unavailable</Unavailable></p>
  }
  const w = result.data
  return (
    <p className={styles.weather}>
      <span>{w.tempC}°C / {w.tempF}°F</span>
      <img src={w.iconUrl} alt="" width={18} height={18} />
      <span>{w.condition}</span>
    </p>
  )
}
```

`src/components/WeatherCard/WeatherCard.tsx`:

```tsx
import { getWeather } from '@/lib/providers/weather'
import { fail } from '@/lib/result'
import { WeatherView } from './WeatherView'

export async function WeatherCard({ lat, lon }: { lat: number | null; lon: number | null }) {
  const result =
    lat === null || lon === null ? fail('not_found', 'weather', 'No coordinates') : await getWeather(lat, lon)
  return <WeatherView result={result} />
}
```

`src/components/WeatherCard/WeatherCard.module.css`:

```css
.weather { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 12px; flex-wrap: wrap; }
```

`src/components/AirportPhoto/AirportPhoto.tsx`:

```tsx
import { DEFAULT_AIRPORT_PHOTO, getAirportPhoto } from '@/lib/providers/photos'
import styles from './AirportPhoto.module.css'

export async function AirportPhoto({ city }: { city: string }) {
  const res = await getAirportPhoto(city)
  const url = res.ok ? res.data : DEFAULT_AIRPORT_PHOTO
  return <div className={styles.photo} style={{ backgroundImage: `url(${url})` }} role="img" aria-label={`${city}`} />
}

export function AirportPhotoSkeleton() {
  return <div className={`${styles.photo} ${styles.skeleton}`} aria-hidden="true" />
}
```

`src/components/AirportPhoto/AirportPhoto.module.css`:

```css
.photo { position: absolute; inset: 0; background-size: cover; background-position: center; animation: fade 0.5s; }
.skeleton { background: var(--bg); animation: none; }
@keyframes fade { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .photo { animation: none; } }
```

In `WeatherCard.module.css` nothing else is needed. In `src/components/WeatherCard/WeatherCard.test.tsx` the import `./WeatherView` matches the file created above.

- [ ] **Step 4: Wire the slots into the page with Suspense**

In `src/app/flight/[flightIata]/page.tsx` add imports:

```tsx
import { Suspense } from 'react'
import { AirportPhoto, AirportPhotoSkeleton } from '@/components/AirportPhoto/AirportPhoto'
import { WeatherCard } from '@/components/WeatherCard/WeatherCard'
```

Replace the final `return <FlightView ... />` with:

```tsx
  const { departure, arrival } = flight
  return (
    <FlightView
      flight={flight}
      now={now}
      departurePhoto={
        <Suspense fallback={<AirportPhotoSkeleton />}>
          <AirportPhoto city={departure.airport.city} />
        </Suspense>
      }
      arrivalPhoto={
        <Suspense fallback={<AirportPhotoSkeleton />}>
          <AirportPhoto city={arrival.airport.city} />
        </Suspense>
      }
      departureWeather={
        <Suspense fallback={<p>Loading weather…</p>}>
          <WeatherCard lat={departure.airport.lat} lon={departure.airport.lon} />
        </Suspense>
      }
      arrivalWeather={
        <Suspense fallback={<p>Loading weather…</p>}>
          <WeatherCard lat={arrival.airport.lat} lon={arrival.airport.lon} />
        </Suspense>
      }
    />
  )
```

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run && USE_MOCK_DATA=true npm run build`
Expected: tests PASS, build succeeds.

Manual check: `USE_MOCK_DATA=true npm run dev` → `/flight/AA100` shows a photo and "18°C / 64°F" on both cards. Then run with `USE_MOCK_DATA=` (empty) and no keys set: the page should still show the main error for AeroDataBox (`misconfigured`, shown as "Something went wrong on our side"). To see the per-card fallback, temporarily set only `RAPIDAPI_KEY` in `.env.local` and open a real flight: weather shows "Weather unavailable" while the rest of the page works.

```bash
git add src
git commit -m "feat: stream weather and photos with per-card fallbacks" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Search form, route results list and home page

**Files:**
- Create: `src/components/AutocompleteField/AutocompleteField.tsx` (+ css, test), `src/components/SearchForm/SearchForm.tsx` (+ css, test), `src/components/FlightList/FlightList.tsx` (+ css), `src/app/search/page.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `Suggestion` (type), `parseIata`, `parseAirlineCode`, `parseFlightNumber`, `parseDate`, `searchLiveFlights`, `userMessage`, `LiveFlightSummary`
- Produces:
  - `<AutocompleteField label: string; endpoint: '/api/airports' | '/api/airlines'; placeholder: string; onSelect: (code: string | null) => void; error?: string />`: accessible combobox; calls `onSelect(code)` when a suggestion is chosen or a valid typed code is entered on blur, `onSelect(null)` when the text changes
  - `<SearchForm />`: tabs "By route" / "By flight number"; navigates to `/search?dep=&arr=&airline=` or `/flight/<number>?date=`
  - `<FlightList flights: LiveFlightSummary[] />`

- [ ] **Step 1: Write the failing AutocompleteField test**

`src/components/AutocompleteField/AutocompleteField.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AutocompleteField } from './AutocompleteField'

const suggestions = [
  { code: 'JFK', label: 'JFK · New York', detail: 'John F. Kennedy International, United States' },
  { code: 'LGA', label: 'LGA · New York', detail: 'LaGuardia, United States' },
]

afterEach(() => vi.unstubAllGlobals())

function setup() {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(suggestions)))))
  const onSelect = vi.fn()
  render(<AutocompleteField label="Departure airport" endpoint="/api/airports" placeholder="From" onSelect={onSelect} />)
  return { onSelect, user: userEvent.setup() }
}

describe('AutocompleteField', () => {
  it('is a labelled combobox that lists suggestions', async () => {
    const { user } = setup()
    await user.type(screen.getByRole('combobox', { name: 'Departure airport' }), 'new')
    expect(await screen.findAllByRole('option')).toHaveLength(2)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true')
  })

  it('selects with the keyboard (arrows + Enter)', async () => {
    const { user, onSelect } = setup()
    await user.type(screen.getByRole('combobox'), 'new')
    await screen.findAllByRole('option')
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenLastCalledWith('LGA')
    expect(screen.getByRole('combobox')).toHaveValue('LGA · New York')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('closes on Escape and selects with the mouse', async () => {
    const { user, onSelect } = setup()
    await user.type(screen.getByRole('combobox'), 'new')
    await screen.findAllByRole('option')
    await user.keyboard('{Escape}')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    await user.clear(screen.getByRole('combobox'))
    await user.type(screen.getByRole('combobox'), 'new')
    await user.click((await screen.findAllByRole('option'))[0])
    expect(onSelect).toHaveBeenLastCalledWith('JFK')
  })

  it('accepts a typed code on blur when suggestions are unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    const onSelect = vi.fn()
    render(<AutocompleteField label="Departure airport" endpoint="/api/airports" placeholder="From" onSelect={onSelect} />)
    const user = userEvent.setup()
    await user.type(screen.getByRole('combobox'), 'jfk')
    await user.tab()
    expect(onSelect).toHaveBeenLastCalledWith('JFK')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/AutocompleteField`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement AutocompleteField**

`src/components/AutocompleteField/AutocompleteField.tsx`:

```tsx
'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { Suggestion } from '@/lib/autocomplete'
import styles from './AutocompleteField.module.css'

interface Props {
  label: string
  endpoint: '/api/airports' | '/api/airlines'
  placeholder: string
  onSelect: (code: string | null) => void
  error?: string
}

const CODE_PATTERN = { '/api/airports': /^[A-Za-z]{3}$/, '/api/airlines': /^[A-Za-z0-9]{2}$/ }

export function AutocompleteField({ label, endpoint, placeholder, onSelect, error }: Props) {
  const id = useId()
  const listId = `${id}-list`
  const [text, setText] = useState('')
  const [items, setItems] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [unavailable, setUnavailable] = useState(false)
  const skipFetch = useRef(false)
  const selected = useRef(false)

  useEffect(() => {
    if (skipFetch.current) {
      skipFetch.current = false
      return
    }
    if (text.trim().length < 2) {
      setItems([])
      setOpen(false)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(text.trim())}`, { signal: controller.signal })
        if (!res.ok) throw new Error('bad status')
        setItems(await res.json())
        setUnavailable(false)
        setOpen(true)
        setActive(-1)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setItems([])
          setUnavailable(true)
        }
      }
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [text, endpoint])

  function choose(item: Suggestion) {
    skipFetch.current = true
    selected.current = true
    setText(item.label)
    setItems([])
    setOpen(false)
    setActive(-1)
    onSelect(item.code)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (items.length) { setOpen(true); setActive((a) => Math.min(a + 1, items.length - 1)) }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && open && active >= 0) {
      e.preventDefault()
      choose(items[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function onBlur() {
    window.setTimeout(() => setOpen(false), 150)
    if (!selected.current && CODE_PATTERN[endpoint].test(text.trim())) {
      onSelect(text.trim().toUpperCase())
    }
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          selected.current = false
          setText(e.target.value)
          onSelect(null)
        }}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      <ul id={listId} role="listbox" className={styles.list} hidden={!(open && items.length > 0)}>
        {items.map((item, i) => (
          <li
            key={item.code}
            id={`${id}-opt-${i}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? styles.active : undefined}
            onMouseDown={(e) => { e.preventDefault(); choose(item) }}
          >
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </li>
        ))}
      </ul>
      {unavailable && <p role="status" className={styles.note}>Suggestions unavailable. Type the code instead.</p>}
      {error && <p id={`${id}-err`} role="alert" className={styles.error}>{error}</p>}
    </div>
  )
}
```

`src/components/AutocompleteField/AutocompleteField.module.css`:

```css
.field { position: relative; display: grid; gap: 4px; text-align: left; }
.field label { font-size: 12px; }
.field input { font: inherit; font-size: 15px; padding: 10px 0; border: 0; border-bottom: 1px solid #231f203a; background: transparent; color: var(--ink); text-align: center; transition: border-color 1s; }
.field input:focus { border-bottom-color: #231f209f; outline: none; }
.field input:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.list { position: absolute; z-index: 5; top: 100%; left: 0; right: 0; margin: 4px 0 0; padding: 0; list-style: none; max-height: 300px; overflow: auto; background: var(--card); border-radius: 10px; box-shadow: 0 5px 12px 0 #7171717a, 0 15px 10px 0 #4444442e; }
.list li { display: grid; padding: 12px 16px; border-bottom: 1px solid #231f2087; cursor: pointer; }
.list li:last-child { border-bottom: 0; }
.list li span { font-size: 11px; }
.active { background: var(--bg); }
.note { margin: 0; font-size: 11px; }
.error { margin: 0; font-size: 12px; font-weight: 600; }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/components/AutocompleteField`
Expected: PASS.

- [ ] **Step 5: Write the failing SearchForm test**

`src/components/SearchForm/SearchForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

import { SearchForm } from './SearchForm'

beforeEach(() => {
  push.mockClear()
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('[]'))))
})

describe('SearchForm', () => {
  it('shows inline errors and does not navigate when the route form is empty', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(3)
    expect(push).not.toHaveBeenCalled()
  })

  it('navigates by route using typed codes', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    await user.type(screen.getByRole('combobox', { name: /departure/i }), 'jfk')
    await user.tab()
    await user.type(screen.getByRole('combobox', { name: /arrival/i }), 'lax')
    await user.tab()
    await user.type(screen.getByRole('combobox', { name: /airline/i }), 'aa')
    await user.tab()
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(push).toHaveBeenCalledWith('/search?dep=JFK&arr=LAX&airline=AA')
  })

  it('navigates by flight number with an optional date', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    await user.click(screen.getByRole('tab', { name: /flight number/i }))
    await user.type(screen.getByLabelText(/flight number/i), 'aa 123')
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(push).toHaveBeenCalledWith('/flight/AA123')
    await user.type(screen.getByLabelText(/date/i), '2026-10-05')
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(push).toHaveBeenLastCalledWith('/flight/AA123?date=2026-10-05')
  })

  it('rejects a malformed flight number inline', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    await user.click(screen.getByRole('tab', { name: /flight number/i }))
    await user.type(screen.getByLabelText(/flight number/i), 'xx')
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/flight number/i)
    expect(push).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: Run to verify failure**

Run: `npx vitest run src/components/SearchForm`
Expected: FAIL (module not found).

- [ ] **Step 7: Implement SearchForm**

`src/components/SearchForm/SearchForm.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { parseDate, parseFlightNumber } from '@/lib/validate'
import { AutocompleteField } from '../AutocompleteField/AutocompleteField'
import styles from './SearchForm.module.css'

type Tab = 'route' | 'number'
type Errors = Partial<Record<'dep' | 'arr' | 'airline' | 'number' | 'date', string>>

export function SearchForm() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('route')
  const [dep, setDep] = useState<string | null>(null)
  const [arr, setArr] = useState<string | null>(null)
  const [airline, setAirline] = useState<string | null>(null)
  const [number, setNumber] = useState('')
  const [date, setDate] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  function submitRoute() {
    const next: Errors = {}
    if (!dep) next.dep = 'Choose a departure airport'
    if (!arr) next.arr = 'Choose an arrival airport'
    if (!airline) next.airline = 'Choose an airline'
    if (dep && arr && dep === arr) next.arr = 'Arrival must differ from departure'
    setErrors(next)
    if (Object.keys(next).length === 0) router.push(`/search?dep=${dep}&arr=${arr}&airline=${airline}`)
  }

  function submitNumber() {
    const next: Errors = {}
    const parsed = parseFlightNumber(number)
    if (!parsed.ok) next.number = 'Enter a valid flight number, like AA123'
    if (date) {
      const d = parseDate(date)
      if (!d.ok) next.date = 'Enter a valid date'
    }
    setErrors(next)
    if (Object.keys(next).length === 0 && parsed.ok) {
      router.push(`/flight/${parsed.data}${date ? `?date=${date}` : ''}`)
    }
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (tab === 'route') submitRoute()
        else submitNumber()
      }}
    >
      <div role="tablist" aria-label="Search type" className={styles.tabs}>
        <button type="button" role="tab" aria-selected={tab === 'route'} onClick={() => { setTab('route'); setErrors({}) }}>By route</button>
        <button type="button" role="tab" aria-selected={tab === 'number'} onClick={() => { setTab('number'); setErrors({}) }}>By flight number</button>
      </div>

      {tab === 'route' ? (
        <div role="tabpanel" className={styles.fields}>
          <AutocompleteField label="Departure airport" endpoint="/api/airports" placeholder="From (city or code)" onSelect={setDep} error={errors.dep} />
          <AutocompleteField label="Arrival airport" endpoint="/api/airports" placeholder="To (city or code)" onSelect={setArr} error={errors.arr} />
          <AutocompleteField label="Airline" endpoint="/api/airlines" placeholder="Airline (name or code)" onSelect={setAirline} error={errors.airline} />
          <p className={styles.hint}>Route search shows flights that are in the air right now.</p>
        </div>
      ) : (
        <div role="tabpanel" className={styles.fields}>
          <div className={styles.field}>
            <label htmlFor="flight-number">Flight number</label>
            <input id="flight-number" value={number} placeholder="AA123" autoComplete="off" onChange={(e) => setNumber(e.target.value)} aria-invalid={errors.number ? true : undefined} />
            {errors.number && <p role="alert" className={styles.error}>{errors.number}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="flight-date">Date (optional)</label>
            <input id="flight-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={errors.date ? true : undefined} />
            {errors.date && <p role="alert" className={styles.error}>{errors.date}</p>}
          </div>
          <p className={styles.hint}>Works for past, current and upcoming flights.</p>
        </div>
      )}

      <button type="submit" className="button">Search</button>
    </form>
  )
}
```

`src/components/SearchForm/SearchForm.module.css`:

```css
.form { display: grid; gap: 20px; width: 100%; max-width: 420px; margin: 0 auto; }
.tabs { display: flex; gap: 8px; justify-content: center; }
.tabs button { font: inherit; font-size: 13px; padding: 8px 14px; border: 1px solid var(--ink); border-radius: 999px; background: transparent; color: var(--ink); cursor: pointer; }
.tabs button[aria-selected='true'] { background: var(--ink); color: var(--bg); }
.fields { display: grid; gap: 22px; }
.field { display: grid; gap: 4px; }
.field label { font-size: 12px; }
.field input { font: inherit; font-size: 15px; padding: 10px 0; border: 0; border-bottom: 1px solid #231f203a; background: transparent; color: var(--ink); text-align: center; }
.hint { margin: 0; font-size: 11px; text-align: center; }
.error { margin: 0; font-size: 12px; font-weight: 600; }
```

- [ ] **Step 8: Run to verify SearchForm passes**

Run: `npx vitest run src/components/SearchForm`
Expected: PASS.

- [ ] **Step 9: FlightList, search page and home page**

`src/components/FlightList/FlightList.tsx`:

```tsx
import Link from 'next/link'
import type { LiveFlightSummary } from '@/lib/flight/types'
import styles from './FlightList.module.css'

export function FlightList({ flights }: { flights: LiveFlightSummary[] }) {
  return (
    <ul className={styles.list}>
      {flights.map((f) => {
        const params = new URLSearchParams()
        if (f.depIata) params.set('dep', f.depIata)
        if (f.arrIata) params.set('arr', f.arrIata)
        return (
          <li key={f.flightIata}>
            <Link href={`/flight/${f.flightIata}?${params.toString()}`}>
              <strong>{f.flightIata}</strong>
              <span>{f.depIata ?? '—'} → {f.arrIata ?? '—'}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
```

`src/components/FlightList/FlightList.module.css`:

```css
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.list a { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; border-radius: var(--radius); background: var(--card); box-shadow: var(--shadow); font-size: 15px; }
.list a:hover { background: #f4f4f4; }
.list strong { font-size: 25px; font-weight: 400; }
```

`src/app/search/page.tsx`:

```tsx
import Link from 'next/link'
import { ErrorState } from '@/components/ErrorState/ErrorState'
import { FlightList } from '@/components/FlightList/FlightList'
import { searchLiveFlights } from '@/lib/providers/airlabs'

interface Props {
  searchParams: Promise<{ dep?: string; arr?: string; airline?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams
  const res = await searchLiveFlights({ dep: sp.dep ?? '', arr: sp.arr ?? '', airline: sp.airline ?? '' })

  if (!res.ok && res.error.kind === 'not_found') {
    return (
      <main style={{ maxWidth: 480, margin: '0 auto', padding: '20vh 16px', textAlign: 'center', display: 'grid', gap: 16, justifyItems: 'center' }}>
        <h1 style={{ fontSize: 28 }}>No flights in the air</h1>
        <p style={{ fontSize: 15, margin: 0 }}>
          Route search only shows flights that are airborne right now. Check the airports and airline, or look up a
          specific flight by its number, which also works for past and upcoming flights.
        </p>
        <Link href="/" className="button">Search again</Link>
      </main>
    )
  }
  if (!res.ok) return <ErrorState error={res.error} />

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: 16, display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: 28 }}>{res.data.length} flight{res.data.length === 1 ? '' : 's'} in the air</h1>
      <FlightList flights={res.data} />
      <Link href="/" className="button" style={{ justifySelf: 'center' }}>Search again</Link>
    </main>
  )
}
```

`src/app/page.tsx` (replace):

```tsx
import { SearchForm } from '@/components/SearchForm/SearchForm'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 24, padding: '32px 16px', textAlign: 'center' }}>
      <img src="/wheels-app-logo.gif" alt="" style={{ maxHeight: 150 }} />
      <img src="/wa-logotype.svg" alt="Wheels App" style={{ maxWidth: 200 }} />
      <SearchForm />
    </main>
  )
}
```

- [ ] **Step 10: Verify and commit**

Run: `npm test && USE_MOCK_DATA=true npm run build`
Expected: all tests PASS, build succeeds.

Manual check with `USE_MOCK_DATA=true npm run dev`:
- On `/`, route tab: type "jfk" and pick a suggestion by keyboard; same for LAX and "american"; Search → `/search?...` shows AA100 and AA2; click AA100 → flight page.
- Submit with empty fields → inline errors, no navigation.
- Flight number tab: `ba117` → flight page; add a date → still works or shows a clear message.
- Route with other airports → "No flights in the air" page.

```bash
git add src
git commit -m "feat: add search form, route results and home page" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Desktop layout, accessibility pass, E2E smoke test, README, deploy

**Files:**
- Modify: `src/components/FlightView/FlightView.module.css`, `src/components/AirportCard/AirportCard.module.css`, `src/components/FlightPath/FlightPath.module.css`
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`, `README.md`

- [ ] **Step 1: Desktop layout**

Append to `src/components/FlightView/FlightView.module.css`:

```css
@media (min-width: 900px) {
  .page { max-width: 1100px; padding: 32px 24px; }
  .grid { grid-template-columns: 1fr minmax(240px, 300px) 1fr; align-items: center; gap: 24px; }
}
```

Append to `src/components/AirportCard/AirportCard.module.css`:

```css
@media (min-width: 900px) {
  .arrival { flex-direction: column; }
  .photo { min-height: 220px; }
}
```

(On desktop both cards show the photo on top so the two sides mirror each other.)

- [ ] **Step 2: Playwright config and smoke test**

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:3100' },
  webServer: {
    command: 'USE_MOCK_DATA=true npx next dev -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
```

`e2e/smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('route search → pick a flight → flight page', async ({ page }) => {
  await page.goto('/search?dep=JFK&arr=LAX&airline=AA')
  await expect(page.getByRole('heading', { name: /2 flights in the air/i })).toBeVisible()
  await page.getByRole('link', { name: /AA100/ }).click()
  await expect(page).toHaveURL(/\/flight\/AA100/)
  await expect(page.getByRole('status')).toContainText('In the air')
  await expect(page.getByRole('heading', { name: 'AA100' })).toBeVisible()
})

test('flight number search from the home page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /flight number/i }).click()
  await page.getByLabel('Flight number').fill('LH400')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByRole('status')).toContainText('Landed')
})

test('an unknown flight shows a friendly message, not a crash', async ({ page }) => {
  await page.goto('/flight/ZZ999')
  await expect(page.getByRole('heading', { name: 'No flight found' })).toBeVisible()
  await page.getByRole('link', { name: /search again/i }).click()
  await expect(page).toHaveURL('/')
})
```

Run:

```bash
npx playwright install chromium
npm run e2e
```

Expected: 3 tests PASS. If a selector fails because of an actual UI difference, fix the UI or the selector so both agree: do not weaken the assertion.

- [ ] **Step 3: Accessibility and layout pass (manual)**

With `USE_MOCK_DATA=true npm run dev`:
1. Keyboard only: Tab through `/` (tabs, fields, Search) and `/flight/AA100` (Check another flight). Every control reachable, visible focus ring, autocomplete works with arrows/Enter/Escape.
2. Resize from 360 px to 1400 px: stacked below 900 px, three columns above; no horizontal scrollbar at 360 px.
3. In browser devtools enable "prefers-reduced-motion: reduce": the plane and photo do not animate.
4. Run Lighthouse (Accessibility) on `/` and `/flight/AA100`. Fix anything flagged below 95, such as missing `alt` text or low contrast. The `#c9c9c9` muted text on white is below WCAG AA contrast for important info; keep it only for "unavailable" placeholders, and make sure every unavailable value also has a visible label ("Gate: —").

- [ ] **Step 4: README**

`README.md`:

````markdown
# Wheels App 1.1

Look up any flight by route (live flights) or by flight number (past, live or upcoming). Built with Next.js (App Router), TypeScript and server-side API calls.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev
```

With `USE_MOCK_DATA=true` the app runs on fixtures (no keys, no API quota). Try `/flight/AA100` (in the air), `BA117` (scheduled), `LH400` (landed), `DL1` (cancelled), `AF11` (diverted), `UA900` (delayed), `ER404` (provider down), `ER429` (rate limited), or `/search?dep=JFK&arr=LAX&airline=AA`.

## Keys (server-only)

| Variable | Service |
|---|---|
| `AIRLABS_API_KEY` | AirLabs: live flights on a route |
| `RAPIDAPI_KEY` | AeroDataBox via RapidAPI: flight details for any date |
| `OPENWEATHER_API_KEY` | OpenWeatherMap |
| `UNSPLASH_ACCESS_KEY` | Unsplash |

Keys are read only on the server and never reach the browser.

## How errors are handled

Every provider call returns data or a typed error (`bad_input`, `not_found`, `rate_limited`, `provider_down`, `bad_data`, `misconfigured`). Weather and photos stream in separately, so if one fails only its card shows "unavailable".

## Scripts

`npm test` · `npm run e2e` · `npm run build` · `node scripts/build-data.mjs` (regenerate airport/airline data)

## Notes

AeroDataBox's date range depends on your RapidAPI plan. Route search uses AirLabs and only finds flights that are in the air right now.
````

Add one sentence under Notes stating the date range you confirmed in Task 5, Step 8.

- [ ] **Step 5: Final verification**

```bash
npm test && npm run build && npm run e2e
```

Expected: all PASS. Then confirm no keys leak into the client bundle:

```bash
grep -rE "RAPIDAPI|AIRLABS|OPENWEATHER|UNSPLASH_ACCESS" .next/static || echo "no key names in client bundle"
```

Expected: `no key names in client bundle`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: desktop layout, e2e smoke tests and README" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Deploy (owner action, not automated)**

Tell the owner to: (1) `git push -u origin main`; (2) import the repo in Vercel; (3) add the four env vars (and leave `USE_MOCK_DATA` unset, or `true` for a keyless demo deployment); (4) deploy and open `/flight/<a real flight number>` to confirm. Do not push or deploy on the owner's behalf.
