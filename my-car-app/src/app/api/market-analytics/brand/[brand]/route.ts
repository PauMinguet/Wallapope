import { createClient, PostgrestError } from '@supabase/supabase-js'
import { NextResponse, NextRequest } from 'next/server'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_KEY) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing required environment variables')
}

interface ModoRapido {
  id: string
  marca: string
  modelo: string
  combustible?: string
}

interface ModoRapidoListing {
  id: string
  price: number
  year: number
}

interface ModoRapidoRun {
  id: string
  market_data_id: string
  modo_rapido: ModoRapido
  modo_rapido_listings: ModoRapidoListing[]
}

interface MarketData {
  id: string
  average_price: number
  median_price: number
  total_listings: number
  valid_listings: number
  created_at: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export async function GET(request: NextRequest) {
  try {
    const brand = request.nextUrl.pathname.split('/').pop()
    if (!brand) {
      return NextResponse.json(
        { error: 'Brand parameter is required' },
        { status: 400 }
      )
    }
    const decodedBrand = decodeURIComponent(brand)

    // Get recent data (last 24 hours)
    
    // Run queries in parallel
    const [marketDataResult, brandRunsResult] = await Promise.all([
      // Get market data for the time window
      supabase
        .from('market_data')
        .select('*')
        .order('created_at', { ascending: false }),
      
      // Get brand-specific data
      supabase
        .from('modo_rapido_runs')
        .select(`
          id,
          market_data_id,
          modo_rapido!inner (
            marca,
            modelo,
            combustible
          ),
          modo_rapido_listings!inner (
            price,
            year
          )
        `)
        .eq('modo_rapido.marca', decodedBrand)
    ]) as [
      { data: MarketData[] | null, error: PostgrestError | null },
      { data: ModoRapidoRun[] | null, error: PostgrestError | null }
    ]

    if (marketDataResult.error) throw marketDataResult.error
    if (brandRunsResult.error) throw brandRunsResult.error

    const marketData = marketDataResult.data
    const brandRuns = brandRunsResult.data

    if (!marketData || marketData.length === 0) {
      return NextResponse.json(
        { error: 'No market data found' },
        { status: 404 }
      )
    }

    if (!brandRuns || brandRuns.length === 0) {
      console.log('No brand runs found for:', decodedBrand)
      return NextResponse.json(
        { error: 'No data found for this brand' },
        { status: 404 }
      )
    }

    // Process brand data efficiently using Maps
    const modelStatsMap = new Map<string, {
      totalScans: number
      totalPrice: number
      totalListings: number
    }>()
    const fuelTypeMap = new Map<string, number>()
    const yearMap = new Map<string, number>()
    let totalListings = 0
    let totalPrice = 0
    let validListingsCount = 0

    // Single pass through brand runs
    brandRuns.forEach(run => {
      const { modelo: model, combustible } = run.modo_rapido
      const fuelType = combustible || 'Unknown'

      // Update fuel type distribution
      fuelTypeMap.set(fuelType, (fuelTypeMap.get(fuelType) || 0) + 1)

      // Initialize or get model stats
      if (!modelStatsMap.has(model)) {
        modelStatsMap.set(model, {
          totalScans: 0,
          totalPrice: 0,
          totalListings: 0
        })
      }
      const modelStats = modelStatsMap.get(model)!
      modelStats.totalScans++

      // Process listings
      run.modo_rapido_listings.forEach(listing => {
        if (listing.price && listing.year) {
          const year = listing.year.toString()
          yearMap.set(year, (yearMap.get(year) || 0) + 1)
          totalPrice += listing.price
          validListingsCount++
          modelStats.totalListings++
          modelStats.totalPrice += listing.price
        }
      })

      totalListings += run.modo_rapido_listings.length
    })

    // Convert model stats to final format
    const modelStats = Object.fromEntries(
      Array.from(modelStatsMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([model, stats]) => [
          model,
          {
            totalScans: stats.totalScans,
            averagePrice: stats.totalListings > 0 ? stats.totalPrice / stats.totalListings : 0,
            totalListings: stats.totalListings
          }
        ])
    )

    const brandAnalytics = {
      totalScans: brandRuns.length,
      averagePrice: validListingsCount > 0 ? totalPrice / validListingsCount : 0,
      totalListings,
      models: modelStats,
      fuelTypeDistribution: Object.fromEntries(fuelTypeMap),
      yearDistribution: Object.fromEntries(yearMap)
    }

    return NextResponse.json(brandAnalytics)
  } catch (error) {
    console.error('Error in brand market-analytics endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 