# Wheels App 1.1

Look up any flight by route (live flights) or by flight number (past, live or upcoming). Built with Next.js (App Router), TypeScript and server-side API calls.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev
```

Requires Node 20.9+ (22.12+ recommended; on 22.11 the Vitest DOM environment is happy-dom for that reason).

Mock mode is opt-in (`.env.example` defaults to `USE_MOCK_DATA=false`). Run `USE_MOCK_DATA=true npm run dev` to use fixtures (no keys, no API quota); every page then shows a "Demo data" banner. Try `/flight/AA100` (in the air), `BA117` (scheduled), `LH400` (landed), `DL1` (cancelled), `AF11` (diverted), `UA900` (delayed), `ER404` (provider down), `ER429` (rate limited), or `/search?dep=JFK&arr=LAX&airline=AA`.

In mock mode airport photos are a fixed default; set `USE_REAL_PHOTOS=true` in `.env.local` to fetch real Unsplash photos anyway.

## Keys (server-only)

| Variable | Service |
|---|---|
| `RAPIDAPI_KEY` | AeroDataBox via RapidAPI: flight details for any date (also route search) |
| `OPENWEATHER_API_KEY` | OpenWeatherMap |
| `UNSPLASH_ACCESS_KEY` | Unsplash |

Keys are read only on the server and never reach the browser.

## How errors are handled

Every provider call returns data or a typed error (`bad_input`, `not_found`, `rate_limited`, `provider_down`, `bad_data`, `misconfigured`). Weather and photos stream in separately, so if one fails only its card shows "unavailable".

## Map

The flight page is a full-screen [MapLibre GL](https://maplibre.org/) map on CARTO's free "Voyager" basemap (no key needed; tiles are credited to CARTO and OpenStreetMap in the map corner) with the flight cards in a panel on top (bottom of the screen on phones, left on desktop). It draws a great-circle route between the airports and a plane marker. The plane sits at the real position when AeroDataBox returns one; otherwise its place is estimated from the flight's progress along the route and the map labels it "Estimated position". There is no plane for cancelled or diverted flights. MapLibre's web worker is served from `public/maplibre/` (copies of `maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs` from `node_modules/maplibre-gl/dist`; refresh them when upgrading maplibre-gl).

## Scripts

`npm test` · `npm run e2e` · `npm run build` · `node scripts/build-data.mjs` (regenerate airport/airline data)

## Notes

AeroDataBox's date range depends on your RapidAPI plan (date range not yet verified against a live key). Route search lists the departure board of the departure airport (AeroDataBox) for the last 24 hours, filtered by arrival airport and airline; it does not show upcoming flights (search by flight number for those). Each route search uses up to 3 API calls (2 boards + 1 airport-time lookup), cached for 10 min (boards) and 1 h (time lookup). On the free RapidAPI plan (400 API units a month) the board and flight-status calls are Tier 2 (2 units each) and the time lookup is Tier 1 (1 unit), so a route search costs about 4-5 units and a flight page view 2 units; when the monthly limit is reached the app shows a "running out of flight data" message. AeroDataBox's terms require attribution, which the footer provides.
