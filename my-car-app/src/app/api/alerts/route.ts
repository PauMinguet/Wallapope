import { createClient } from '@supabase/supabase-js'
import { getAuth } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

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
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (userError) throw userError
    if (!userData) throw new Error('User not found')

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