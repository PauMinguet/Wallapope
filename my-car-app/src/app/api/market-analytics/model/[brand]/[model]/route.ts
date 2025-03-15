import { createClient, PostgrestError } from '@supabase/supabase-js'
import { NextResponse, NextRequest } from 'next/server'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_KEY) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing required environment variables')
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
    
    console.log('Processing request for:', { brand, model, pathname: request.nextUrl.pathname })

    if (!brand || !model) {
      console.log('Missing brand or model parameters')
      return NextResponse.json(
        { error: 'Brand and model parameters are required' },
        { status: 400 }
      )
    }

    // Get the recent market_data entries
    console.log('Fetching market data...')
    const { data: marketData, error: marketError } = await supabase
      .from('market_data')
      .select('*')
      .order('created_at', { ascending: false }) as { data: MarketData[] | null, error: PostgrestError | null }

    if (marketError) {
      console.error('Error fetching market data:', marketError)
      throw marketError
    }
    if (!marketData || marketData.length === 0) {
      console.log('No market data found')
      return NextResponse.json(
        { error: 'No market data found' },
        { status: 404 }
      )
    }
    console.log('Found market data entries:', marketData.length)

    // Get all modo_rapido IDs for this brand and model
    console.log('Fetching modo_rapido entries for:', { brand, model })
    const { data: modoRapidos, error: modoRapidoError } = await supabase
      .from('modo_rapido')
      .select('id, marca, modelo')
      .eq('marca', brand)
      .eq('modelo', model)

    if (modoRapidoError) {
      console.error('Error getting modo_rapido:', modoRapidoError)
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }

    if (!modoRapidos || modoRapidos.length === 0) {
      console.log('No modo_rapido entries found for:', { brand, model })
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }
    console.log('Found modo_rapido entries:', modoRapidos.length, modoRapidos)

    // Get model-specific data using all modo_rapido IDs
    console.log('Fetching modo_rapido_runs with IDs:', modoRapidos.map(mr => mr.id))
    const { data: modelRuns, error: modelError } = await supabase
      .from('modo_rapido_runs')
      .select('id, market_data_id, modo_rapido_id')
      .in('modo_rapido_id', modoRapidos.map(mr => mr.id))

    console.log('Initial query result:', { data: modelRuns, error: modelError })

    if (modelError) {
      console.error('Error fetching model runs:', modelError)
      throw modelError
    }
    if (!modelRuns || modelRuns.length === 0) {
      console.log('No model runs found for IDs:', modoRapidos.map(mr => mr.id))
      return NextResponse.json(
        { error: 'No data found for this model' },
        { status: 404 }
      )
    }

    // If we get here, try to fetch the related data separately
    console.log('Fetching related data for runs:', modelRuns.map(run => run.id))
    const { data: fullModelRuns, error: fullModelError } = await supabase
      .from('modo_rapido_runs')
      .select(`
        id,
        market_data_id,
        modo_rapido_id,
        modo_rapido:modo_rapido_id (
          id,
          marca,
          modelo
        ),
        modo_rapido_listings (
          id,
          price,
          year
        )
      `)
      .in('id', modelRuns.map(run => run.id))

    if (fullModelError) {
      console.error('Error fetching full model runs:', fullModelError)
      throw fullModelError
    }

    console.log('Found model runs:', fullModelRuns?.length || 0)

    // Process model data
    console.log('Processing model data...')
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

    fullModelRuns.forEach(run => {
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
      totalScans: fullModelRuns.length,
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