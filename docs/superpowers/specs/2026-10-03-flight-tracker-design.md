# Wheels App 1.1 — Design

Date: 2026-10-03
Predecessor: [wheels-app](https://github.com/GaiaGD/wheels-app) (React / Create React App, 2023). Original jQuery version: 2016.

## Goals

Rebuild wheels-app as a robust, secure, production-quality Next.js app that also serves as a portfolio piece (Next.js, SSR, streaming, error handling, accessibility, responsive design).

Priorities, in order:

1. **Robustness**: every failure mode is handled and surfaced clearly; no `alert()`, no crashes on bad or empty data.
2. **Security**: no API key ever reaches the browser.
3. **Feature completeness**: items left on the old to-do (hidden keys, error handling, more flights, desktop layout).
4. **Fidelity to the 2023 look**: same identity, refined. The owner is a designer and will tweak visuals later.

## Non-goals

- New visual identity (keep the 2023 look).
- Route search for non-live flights (AirLabs is live-only; AeroDataBox departure boards are a possible later addition).
- User accounts, saved flights, notifications.

## Stack

- Next.js (App Router), React 18+, TypeScript
- CSS Modules with design tokens as CSS variables (colors, spacing, type)
- zod for response validation
- Vitest + Testing Library; one Playwright smoke test
- Hosting: Vercel (server components and route handlers hold the keys)

## Routes

| Route | Purpose |
|---|---|
| `/` | Intro and search form. Two tabs: **Route** (departure, arrival, airline) and **Flight number** (code + optional date). |
| `/search?dep=&arr=&airline=` | Lists live flights matching the route (AirLabs). Each result links to its flight page. Replaces the old "take `response[0]`" behavior. |
| `/flight/[flightIata]?date=` | Server-rendered, shareable flight dashboard for any flight state (AeroDataBox). |
| `/api/airports`, `/api/airlines` | Autocomplete data. |

Airport and airline JSON is bundled in `src/data/` instead of fetched from third-party GitHub repos at runtime.

## Provider roles

- **AirLabs**: finds live flights for a route + airline. Output: a list of flight numbers. Live-only.
- **AeroDataBox (RapidAPI)**: details for a flight number, optionally on a date. Works for past, live and scheduled flights. Independent of AirLabs.
- **OpenWeatherMap**: weather at departure and arrival airports.
- **Unsplash**: city photo for each airport, with the existing default image as fallback.

Two entry points (route search, flight-number search) lead to the same flight page.

### Flight matching

AeroDataBox can return several entries for one flight number (different days or legs). The flight page selects the entry whose departure and arrival airports match the request (when known) and whose date is closest to now (or the requested date). If no entry matches cleanly, it renders a "couldn't confirm this flight" state, never guessed data. This replaces the old `dataObj[0]`.

Open item to verify early with the real key: AeroDataBox date-range limits (how far back/ahead) on the owner's RapidAPI plan.

## Architecture

```
src/
  app/
    page.tsx                  intro + search
    search/page.tsx           route results list
    flight/[flightIata]/page.tsx
    api/airports, api/airlines
    error.tsx, global-error.tsx, not-found.tsx (per route where useful)
  lib/
    providers/                airlabs, aerodatabox, weather, photos (server-only)
    result.ts                 Result / ProviderError types
    flight/                   matching, status derivation, progress calculation
  components/                 SearchForm, AirportPicker, FlightList, FlightHeader,
                              StatusBanner, AirportCard, WeatherCard, FlightPath,
                              Unavailable, ErrorState
  data/                       airports.json, airlines.json
```

The flight page awaits the core flight data (AeroDataBox). Weather and photos for both airports stream in separately with Suspense, so a failure in either affects only its own card.

## Flight states

The flight page handles: **Scheduled**, **In the air**, **Landed**, **Delayed**, **Cancelled**, **Diverted**. A `StatusBanner` shows the state; `FlightPath` adapts:

- Scheduled: countdown to departure, plane at origin.
- In the air: plane position from real timestamps (and live location when available).
- Landed: full path, actual vs scheduled times, delay or early arrival.
- Cancelled / diverted: clear banner, no fake progress.

## Error handling

Every provider function returns `Result<T, ProviderError>`; nothing throws into the UI. `ProviderError.kind`:

- `bad_input`: invalid flight number or airport code (validated before any API call)
- `not_found`: provider answered, no such flight or no matches
- `rate_limited`: quota exhausted
- `provider_down`: timeout, 5xx, network failure
- `bad_data`: response failed schema validation
- `misconfigured`: missing API key (logged server-side; generic message to users)

Rules:

- Each call has a timeout (~8 s) and one retry, only for `provider_down`.
- Short-lived caching protects free-tier quotas (about a minute for live flight data, longer for weather, long for photos).
- Main flight data fails → full error or not-found page with a path back to search.
- Weather or photo fails → only that card shows "unavailable"; photos fall back to the default image.
- Route search with no results → explanatory empty state (explains live-only behavior, suggests flight-number search).
- Form → inline, field-level validation before submit.
- Unexpected crashes → route `error.tsx` with reset; `global-error.tsx` as last resort.
- Server logs include error kind, provider and status, never API keys or full request URLs.

## UI

Keep: Work Sans, palette (`#231f20` text, `#c9c9c9` for unavailable values), logo and plane icon, the departure / flight path / arrival structure, city photos.

Change:

- Desktop layout: horizontal at wider screens (departure | path | arrival); mobile-first stack below the breakpoint.
- Real progress calculation from timestamps (the old code rounded to whole hours).
- Show actual/estimated times alongside scheduled, with delay in minutes.
- Accessibility: semantic buttons and links, full keyboard support in autocomplete, labelled inputs, alt text, visible focus, reduced-motion handling for the plane animation.

Bugs from the old code fixed by design:

- Arrival code fell back to the departure airport's ICAO.
- Dashboard crashed on empty data (`data[0]` unchecked).
- Relative asset paths broke on nested routes.
- Stale `console.log(formData)` after `setFormData`.
- Full API URLs, including keys, logged to the console.

## Configuration

Server-only env vars (no `NEXT_PUBLIC_` prefix): `AIRLABS_API_KEY`, `RAPIDAPI_KEY`, `OPENWEATHER_API_KEY`, `UNSPLASH_ACCESS_KEY`. Optional: `USE_MOCK_DATA`. `.env.example` is committed; `.env.local` is gitignored. The keys used by the old app were exposed in a public bundle and must be rotated, not reused. A startup check reports missing keys.

## Testing

- **Unit (Vitest):** provider layer with mocked responses for each error kind; flight matching; status derivation; progress calculation; form validation.
- **Component (Testing Library):** StatusBanner states, empty and error states, autocomplete keyboard behavior.
- **Mock mode** (`USE_MOCK_DATA=true`): fixture flights in every state and every error kind, for development without quota use and for always-working demos.
- **E2E smoke (Playwright):** search → pick → flight page, against mock mode.

## Build order

1. Scaffold Next.js + TypeScript, CSS variables, fonts/assets, Vercel project and env vars.
2. Provider layer: Result/error types, mock mode, tests. Verify real AeroDataBox behavior with the key.
3. Flight page for all states, with error and not-found pages.
4. Search: route tab with results list; flight-number tab with optional date.
5. Weather and photos streaming with per-card fallbacks.
6. Desktop layout, accessibility pass, README, deploy.

Each step leaves a runnable app.
