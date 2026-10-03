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
  airports.push({ iata, name: String(a.name ?? '').trim(), city: String(a.city ?? '').trim(), country: String(a.country ?? '').trim() })
}

const airlines = []
const seenAirlines = new Set()
for (const a of airlinesRaw) {
  const iata = String(a.iata ?? '').toUpperCase()
  // digit-only strings are not valid IATA designators (need at least one letter)
  if (!/^[A-Z0-9]{2}$/.test(iata) || /^[0-9]{2}$/.test(iata) || a.active === 'N' || seenAirlines.has(iata)) continue
  seenAirlines.add(iata)
  airlines.push({ iata, name: String(a.name ?? '').trim(), country: String(a.country ?? '').trim() })
}

await mkdir('src/data', { recursive: true })
await writeFile('src/data/airports.json', JSON.stringify(airports))
await writeFile('src/data/airlines.json', JSON.stringify(airlines))
console.log(`airports: ${airports.length}, airlines: ${airlines.length}`)
