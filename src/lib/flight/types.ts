export interface AirportInfo { iata: string | null; icao: string | null; name: string; city: string; countryCode: string | null; lat: number | null; lon: number | null }
export interface EndpointInfo { airport: AirportInfo; scheduledUtc: string | null; scheduledLocal: string | null; revisedUtc: string | null; revisedLocal: string | null; actualUtc: string | null; actualLocal: string | null; terminal: string | null; gate: string | null; checkInDesk: string | null }
export interface Flight { number: string; airlineName: string | null; airlineIata: string | null; aircraftModel: string | null; rawStatus: string | null; departure: EndpointInfo; arrival: EndpointInfo; position: { lat: number; lon: number } | null }
export interface LiveFlightSummary { flightIata: string; airlineIata: string | null; depIata: string | null; arrIata: string | null }
export interface Weather { tempC: number; tempF: number; condition: string; iconUrl: string }
