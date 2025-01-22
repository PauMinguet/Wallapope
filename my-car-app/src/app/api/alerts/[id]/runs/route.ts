import { createClient } from '@supabase/supabase-js'
import { getAuth } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export async function GET(request: NextRequest) {
  const { userId } = getAuth(request)
  const id = request.nextUrl.pathname.split('/')[3] // Get the alert ID from the URL
  
  if (!userId) {
    console.error('GET /api/alerts/[id]/runs - Unauthorized: No userId')
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // First get the user's data from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (userError) {
      console.error('GET /api/alerts/[id]/runs - User fetch error:', userError)
      throw userError
    }
    if (!userData) {
      console.error('GET /api/alerts/[id]/runs - User not found for clerk_id:', userId)
      throw new Error('User not found')
    }

    // Verify the alert belongs to the user
    const { data: alert, error: alertError } = await supabase
      .from('alertas')
      .select('user_id')
      .eq('id', id)
      .single()

    if (alertError) {
      console.error('GET /api/alerts/[id]/runs - Alert fetch error:', alertError)
      throw alertError
    }
    if (!alert) {
      console.error('GET /api/alerts/[id]/runs - Alert not found for id:', id)
      return new NextResponse('Alert not found', { status: 404 })
    }
    if (alert.user_id !== userData.id) {
      console.error('GET /api/alerts/[id]/runs - Unauthorized: alert.user_id !== userData.id', {
        alertUserId: alert.user_id,
        userDataId: userData.id
      })
      return new NextResponse('Unauthorized', { status: 403 })
    }

    // Get the alert runs
    const { data: runs, error: runsError } = await supabase
      .from('alert_runs')
      .select('*')
      .eq('alert_id', id)
      .order('created_at', { ascending: false })

    if (runsError) {
      console.error('GET /api/alerts/[id]/runs - Runs fetch error:', runsError)
      throw runsError
    }

    return NextResponse.json(runs || [])
  } catch (error) {
    console.error('GET /api/alerts/[id]/runs - Unhandled error:', error)
    return new NextResponse('Error fetching alert runs', { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { userId } = getAuth(request)
  const id = request.nextUrl.pathname.split('/')[3] // Get the alert ID from the URL
  
  if (!userId) {
    console.error('POST /api/alerts/[id]/runs - Unauthorized: No userId')
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // First get the user's data from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (userError) {
      console.error('POST /api/alerts/[id]/runs - User fetch error:', userError)
      throw userError
    }
    if (!userData) {
      console.error('POST /api/alerts/[id]/runs - User not found for clerk_id:', userId)
      throw new Error('User not found')
    }

    // Verify the alert belongs to the user
    const { data: alert, error: alertError } = await supabase
      .from('alertas')
      .select('user_id')
      .eq('id', id)
      .single()

    if (alertError) {
      console.error('POST /api/alerts/[id]/runs - Alert fetch error:', alertError)
      throw alertError
    }
    if (!alert) {
      console.error('POST /api/alerts/[id]/runs - Alert not found for id:', id)
      return new NextResponse('Alert not found', { status: 404 })
    }
    if (alert.user_id !== userData.id) {
      console.error('POST /api/alerts/[id]/runs - Unauthorized: alert.user_id !== userData.id', {
        alertUserId: alert.user_id,
        userDataId: userData.id
      })
      return new NextResponse('Unauthorized', { status: 403 })
    }

    const body = await request.json()

    // Create the alert run
    const { data: run, error: runError } = await supabase
      .from('alert_runs')
      .insert({
        alert_id: id,
        listings: body.listings || [],
        market_data: body.market_data || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (runError) {
      console.error('POST /api/alerts/[id]/runs - Run creation error:', runError)
      throw runError
    }

    return NextResponse.json(run)
  } catch (error) {
    console.error('POST /api/alerts/[id]/runs - Unhandled error:', error)
    return new NextResponse('Error creating alert run', { status: 500 })
  }
} 