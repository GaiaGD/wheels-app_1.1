# To do

- [ ] **Deploy to Vercel**: import the repo, add `RAPIDAPI_KEY`, `OPENWEATHER_API_KEY` and `UNSPLASH_ACCESS_KEY` (leave `USE_MOCK_DATA` unset or `false`), then open a real flight on the live site to check it.
- [ ] **README section for the job application**: short write-up of the architecture (server-side providers, `Result` type, streaming weather and photos) and the error handling.
- [ ] **Push to GitHub**: local commits on `main` since c898dab are not pushed yet (visual map, TODO).

## Map view (paused 2026-10-06, pick up here)

Goal: the flight page becomes a full-screen map with the flight info floating on top. Nothing is built yet. Work on a new branch `map-view` off `main`.

Decisions so far:
- **Map fills the whole screen** (`100dvh`, no padding or max width) and is the page background.
- **Phone:** departure card at the top, arrival card at the bottom, map visible in between. Cards go compact (photo becomes a slim strip) or they would cover the map.
- **Desktop:** departure card on the left, arrival card on the right (NOT top/bottom). Where the path strip goes on desktop is not decided yet.
- **Keep the elapsed path** (`FlightPath`: flight number and moving plane). Proposed spot on phone: directly under the departure card.
- **Status pill** floats at the top; **"Check another flight"** floats at the bottom.
- **Map library:** Leaflet with CARTO's light "Voyager" tiles (free, no key, needs the tile credit in the map corner). Real Apple Maps (MapKit JS) needs a paid Apple Developer account, so skipped for now. Reference screen was a Mobbin link that blocks me (403): send a screenshot to match the colours.
- **Map content:** airport pins with their codes, a great-circle arc that is safe across the date line (LAX → NRT crosses it), and the plane at the flight's progress, rotated along its heading.
- **Plane position:** use `flight.position` from AeroDataBox if the plan returns one, otherwise estimate it from `flightProgress` and the airports' coordinates. The estimate must be labelled as an estimate. Do NOT check for a real position with a live call without asking (2 units).
- Load the map only in the browser (map libraries can't render on the server), in a client component.
- Pure geo maths (arc, point at fraction, bearing) goes in `src/lib/flight/geo.ts` with tests first.

Housekeeping before starting (uncommitted edits in the working tree):
- `src/lib/providers/photos.ts`: remove `console.log(res)` and the commented-out mock line. Replace it with an opt-in env var `USE_REAL_PHOTOS=true` that skips the photo mock, so mock mode can show real photos and the test "mock mode returns fixed data without fetching" passes again.
- `AirportCard.tsx` and `FlightView.tsx`: stray whitespace edits only, revert.
- `.env.local` needs `UNSPLASH_ACCESS_KEY` set to the Access Key (it was the Secret key before; check it now works).

Verification rules:
- Use mock mode only. No real AeroDataBox calls without asking (free plan: 400 units a month; flight status and boards cost 2 units, time lookup 1).
- Playwright must not call Unsplash: run its dev server with `UNSPLASH_ACCESS_KEY=` empty.
- The old e2e test that checks the departure and arrival cards sit side by side at 1280px must be rewritten (still left/right on desktop, top/bottom on phone).
- Stop any dev server on port 3000 before running `npm run build` or `npm run e2e`.
