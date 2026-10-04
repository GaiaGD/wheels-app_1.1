# Route search via AeroDataBox departure boards

## Why
AirLabs' live feed misses many real flights (it knew 1 of 7 LAX->NRT flights; NH8407 was absent).
AeroDataBox already powers flight-number search, and its airport departure board is far more complete.

## Endpoint
`GET https://aerodatabox.p.rapidapi.com/flights/airports/iata/{dep}/{fromLocal}/{toLocal}?direction=Departure&withLeg=true&withCancelled=true&withCodeshared=true&withCargo=false&withPrivate=false&withLocation=false`
- Times are `YYYY-MM-DDTHH:mm` in the LOCAL time of the departure airport; a window may be at most 12 h.
- Response: `{ departures: [...] }`; each item has `number`, `status`, `airline.iata`, `departure.scheduledTime`, `arrival.airport.iata`.
- Local time comes from `GET /airports/iata/{dep}/time/local` -> `{ time: { utc, local }, timeZoneId }`.
  Only the UTC offset in `time.local` is used; "now local" is computed from the current UTC clock plus that offset.

## Two windows
Two boards are fetched in parallel, each 11h59m: [now-23h58, now-11h59] and [now-11h59, now].
Results are merged, filtered to the requested arrival airport and airline, deduped by
number + scheduled departure UTC (the API returns some duplicates), and sorted newest first.
If either board (or the time lookup) fails, that error is returned; an incomplete list is never shown.
No match gives `not_found`. Only flights that departed in the last 24 hours are found; upcoming flights need flight-number search.

## Quota
Each route search = 3 API calls (2 boards + 1 time lookup), cached 60 s (boards) and 1 h (time lookup).

## Switching back
`git checkout build/v1` restores the AirLabs-based route search (needs `AIRLABS_API_KEY`).
