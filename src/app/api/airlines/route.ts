import { NextResponse } from 'next/server'
import { searchAirlines } from '@/lib/autocomplete'

export function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? ''
  return NextResponse.json(searchAirlines(q.slice(0, 60)))
}
