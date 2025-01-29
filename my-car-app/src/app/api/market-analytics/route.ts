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

interface ModoRapidoListing {
  price: number;
  price_difference: number;
  price_difference_percentage: number;
  year: number;
  kilometers: number;
  fuel_type: string;
  transmission: string;
  horsepower: number;
}

interface ModoRapido {
  marca: string;
  modelo: string;
  minimo: number;
  maximo: number;
  cv: number;
  combustible: string;
}

interface ModoRapidoRun {
  id: string;
  created_at: string;
  modo_rapido: ModoRapido;
  modo_rapido_listings: ModoRapidoListing[];
}

interface MarketData {
  created_at: string;
  average_price: number;
  median_price: number;
  total_listings: number;
  valid_listings: number;
  modo_rapido_runs: ModoRapidoRun[];
}

interface BrandStats {
  totalScans: number;
  averagePrice: number;
  totalListings: number;
  models: string[];
  priceDistribution: {
    [year: string]: {
      prices?: number[];
      ranges?: { [range: string]: number };
    };
  };
  allPrices?: number[];
}

interface BrandAnalysis {
  [brand: string]: Omit<BrandStats, 'models' | 'allPrices'> & {
    models: string[];
  };
}

export async function GET() {
  try {
    // Get market data with modo rapido details
    const { data: marketData, error: marketError } = await supabase
      .from('market_data')
      .select(`
        *,
        modo_rapido_runs (
          id,
          created_at,
          modo_rapido (
            marca,
            modelo,
            minimo,
            maximo,
            cv,
            combustible
          ),
          modo_rapido_listings (
            price,
            price_difference,
            price_difference_percentage,
            year,
            kilometers,
            fuel_type,
            transmission,
            horsepower
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (marketError) {
      console.error('Error fetching market data:', marketError)
      return NextResponse.json({ error: marketError.message }, { status: 500 })
    }

    if (!marketData || marketData.length === 0) {
      return NextResponse.json({ error: 'No market data found' }, { status: 404 })
    }

    // Process the data to get insights
    const analytics = {
      totalScans: marketData.length,
      averageMarketPrice: calculateAverage(marketData.map(d => d.average_price)),
      medianMarketPrice: calculateMedian(marketData.map(d => d.median_price)),
      totalListingsAnalyzed: marketData.reduce((acc, d) => acc + d.total_listings, 0),
      validListingsPercentage: calculatePercentage(
        marketData.reduce((acc, d) => acc + d.valid_listings, 0),
        marketData.reduce((acc, d) => acc + d.total_listings, 0)
      ),
      brandAnalysis: analyzeBrands(marketData),
      priceRanges: analyzePriceRanges(marketData),
      fuelTypeDistribution: analyzeFuelTypes(marketData),
      yearDistribution: analyzeYearDistribution(marketData),
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

function calculateAverage(numbers: number[]): number {
  return numbers.reduce((acc, val) => acc + val, 0) / numbers.length
}

function calculateMedian(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function calculatePercentage(part: number, total: number): number {
  return (part / total) * 100
}

function calculateRangeSize(min: number, max: number): number {
  const range = max - min
  if (range <= 10000) return 1000 // 1k intervals for small ranges
  if (range <= 25000) return 2500 // 2.5k intervals for medium ranges
  if (range <= 50000) return 5000 // 5k intervals for larger ranges
  if (range <= 100000) return 10000 // 10k intervals
  if (range <= 250000) return 25000 // 25k intervals
  if (range <= 500000) return 50000 // 50k intervals
  return 100000 // 100k intervals for very large ranges
}

function analyzeBrands(marketData: MarketData[]): BrandAnalysis {
  const brandStats: { [key: string]: BrandStats } = {}
  
  // First pass: collect all prices for each brand and year
  marketData.forEach(data => {
    if (data.modo_rapido_runs?.[0]?.modo_rapido) {
      const brand = data.modo_rapido_runs[0].modo_rapido.marca
      if (!brandStats[brand]) {
        brandStats[brand] = {
          totalScans: 0,
          averagePrice: 0,
          totalListings: 0,
          models: [],
          priceDistribution: {},
          allPrices: []
        }
      }
      
      brandStats[brand].totalScans++
      brandStats[brand].averagePrice += data.average_price
      brandStats[brand].totalListings += data.total_listings
      if (!brandStats[brand].models.includes(data.modo_rapido_runs[0].modo_rapido.modelo)) {
        brandStats[brand].models.push(data.modo_rapido_runs[0].modo_rapido.modelo)
      }

      const listings = data.modo_rapido_runs[0].modo_rapido_listings
      if (listings && Array.isArray(listings)) {
        listings.forEach(listing => {
          if (listing.price && typeof listing.price === 'number') {
            brandStats[brand].allPrices?.push(listing.price)
            
            const year = listing.year?.toString() || 'unknown'
            if (!brandStats[brand].priceDistribution[year]) {
              brandStats[brand].priceDistribution[year] = {
                prices: [],
                ranges: {}
              }
            }
            brandStats[brand].priceDistribution[year].prices?.push(listing.price)
          }
        })
      }
    }
  })

  // Second pass: calculate ranges and distribute prices
  Object.keys(brandStats).forEach(brand => {
    const stats = brandStats[brand]
    
    Object.keys(stats.priceDistribution).forEach(year => {
      const yearData = stats.priceDistribution[year]
      const prices = yearData.prices || []
      const sortedPrices = [...prices].sort((a, b) => a - b)
      
      if (sortedPrices.length === 0) {
        delete stats.priceDistribution[year]
        return
      }

      // Calculate min and max with some padding
      const minPrice = Math.floor(sortedPrices[0] / 1000) * 1000
      const maxPrice = Math.ceil(sortedPrices[sortedPrices.length - 1] / 1000) * 1000
      
      // Determine range size based on the price spread
      const rangeSize = calculateRangeSize(minPrice, maxPrice)
      
      // Initialize ranges object with numerical keys for proper sorting
      yearData.ranges = {}
      
      // Create ranges and count prices in each range
      const rangeData: { [key: number]: number } = {}
      for (let rangeStart = minPrice; rangeStart < maxPrice; rangeStart += rangeSize) {
        const rangeEnd = rangeStart + rangeSize
        rangeData[rangeStart] = sortedPrices.filter(p => p >= rangeStart && p < rangeEnd).length
      }

      // Sort ranges numerically and convert to formatted labels
      Object.keys(rangeData)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(rangeStart => {
          if (rangeData[rangeStart] > 0 && yearData.ranges) {
            yearData.ranges[formatPrice(rangeStart)] = rangeData[rangeStart]
          }
        })

      // Clean up
      delete yearData.prices
    })

    // Clean up
    delete stats.allPrices
    stats.averagePrice /= stats.totalScans
  })

  return brandStats as BrandAnalysis
}

function formatPrice(price: number): string {
  if (price >= 1000000) {
    return (price / 1000000).toFixed(1) + 'M'
  }
  if (price >= 1000) {
    return Math.round(price / 1000) + 'k'
  }
  return price.toString()
}

function analyzePriceRanges(marketData: MarketData[]): {
  under5k: number;
  '5kTo10k': number;
  '10kTo20k': number;
  '20kTo30k': number;
  '30kTo50k': number;
  over50k: number;
} {
  const ranges = {
    under5k: 0,
    '5kTo10k': 0,
    '10kTo20k': 0,
    '20kTo30k': 0,
    '30kTo50k': 0,
    over50k: 0
  }

  marketData.forEach(data => {
    const price = data.average_price
    if (price < 5000) ranges.under5k++
    else if (price < 10000) ranges['5kTo10k']++
    else if (price < 20000) ranges['10kTo20k']++
    else if (price < 30000) ranges['20kTo30k']++
    else if (price < 50000) ranges['30kTo50k']++
    else ranges.over50k++
  })

  return ranges
}

function analyzeFuelTypes(marketData: MarketData[]): { [fuelType: string]: number } {
  const fuelTypes: { [key: string]: number } = {}

  marketData.forEach(data => {
    if (data.modo_rapido_runs?.[0]?.modo_rapido) {
      const fuelType = data.modo_rapido_runs[0].modo_rapido.combustible
      fuelTypes[fuelType] = (fuelTypes[fuelType] || 0) + 1
    }
  })

  return fuelTypes
}

function analyzeYearDistribution(marketData: MarketData[]): { [yearRange: string]: number } {
  const yearRanges: { [key: string]: number } = {}

  marketData.forEach(data => {
    if (data.modo_rapido_runs?.[0]?.modo_rapido) {
      const minYear = data.modo_rapido_runs[0].modo_rapido.minimo
      const maxYear = data.modo_rapido_runs[0].modo_rapido.maximo
      const range = `${minYear}-${maxYear}`
      yearRanges[range] = (yearRanges[range] || 0) + 1
    }
  })

  return yearRanges
} 