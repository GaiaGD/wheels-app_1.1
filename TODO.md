# To do

- [ ] **Deploy to Vercel**: import the repo, add `RAPIDAPI_KEY`, `OPENWEATHER_API_KEY` and `UNSPLASH_ACCESS_KEY` (leave `USE_MOCK_DATA` unset or `false`), then open a real flight on the live site to check it.
- [ ] **README section for the job application**: short write-up of the architecture (server-side providers, `Result` type, streaming weather and photos) and the error handling.
- [ ] **Push to GitHub**: local commits on `main` since c898dab are not pushed yet (visual map, TODO).

## Map view (done on branch `map-view`, not merged yet)

Built: full-screen MapLibre map (CARTO Voyager, globe at low zoom), great-circle route safe across the date line, airport pins, plane marker (real position if the plan returns one, otherwise an estimate labelled "Estimated position"), floating compact cards, status pill and elapsed-path strip (see the README "Map" section).

Still open:
- [ ] Desktop path-strip placement (bottom-centre pill) and the "Check another flight" spot (bottom-right) are the owner's to tweak.
- [ ] Check whether the AeroDataBox plan returns a real `position`: needs the owner's go-ahead because it costs units (2 per call). Until then the plane is always an estimate.
- [ ] Merge `map-view` into `main` and push.
- [ ] When upgrading maplibre-gl, refresh `public/maplibre/*.mjs` (worker files).
- [ ] flight/[flightIata]/loading.tsx still uses the old centred layout (jump into the full-screen map).
- [ ] FlightMap rebuilds the whole map when the plane position changes: split before adding live updates.

Verification rules (still apply):
- Use mock mode only. No real AeroDataBox calls without asking (free plan: 400 units a month; flight status and boards cost 2 units, time lookup 1).
- Stop any dev server on port 3000 before running `npm run build` or `npm run e2e`.
