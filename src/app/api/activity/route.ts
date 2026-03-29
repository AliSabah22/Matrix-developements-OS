import { NextRequest, NextResponse } from 'next/server'
import { getActivity } from '@/lib/db'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl
  const limitParam = searchParams.get('limit')

  let limit = 20
  if (limitParam !== null) {
    const parsed = parseInt(limitParam, 10)
    if (isNaN(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: 'limit must be a positive integer' },
        { status: 400 }
      )
    }
    limit = parsed
  }

  const activity = getActivity(limit)
  return NextResponse.json({ activity })
}
