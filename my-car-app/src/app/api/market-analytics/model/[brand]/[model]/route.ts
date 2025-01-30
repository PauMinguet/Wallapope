import { createClient, PostgrestError } from '@supabase/supabase-js'
import { NextResponse, NextRequest } from 'next/server'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_KEY) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing required environment variables')
}

interface ModoRapido {
  marca: string
  modelo: string
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export async function GET(request: NextRequest) {
  try {
    const pathParts = request.nextUrl.pathname.split('/')
    const model = decodeURIComponent(pathParts.pop() || '')
    const brand = decodeURIComponent(pathParts.pop() || '')

    if (!brand || !model) {
      return NextResponse.json(
        { error: 'Brand and model parameters are required' },
        { status: 400 }
      )
    }

    // Get the recent market_data entries
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

    // Get model-specific data
    const { data: modelRuns, error: modelError } = await supabase
      .from('modo_rapido_runs')
      .select(`
        id,
        market_data_id,
        modo_rapido!inner (
          marca,
          modelo
        ),
        modo_rapido_listings!inner (
          price,
          year
        )
      `)
      .in('market_data_id', marketData.map(md => md.id))
      .eq('modo_rapido.marca', brand)
      .eq('modo_rapido.modelo', model) as { data: ModoRapidoRun[] | null, error: PostgrestError | null }

    if (modelError) throw modelError
    if (!modelRuns || modelRuns.length === 0) {
      return NextResponse.json(
        { error: 'No data found for this model' },
        { status: 404 }
      )
    }

    // Process model data
    const yearPriceDistribution: { 
      [key: string]: { 
        ranges: PriceRanges,
        averagePrice: number,
        totalListings: number
      } 
    } = {}
    let totalListings = 0
    let totalPrice = 0
    let validListingsCount = 0

    modelRuns.forEach(run => {
      const listings = run.modo_rapido_listings || []
      const validListings = listings.filter(l => l.price && l.year)

      validListings.forEach(listing => {
        const year = listing.year.toString()
        const price = listing.price

        if (!yearPriceDistribution[year]) {
          yearPriceDistribution[year] = {
            ranges: {
              under5k: 0,
              '5kTo10k': 0,
              '10kTo15k': 0,
              '15kTo20k': 0,
              '20kTo30k': 0,
              '30kTo50k': 0,
              over50k: 0
            },
            averagePrice: 0,
            totalListings: 0
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

        yearPriceDistribution[year].ranges[range]++
        yearPriceDistribution[year].totalListings++
        yearPriceDistribution[year].averagePrice = 
          (yearPriceDistribution[year].averagePrice * (yearPriceDistribution[year].totalListings - 1) + price) / 
          yearPriceDistribution[year].totalListings

        totalPrice += price
        validListingsCount++
      })

      totalListings += validListings.length
    })

    const modelAnalytics = {
      totalScans: modelRuns.length,
      averagePrice: validListingsCount > 0 ? totalPrice / validListingsCount : 0,
      totalListings,
      yearPriceDistribution
    }

    return NextResponse.json(modelAnalytics)
  } catch (error) {
    console.error('Error in model market-analytics endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 