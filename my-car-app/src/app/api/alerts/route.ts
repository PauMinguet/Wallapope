import { createClient } from '@supabase/supabase-js'
import { getAuth } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

// Define subscription tier limits
const SUBSCRIPTION_LIMITS = {
  basic: 1,
  pro: 5,
  business: Infinity
}

export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  const { userId } = getAuth(request)
  
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // First get the user's data from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (userError) throw userError
    if (!userData) throw new Error('User not found')

    // Get all alerts for this user
    const { data: alerts, error: alertsError } = await supabase
      .from('alertas')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })

    if (alertsError) throw alertsError

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return new NextResponse('Error fetching alerts', { status: 500 })
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const { userId } = getAuth(request)
  
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // First get the user's data from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, subscription_tier, subscription_status, current_period_end')
      .eq('clerk_id', userId)
      .single()

    if (userError) throw userError
    if (!userData) throw new Error('User not found')

    // Check if subscription is active and not expired
    const isActive = userData.subscription_status === 'active' || userData.subscription_status === 'trialing'
    const isExpired = userData.current_period_end ? new Date(userData.current_period_end) < new Date() : true

    if (!isActive || isExpired) {
      return new NextResponse('Active subscription required', { status: 403 })
    }

    // Get current number of alerts
    const { count, error: countError } = await supabase
      .from('alertas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userData.id)

    if (countError) throw countError

    // Get limit based on subscription tier
    const limit = SUBSCRIPTION_LIMITS[userData.subscription_tier as keyof typeof SUBSCRIPTION_LIMITS] || 0
    const currentAlerts = count || 0

    // Check if user has reached their limit
    if (currentAlerts >= limit) {
      return new NextResponse(`Alert limit reached for ${userData.subscription_tier} tier`, { status: 403 })
    }

    const body = await request.json()
    // Remove any user-related fields from the body
    const { ...alertData } = body

    const { data, error } = await supabase
      .from('alertas')
      .insert({
        ...alertData,
        user_id: userData.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating alert:', error)
    return new NextResponse('Error creating alert', { status: 500 })
  }
}