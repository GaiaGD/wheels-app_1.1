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

AeroDataBox's date range depends on your RapidAPI plan (date range not yet verified against a live key). Route search uses AirLabs and only finds flights that are in the air right now.
