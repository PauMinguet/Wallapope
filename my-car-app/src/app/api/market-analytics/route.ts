import { createClient, PostgrestError } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_KEY) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing required environment variables')
}

interface ModoRapido {
  marca: string
  modelo: string
  combustible?: string
}

interface ModoRapidoListing {
  price: number
  year: number
}

interface ModoRapidoRun {
  id: string
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

interface PriceRanges {
  [key: string]: number;
  'under5k': number;
  '5kTo10k': number;
  '10kTo15k': number;
  '15kTo20k': number;
  '20kTo30k': number;
  '30kTo50k': number;
  'over50k': number;
}

interface YearData {
  ranges: PriceRanges
  models: {
    [key: string]: {
      ranges: PriceRanges
    }
  }
}

interface BrandAnalysis {
  totalScans: number
  averagePrice: number
  totalListings: number
  models: {
    [key: string]: {
      totalScans: number
      averagePrice: number
      totalListings: number
    }
  }
  priceDistribution: {
    [key: string]: YearData
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export async function GET() {
  try {
    // Get the recent market_data entries (last 24 hours instead of 7 days to reduce data volume)
    const { data: marketData, error: marketError } = await supabase
      .from('market_data')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false }) as { data: MarketData[] | null, error: PostgrestError | null }

    if (marketError) throw marketError
    if (!marketData || marketData.length === 0) {
      return NextResponse.json(
        { error: 'No market data found' },
        { status: 404 }
      )
    }

    // Process market data in chunks of 10
    const chunkSize = 10
    const runs: ModoRapidoRun[] = []
    
    for (let i = 0; i < marketData.length; i += chunkSize) {
      const chunk = marketData.slice(i, i + chunkSize)
      const { data: chunkRuns, error: runsError } = await supabase
        .from('modo_rapido_runs')
        .select(`
          id,
          modo_rapido (
            marca,
            modelo,
            combustible
          ),
          modo_rapido_listings (
            price,
            year
          )
        `)
        .in('market_data_id', chunk.map(md => md.id)) as { data: ModoRapidoRun[] | null, error: PostgrestError | null }

      if (runsError) throw runsError
      if (chunkRuns) {
        runs.push(...chunkRuns)
      }
    }

    if (runs.length === 0) {
      return NextResponse.json(
        { error: 'No runs data found' },
        { status: 404 }
      )
    }

    // Process the data to create brand analysis
    const brandAnalysis: { [key: string]: BrandAnalysis } = {}
    const fuelTypeDistribution: { [key: string]: number } = {}
    const yearDistribution: { [key: string]: number } = {}

    runs.forEach(run => {
      const brand = run.modo_rapido.marca
      const model = run.modo_rapido.modelo
      const fuelType = run.modo_rapido.combustible || 'Unknown'
      
      // Update fuel type distribution
      fuelTypeDistribution[fuelType] = (fuelTypeDistribution[fuelType] || 0) + 1

      if (!brandAnalysis[brand]) {
        brandAnalysis[brand] = {
          totalScans: 0,
          averagePrice: 0,
          totalListings: 0,
          models: {},
          priceDistribution: {}
        }
      }

      if (!brandAnalysis[brand].models[model]) {
        brandAnalysis[brand].models[model] = {
          totalScans: 0,
          averagePrice: 0,
          totalListings: 0
        }
      }

      // Process listings for this run
      const listings = run.modo_rapido_listings || []
      const validListings = listings.filter(l => l.price && l.year)

      // Update year distribution
      validListings.forEach(listing => {
        const year = listing.year.toString()
        yearDistribution[year] = (yearDistribution[year] || 0) + 1
      })

      if (validListings.length > 0) {
        // Update brand stats
        brandAnalysis[brand].totalScans++
        brandAnalysis[brand].totalListings += validListings.length
        brandAnalysis[brand].averagePrice = 
          (brandAnalysis[brand].averagePrice * (brandAnalysis[brand].totalScans - 1) + 
           validListings.reduce((sum, l) => sum + Number(l.price), 0) / validListings.length) / 
          brandAnalysis[brand].totalScans

        // Update model stats
        brandAnalysis[brand].models[model].totalScans++
        brandAnalysis[brand].models[model].totalListings += validListings.length
        brandAnalysis[brand].models[model].averagePrice = 
          (brandAnalysis[brand].models[model].averagePrice * (brandAnalysis[brand].models[model].totalScans - 1) + 
           validListings.reduce((sum, l) => sum + Number(l.price), 0) / validListings.length) / 
          brandAnalysis[brand].models[model].totalScans

        // Process price distribution
        validListings.forEach(listing => {
          const year = listing.year.toString()
          const price = Number(listing.price)
          
          // Initialize price ranges
          if (!brandAnalysis[brand].priceDistribution[year]) {
            brandAnalysis[brand].priceDistribution[year] = {
              ranges: {
                under5k: 0,
                '5kTo10k': 0,
                '10kTo15k': 0,
                '15kTo20k': 0,
                '20kTo30k': 0,
                '30kTo50k': 0,
                over50k: 0
              },
              models: {}
            }
          }

          // Determine price range
          let range = 'over50k'
          if (price <= 5000) range = 'under5k'
          else if (price <= 10000) range = '5kTo10k'
          else if (price <= 15000) range = '10kTo15k'
          else if (price <= 20000) range = '15kTo20k'
          else if (price <= 30000) range = '20kTo30k'
          else if (price <= 50000) range = '30kTo50k'

          // Initialize model ranges if not exists
          if (!brandAnalysis[brand].priceDistribution[year].models[model]) {
            brandAnalysis[brand].priceDistribution[year].models[model] = {
              ranges: {
                under5k: 0,
                '5kTo10k': 0,
                '10kTo15k': 0,
                '15kTo20k': 0,
                '20kTo30k': 0,
                '30kTo50k': 0,
                over50k: 0
              }
            }
          }

          // Update counts
          brandAnalysis[brand].priceDistribution[year].ranges[range]++
          brandAnalysis[brand].priceDistribution[year].models[model].ranges[range]++
        })
      }
    })

    // Calculate global price ranges
    const priceRanges = {
      under5k: 0,
      '5kTo10k': 0,
      '10kTo15k': 0,
      '15kTo20k': 0,
      '20kTo30k': 0,
      '30kTo50k': 0,
      over50k: 0
    }

    Object.values(brandAnalysis).forEach(brand => {
      Object.values(brand.priceDistribution).forEach((yearData: YearData) => {
        priceRanges.under5k += yearData.ranges['under5k']
        priceRanges['5kTo10k'] += yearData.ranges['5kTo10k']
        priceRanges['10kTo15k'] += yearData.ranges['10kTo15k']
        priceRanges['15kTo20k'] += yearData.ranges['15kTo20k']
        priceRanges['20kTo30k'] += yearData.ranges['20kTo30k']
        priceRanges['30kTo50k'] += yearData.ranges['30kTo50k']
        priceRanges.over50k += yearData.ranges['over50k']
      })
    })

    const analytics = {
      totalScans: Object.values(brandAnalysis).reduce((sum: number, brand: BrandAnalysis) => sum + brand.totalScans, 0),
      averageMarketPrice: marketData[0].average_price,
      medianMarketPrice: marketData[0].median_price,
      totalListingsAnalyzed: marketData.reduce((sum, md) => sum + md.total_listings, 0),
      validListingsPercentage: (marketData.reduce((sum, md) => sum + md.valid_listings, 0) / 
                               marketData.reduce((sum, md) => sum + md.total_listings, 0)) * 100,
      brandAnalysis,
      priceRanges,
      fuelTypeDistribution,
      yearDistribution,
      lastUpdate: marketData[0].created_at
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error in market-analytics endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 