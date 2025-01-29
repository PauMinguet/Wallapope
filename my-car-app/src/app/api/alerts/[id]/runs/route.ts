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

    // Get the alert runs with their associated market data and listings
    const { data: runs, error: runsError } = await supabase
      .from('alert_runs')
      .select(`
        *,
        market_data (*),
        alert_listings (*)
      `)
      .eq('alert_id', id)
      .order('created_at', { ascending: false })

    if (runsError) {
      console.error('GET /api/alerts/[id]/runs - Runs fetch error:', runsError)
      throw runsError
    }

    // Transform the data to match the expected format
    const transformedRuns = runs?.map(run => ({
      ...run,
      listings: run.alert_listings || [],
      market_data: run.market_data || null
    }))

    return NextResponse.json(transformedRuns || [])
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
    console.log('POST /api/alerts/[id]/runs - Received body:', JSON.stringify(body, null, 2))

    // 1. First create the market data entry
    const marketDataToInsert = {
      average_price: body.market_data?.average_price || 0,
      median_price: body.market_data?.median_price || 0,
      min_price: body.market_data?.min_price || 0,
      max_price: body.market_data?.max_price || 0,
      total_listings: body.market_data?.total_listings || 0,
      valid_listings: body.market_data?.valid_listings || 0,
      created_at: new Date().toISOString()
    }
    console.log('POST /api/alerts/[id]/runs - Inserting market data:', marketDataToInsert)

    const { data: marketData, error: marketDataError } = await supabase
      .from('market_data')
      .insert(marketDataToInsert)
      .select()
      .single()

    if (marketDataError) {
      console.error('POST /api/alerts/[id]/runs - Market data creation error:', marketDataError)
      throw marketDataError
    }
    console.log('POST /api/alerts/[id]/runs - Market data created:', marketData)

    // 2. Create the alert run with reference to market data
    const runToInsert = {
      alert_id: id,
      market_data_id: marketData.id,
      created_at: new Date().toISOString()
    }
    console.log('POST /api/alerts/[id]/runs - Inserting run:', runToInsert)

    const { data: run, error: runError } = await supabase
      .from('alert_runs')
      .insert(runToInsert)
      .select()
      .single()

    if (runError) {
      console.error('POST /api/alerts/[id]/runs - Run creation error:', runError)
      throw runError
    }
    console.log('POST /api/alerts/[id]/runs - Run created:', run)

    // 3. Create all the listings with reference to the run
    if (body.listings && body.listings.length > 0) {
      const listingsToInsert = body.listings.map((listing: {
        listing_id: string;
        title: string;
        price: number;
        price_text: string;
        market_price: number;
        market_price_text: string;
        price_difference: number;
        price_difference_percentage: string;
        location: string;
        year: number;
        kilometers: number;
        fuel_type: string;
        transmission: string;
        url: string;
        horsepower: number;
        distance: number;
        listing_images: Array<{ image_url: string }>;
      }) => ({
        alert_run_id: run.id,
        listing_id: listing.listing_id,
        title: listing.title,
        price: listing.price,
        price_text: listing.price_text,
        market_price: listing.market_price,
        market_price_text: listing.market_price_text,
        price_difference: listing.price_difference,
        price_difference_percentage: listing.price_difference_percentage,
        location: listing.location,
        year: listing.year,
        kilometers: listing.kilometers,
        fuel_type: listing.fuel_type,
        transmission: listing.transmission,
        url: listing.url,
        horsepower: listing.horsepower,
        distance: listing.distance,
        listing_images: listing.listing_images,
        created_at: new Date().toISOString()
      }))
      console.log('POST /api/alerts/[id]/runs - Inserting listings:', JSON.stringify(listingsToInsert, null, 2))

      const { data: insertedListings, error: listingsError } = await supabase
        .from('alert_listings')
        .insert(listingsToInsert)
        .select()

      if (listingsError) {
        console.error('POST /api/alerts/[id]/runs - Listings creation error:', listingsError)
        throw listingsError
      }
      console.log('POST /api/alerts/[id]/runs - Listings created:', insertedListings)
    }

    // Return the complete run data
    const { data: completeRun, error: completeRunError } = await supabase
      .from('alert_runs')
      .select(`
        *,
        market_data (*),
        alert_listings (*)
      `)
      .eq('id', run.id)
      .single()

    if (completeRunError) {
      console.error('POST /api/alerts/[id]/runs - Complete run fetch error:', completeRunError)
      throw completeRunError
    }

    // Transform the data to match the expected format
    const transformedRun = {
      ...completeRun,
      listings: completeRun.alert_listings || [],
      market_data: completeRun.market_data || null
    }

    console.log('POST /api/alerts/[id]/runs - Returning transformed run:', JSON.stringify(transformedRun, null, 2))
    return NextResponse.json(transformedRun)
  } catch (error) {
    console.error('POST /api/alerts/[id]/runs - Unhandled error:', error)
    return new NextResponse('Error creating alert run', { status: 500 })
  }
} 