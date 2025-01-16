import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_KEY) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing required environment variables')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

interface PriceAnalysis {
  brand: string
  model: string
  year_range: string
  engine_type: string
  regular_search_prices: number[]
  relevance_search_prices: number[]
  price_gap: number
  regular_min: number
  regular_max: number
  relevance_min: number
  relevance_max: number
  regular_search_url: string
  relevance_search_url: string
  timestamp: string
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('car_price_analysis')
      .select('*')
      .order('timestamp', { ascending: false })
      
    if (error) throw error

    // Process the data to calculate gaps
    const analyses = data.map((item): PriceAnalysis => {
      const regular_prices = item.regular_search_prices || []
      const relevance_prices = item.relevance_search_prices || []
      
      // Calculate average prices with explicit types
      const regular_avg = regular_prices.length 
        ? regular_prices.reduce((a: number, b: number) => a + b, 0) / regular_prices.length 
        : 0
      const relevance_avg = relevance_prices.length 
        ? relevance_prices.reduce((a: number, b: number) => a + b, 0) / relevance_prices.length 
        : 0
        
      return {
        brand: item.brand,
        model: item.model,
        year_range: item.year_range,
        engine_type: item.engine_type,
        regular_search_prices: regular_prices,
        relevance_search_prices: relevance_prices,
        price_gap: relevance_avg - regular_avg,
        regular_min: regular_prices.length ? Math.min(...regular_prices) : 0,
        regular_max: regular_prices.length ? Math.max(...regular_prices) : 0,
        relevance_min: relevance_prices.length ? Math.min(...relevance_prices) : 0,
        relevance_max: relevance_prices.length ? Math.max(...relevance_prices) : 0,
        regular_search_url: item.regular_search_url || '',
        relevance_search_url: item.relevance_search_url || '',
        timestamp: item.timestamp
      }
    })
    
    // Sort by absolute price gap
    const sorted = analyses.sort((a, b) => Math.abs(b.price_gap) - Math.abs(a.price_gap))
    
    // Debug log to check if URLs are present
    console.log('First analysis item:', sorted[0])
    
    return NextResponse.json(sorted)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
} 