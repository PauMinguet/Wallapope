import { createClient, PostgrestError } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

export async function GET() {
  try {
    // Get recent market data entries (last 24 hours)
    
    // Run queries in parallel
    const [marketDataResult, runsResult] = await Promise.all([
      // Get latest market data for basic stats
      supabase
        .from('market_data')
        .select('*')
        .order('created_at', { ascending: false }),
      
      // Get aggregated runs data with their relationships
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
    ]) as [
      { data: MarketData[] | null, error: PostgrestError | null },
      { data: ModoRapidoRun[] | null, error: PostgrestError | null }
    ]

    if (marketDataResult.error) throw marketDataResult.error
    if (runsResult.error) throw runsResult.error

    const marketData = marketDataResult.data
    const runs = runsResult.data

    if (!marketData || marketData.length === 0) {
      return NextResponse.json(
        { error: 'No market data found' },
        { status: 404 }
      )
    }

    if (!runs || runs.length === 0) {
      console.log('No runs found')
      return NextResponse.json({
        totalScans: 0,
        averageMarketPrice: 0,
        medianMarketPrice: 0,
        totalListingsAnalyzed: 0,
        validListingsPercentage: 0,
        brands: {},
        priceRanges: {
          under5k: 0,
          '5kTo10k': 0,
          '10kTo20k': 0,
          '20kTo30k': 0,
          '30kTo50k': 0,
          over50k: 0
        },
        fuelTypeDistribution: {},
        yearDistribution: {},
        lastUpdate: marketData[0].created_at
      })
    }

    // Process data efficiently using Maps for O(1) lookups
    const brandModelsMap = new Map<string, Set<string>>()
    const priceRanges = {
      under5k: 0,
      '5kTo10k': 0,
      '10kTo20k': 0,
      '20kTo30k': 0,
      '30kTo50k': 0,
      over50k: 0
    }
    const fuelTypeMap = new Map<string, number>()
    const yearMap = new Map<string, number>()
    
    // Single pass through runs data
    runs.forEach(run => {
      const { marca: brand, modelo: model, combustible } = run.modo_rapido
      const fuelType = combustible || 'Unknown'
      
      // Update brand-model mapping
      if (!brandModelsMap.has(brand)) {
        brandModelsMap.set(brand, new Set())
      }
      brandModelsMap.get(brand)!.add(model)

      // Update fuel type distribution
      fuelTypeMap.set(fuelType, (fuelTypeMap.get(fuelType) || 0) + 1)

      // Process listings
      run.modo_rapido_listings.forEach(listing => {
        if (listing.price) {
          if (listing.price <= 5000) priceRanges.under5k++
          else if (listing.price <= 10000) priceRanges['5kTo10k']++
          else if (listing.price <= 20000) priceRanges['10kTo20k']++
          else if (listing.price <= 30000) priceRanges['20kTo30k']++
          else if (listing.price <= 50000) priceRanges['30kTo50k']++
          else priceRanges.over50k++
        }

        if (listing.year) {
          const year = listing.year.toString()
          yearMap.set(year, (yearMap.get(year) || 0) + 1)
        }
      })
    })

    // Convert Maps to final format
    const brandsData = Object.fromEntries(
      Array.from(brandModelsMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([brand, models]) => [
          brand,
          {
            models: Array.from(models).sort()
          }
        ])
    )

    // Calculate aggregated metrics
    const totalListings = marketData.reduce((sum, md) => sum + md.total_listings, 0)
    const validListings = marketData.reduce((sum, md) => sum + md.valid_listings, 0)
    const latestMarketData = marketData[0]

    // Calculate average market price as the average of all market data averages
    const averageMarketPrice = marketData.reduce((sum, md) => sum + md.average_price, 0) / marketData.length

    const analytics = {
      totalScans: runs.length,
      averageMarketPrice,
      medianMarketPrice: latestMarketData.median_price,
      totalListingsAnalyzed: totalListings,
      validListingsPercentage: (validListings / totalListings) * 100,
      brands: brandsData,
      priceRanges,
      fuelTypeDistribution: Object.fromEntries(fuelTypeMap),
      yearDistribution: Object.fromEntries(yearMap),
      lastUpdate: latestMarketData.created_at
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error in base market-analytics endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 