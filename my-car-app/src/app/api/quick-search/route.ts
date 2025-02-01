import { createClient } from '@supabase/supabase-js'
import { NextResponse, NextRequest } from 'next/server'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_KEY) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing required environment variables')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Get user context
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Parse device type from user agent
    const deviceType = userAgent.toLowerCase().includes('mobile') ? 'mobile' : 'desktop'
    
    // Get approximate location if provided
    let location = null
    if (body.location) {
      location = {
        latitude: body.location.latitude,
        longitude: body.location.longitude
      }
    }

    // Prepare search data with only useful information
    const searchData = {
      selected_model: body.selectedModel,
      selected_year_range: body.selectedYear,
      results_count: body.resultsCount,
      market_data: body.marketData,
      device_type: deviceType,
      location: location, // Changed from user_location to location to match DB schema
      created_at: new Date().toISOString()
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('quick_searches')
      .insert(searchData)
      .select()

    if (error) {
      console.error('Error storing quick search:', error)
      throw error
    }

    return NextResponse.json({ success: true, searchId: data[0].id })
  } catch (error) {
    console.error('Error in quick-search endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to store search data' },
      { status: 500 }
    )
  }
} 