import { NextRequest, NextResponse } from 'next/server'
import { getActivity } from '@/lib/db'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl
    const limitParam = searchParams.get('limit')

    let limit = DEFAULT_LIMIT
    if (limitParam !== null) {
      const parsed = parseInt(limitParam, 10)
      if (!isNaN(parsed) && parsed >= 1) {
        limit = Math.min(parsed, MAX_LIMIT)
      }
    }

    const activity = getActivity(limit)
    return NextResponse.json({ activity })
  } catch (error) {
    console.error('[activity]', error)
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 })
  }
}
