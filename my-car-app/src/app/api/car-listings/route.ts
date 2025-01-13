import { NextResponse } from 'next/server'
import { supabase } from '../../../../utils/supabase'

interface CarListing {
  id: string
  title: string
  description: string
  price: number
  currency: string
  web_slug: string
  distance: number
  location: {
    postal_code: string
    city: string
    country_code: string
  }
  brand: string
  model: string
  year: number
  version: string
  kilometers: number
  engine_type: string
  gearbox: string
  horsepower: number
  seller_info: {
    id: string
    micro_name: string
    image: string
    online: boolean
    kind: string
  }
  flags: any
  search_id: string
  external_id: string
  car_images: Array<{
    image_urls: {
      large: string
      original: string
    }
    image_order: number
  }>
  car_searches: {
    brand: string
    model: string
    market_price: number
    frontend_url: string
  }
}

export async function GET() {
  try {
    const { data: listings, error } = await supabase
      .from('car_listings')
      .select(`
        *,
        car_images!inner (
          image_urls,
          image_order
        ),
        car_searches!inner (
          brand,
          model,
          market_price,
          frontend_url
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching listings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter and transform listings
    const filteredListings = listings
      .filter((listing: CarListing) => {
        // Skip listings with unwanted keywords
        const unwantedKeywords = [
          'accidentado', 'accidentada', 'inundado', 'accidente', 
          'despiece', 'reparar', 'no arranca'
        ]
        const lowerTitle = listing.title.toLowerCase()
        const lowerDesc = (listing.description || '').toLowerCase()

        if (unwantedKeywords.some(keyword => 
          lowerTitle.includes(keyword) || lowerDesc.includes(keyword)
        )) {
          return false
        }

        // Skip if kilometers > 200000
        if (listing.kilometers > 200000) {
          return false
        }

        // Skip if no images
        if (!listing.car_images?.length) {
          return false
        }

        return true
      })
      .map((listing: CarListing) => {
        const marketPrice = listing.car_searches?.market_price || 0
        const price_difference = marketPrice - listing.price
        const percentageDifference = marketPrice ? ((price_difference / marketPrice) * 100).toFixed(1) : '0.0'

        // Get the first image and use the large or original URL
        const sortedImages = listing.car_images.sort((a, b) => a.image_order - b.image_order)
        const firstImage = sortedImages[0]?.image_urls
        const imageUrl = firstImage?.large || firstImage?.original

        return {
          id: listing.id,
          external_id: listing.external_id,
          title: listing.title,
          description: listing.description,
          price: listing.price,
          price_text: `${listing.price.toLocaleString('es-ES')}€`,
          price_difference,
          price_difference_percentage: `${percentageDifference}%`,
          market_price: marketPrice,
          market_price_text: marketPrice ? `${marketPrice.toLocaleString('es-ES')}€` : 'N/A',
          location: `${listing.location.city}, ${listing.location.postal_code}`,
          year: listing.year,
          kilometers: listing.kilometers,
          fuel_type: listing.engine_type,
          transmission: listing.gearbox,
          url: `https://es.wallapop.com/item/${listing.web_slug}`,
          listing_images: [{
            image_url: imageUrl
          }],
          searches: {
            model: listing.car_searches?.model,
            brand: listing.car_searches?.brand,
            search_url: listing.car_searches?.frontend_url
          }
        }
      })
      .sort((a, b) => b.price_difference - a.price_difference)

    return NextResponse.json(filteredListings)
  } catch (error) {
    console.error('Error in car-listings endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 