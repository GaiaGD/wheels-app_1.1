import { NextResponse } from 'next/server'
import { searchAirports } from '@/lib/autocomplete'

export function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? ''
  return NextResponse.json(searchAirports(q.slice(0, 60)))
}
