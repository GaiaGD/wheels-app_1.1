# Wheels App 1.1

- **Demo (sample data): https://YOUR-DEMO-URL**: fixtures for every flight state, no API quota used. Start here.
- **Live data: https://YOUR-LIVE-URL**: connected to the real flight API. It runs on a free plan with a small monthly limit, so if it says it is running out of flight data, that is expected.

There are two deployments of the same code because they answer different questions. The live one shows the real integration, but it can't show failure states on demand and anyone's clicks use up the quota. The demo one runs in mock mode, so it is always available and every error state can be reproduced with one click.

Look up any flight by flight number (past, live or upcoming) or by route, and see it on a map with its great-circle route, the weather at both airports and a photo of each.

I first built this flight tracker in 2015 and rebuilt it in 2023. This is the third version, rebuilt in Next.js (App Router) with typed server-side data fetching, a map view and a real test suite.

## Features

- Search by flight number, or by route (departure airport, arrival airport, airline) with airport and airline autocomplete
- Full-screen MapLibre map with the great-circle route (safe across the date line), airport pins and a plane marker. When the provider returns no live position, the plane is placed from the flight's progress along the route and labelled "Estimated position"
- Status handling for scheduled, in-air, landed, delayed, diverted and cancelled flights
- Weather and an airport photo for both ends of the flight
- Friendly error states for missing flights, provider outages and rate limits (see Decisions)
- Responsive layout (cards at the bottom on phones, on the left on desktop) and full keyboard navigation

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, MapLibre GL, Zod, Vitest + Testing Library, Playwright. Data from AeroDataBox (flights), OpenWeather (weather) and Unsplash (photos), with a CARTO basemap. Deployed on Vercel.

## Try the error states

These links only work on the **demo** deployment, which runs on fixtures (the live-data site calls the real API and doesn't know these test flights):

| Flight | What you see |
|---|---|
| [AA100](https://YOUR-DEMO-URL/flight/AA100) | In the air |
| [BA117](https://YOUR-DEMO-URL/flight/BA117) | Scheduled |
| [LH400](https://YOUR-DEMO-URL/flight/LH400) | Landed |
| [UA900](https://YOUR-DEMO-URL/flight/UA900) | Delayed |
| [AF11](https://YOUR-DEMO-URL/flight/AF11) | Diverted |
| [DL1](https://YOUR-DEMO-URL/flight/DL1) | Cancelled |
| [ER404](https://YOUR-DEMO-URL/flight/ER404) | Provider down |
| [ER429](https://YOUR-DEMO-URL/flight/ER429) | Rate limited |
| [JFK → LAX, American](https://YOUR-DEMO-URL/search?dep=JFK&arr=LAX&airline=AA) | Route search |

## Decisions

- **API calls are server-side.** Keys are read only on the server and never reach the browser. Every provider response is validated with Zod before the UI sees it, so a changed or malformed payload becomes a handled error instead of a broken page.
- **Weather and photos stream separately from the flight.** Each sits in its own Suspense boundary. The flight card renders as soon as the flight data arrives, and a slow or failing weather or photo call only shows "unavailable" in its own card.
- **Typed errors instead of thrown exceptions.** Every provider call returns data or one of `bad_input`, `not_found`, `rate_limited`, `provider_down`, `bad_data`, `misconfigured`. The UI maps each one to a specific message, and the compiler forces every new error type to be handled.
- **Cache times follow how fast each thing changes, and what it costs.** Flight status is cached for 60 s, because it's the one thing a user expects to be fresh. Weather and departure boards are cached for 10 min, because they change slowly and boards are expensive. The airport time lookup is cached for 1 h and photos for 24 h, since both are effectively static. Every flight or board call uses part of a small monthly quota, so a short cache on the cheap, fast-changing data and a long one on the rest keeps the app useful without burning it.
- **Quota awareness.** The free AeroDataBox plan allows 400 units a month. When it runs out the app says it is running out of flight data instead of failing with a generic error.
- **Two deployments.** One Vercel project runs with real keys, and a second one from the same repo runs with `USE_MOCK_DATA=true`. Environment variables belong to the project, so two projects are the simplest way to serve both from `main`, with no branches to keep in sync. The demo is the one to share, since it can't run out of quota.
- **A mock mode.** `USE_MOCK_DATA=true` serves fixtures with a "Demo data" banner. This is what lets the app, the tests and the live demo run with no keys and no quota, and it makes every error state reproducible on demand.

## Testing

- **Unit and component tests (Vitest, 27 test files):** provider parsing and error mapping, input validation, route and status logic, great-circle geometry, and the UI components (flight view, status banner, map, search form, autocomplete, weather and photo cards, error states). Run with `npm test`.
- **End-to-end (Playwright, against mock mode):** searching by route and by flight number through to the flight page, an unknown flight showing a friendly message, keyboard-only use of the home page, reduced-motion behaviour, and layout checks at phone and desktop sizes (no horizontal overflow, map visible, cards clear of the status pill). Run with `npm run e2e`.

## Known limitations and roadmap

- Route search lists the last 24 hours of departures from the departure airport, filtered by arrival airport and airline. It does not show upcoming flights (search by flight number for those).
- Flight-number search depends on the date range of the RapidAPI plan. I haven't verified that range against a live key, to protect the monthly quota.
- Until the plan is confirmed to return a live `position`, the plane on the map is always an estimate.
- Next: update the plane position live (which means splitting the map setup from the marker, since the whole map is currently rebuilt when the position changes), and match the flight page's loading state to the full-screen map layout.

## How I use AI

I use Claude Code as a pair programmer, and the repo is set up for it: `CLAUDE.md` and `AGENTS.md` describe the project's conventions, and most commits are co-authored with Claude. I decide the architecture, the error model and what to build, and I write the specs for features. Claude writes much of the implementation and the tests, and I review the changes, run the test suite and check the result in the browser. One rule I gave it from the start: no real API calls without asking first, because of the free-tier quota.

## Performance and accessibility

Lighthouse (v12, mobile profile with default throttling) on a local production build in mock mode:

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Home | 63 | 96 | 96 | 100 |
| Flight page (AA100) | 45 | 95 | 96 | 100 |

Performance on the flight page is held back by the map: MapLibre and the basemap tiles are the heavy part, and I haven't optimised them yet.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev
```

Requires Node 20.9+. To run without any keys, use `USE_MOCK_DATA=true npm run dev`.

| Variable | Service |
|---|---|
| `RAPIDAPI_KEY` | AeroDataBox via RapidAPI (flights) |
| `OPENWEATHER_API_KEY` | OpenWeather |
| `UNSPLASH_ACCESS_KEY` | Unsplash |
| `USE_MOCK_DATA` | `true` serves fixtures (no API calls) |
| `USE_REAL_PHOTOS` | `true` fetches real Unsplash photos even in mock mode |

Other scripts: `npm run build` · `node scripts/build-data.mjs` (regenerate airport and airline data).

## Credits

Flight data by [AeroDataBox](https://aerodatabox.com) (via RapidAPI), weather by [OpenWeather](https://openweathermap.org), photos from [Unsplash](https://unsplash.com), and the basemap by [CARTO](https://carto.com) with data from [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. Attribution is shown in the app footer and in the map corner. The deployed site uses Google Analytics for visit counts.

## Maintenance

MapLibre's web worker is served from `public/maplibre/` (copies of `maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs` from `node_modules/maplibre-gl/dist`). Refresh them when upgrading maplibre-gl.
