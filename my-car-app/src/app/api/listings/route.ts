import { NextResponse } from 'next/server'
import { supabase } from '../../../../utils/supabase'

type VehicleType = 'coches' | 'motos' | 'furgos' | 'scooters'

// Target data interfaces
interface BaseVehicle {
  id: number
  modelo: string
}

interface Coche extends BaseVehicle {
  precio_compra: string
}

interface Furgo extends BaseVehicle {
  configuracion: string
  motor: string
  precio: string
}

// Listing interfaces
interface BaseListing {
  id: number
  title: string
  description: string
  price: number
  price_text: string
  price_difference?: number
  location: string
  listing_images?: Array<{ image_url: string }>
  searches?: {
    model: string
    marca?: string
    vehicle_type: string
    search_url: string
    max_price?: number
  }
  flags: WallapopListing['flags']
}

interface CocheListing extends BaseListing {
  listing_images_coches?: Array<{ image_url: string }>
}

interface MotoListing extends BaseListing {
  listing_images_motos?: Array<{ image_url: string }>
}

interface FurgoListing extends BaseListing {
  configuracion: string
  motor: string
  listing_images_furgos?: Array<{ image_url: string }>
}

type VehicleListing = CocheListing | MotoListing | FurgoListing

interface WallapopListing {
  flags: {
    pending: boolean
    sold: boolean
    reserved: boolean
    banned: boolean
    expired: boolean
    onhold: boolean
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const vehicleType = (searchParams.get('type') || 'coches') as VehicleType

  // For scooters, we don't need to fetch target data since we use fixed parameters
  let targetData = []
  if (vehicleType !== 'scooters' && vehicleType !== 'motos') {  // Don't fetch target data for motos
    const { data, error: targetError } = await supabase
      .from(vehicleType)
      .select('*')

    if (targetError) {
      return NextResponse.json({ error: targetError.message }, { status: 500 })
    }
    targetData = data
  }

  const { data: listings, error: listingsError } = await supabase
    .from(`listings_${vehicleType}`)
    .select(`
      *,
      listing_images_${vehicleType} (
        image_url,
        image_order
      ),
      searches (
        model,
        marca,
        vehicle_type,
        search_url,
        max_price
      )
    `)
    .order('created_at', { ascending: false })

  if (listingsError) {
    console.error('Listings error:', listingsError)
    return NextResponse.json({ error: listingsError.message }, { status: 500 })
  }

  // Add logging for titles and models
  console.log('\n=== Listings for', vehicleType, '===')
  listings.forEach((listing: VehicleListing) => {
    console.log('\nTitle:', listing.title)
    console.log('Model:', listing.searches?.model || 'No model specified')
    console.log('---')
  })

  const parsePrice = (str: string): number => 
    Number(str.replace('€', '').replace('.', '').replace(',', '.').trim())

  // For scooters, use a fixed target price
  const targetPrices = vehicleType === 'scooters' 
    ? new Map([['scooter', 900]]) // Fixed target price for scooters at 900€
    : new Map(
        (targetData as (Coche | Furgo)[]).map(item => {
          if (vehicleType === 'coches') {
            const car = item as Coche
            return [car.modelo, parsePrice(car.precio_compra.split('-')[0])] as const
          } 
          
          if (vehicleType === 'furgos') {
            const van = item as Furgo
            const [min, max] = van.precio.split('-').map(parsePrice)
            return [`${van.modelo}-${van.configuracion}-${van.motor}`, (min + max) / 2] as const
          }
          
          return ['', 0] as const
        })
      )

  const filteredListings = (listings as VehicleListing[])
    .filter(listing => {
      // Skip reserved listings
      if (listing.title.toLowerCase().startsWith('reservado')) {
        return false
      }

      // First check for unwanted keywords
      const lowerTitle = listing.title.toLowerCase()
      const lowerDesc = (listing.description || '').toLowerCase()
      const unwantedKeywords = ['accidentado', 'accidentada', 'inundado', 'accidente', 'despiece', 'reparar', 'no arranca']
      
      if (unwantedKeywords.some(keyword => 
        lowerTitle.includes(keyword) || lowerDesc.includes(keyword)
      )) {
        return false
      }

      // Extract and normalize kilometers
      const kmMatch = listing.title.match(/(\d+)\s*(?:km|KM)/i)
      if (kmMatch) {
        let kms = parseInt(kmMatch[1], 10)
        kms = kms < 1000 ? kms * 1000 : kms
        if (kms > 200000) return false
      }

      return true
    })
    .map(listing => {
      const isReserved = listing.title.toLowerCase().startsWith('reservado')
      const cleanTitle = isReserved 
        ? listing.title.replace(/^reservado\s+/i, '')
        : listing.title

      let price_difference = 0
      if (vehicleType === 'motos') {
        // For motos, use the search's max_price
        const targetPrice = listing.searches?.max_price || 0
        price_difference = targetPrice - (listing.price || 0)
      } else if (vehicleType === 'scooters') {
        const targetPrice = targetPrices.get('scooter') || 0
        price_difference = targetPrice - (listing.price || 0)
      } else {
        // For other vehicle types, use the existing logic
        const key = vehicleType === 'furgos' 
          ? `${listing.searches?.model}-${(listing as FurgoListing).configuracion}-${(listing as FurgoListing).motor}`
          : listing.searches?.model || ''
        const targetPrice = targetPrices.get(key) || 0
        price_difference = vehicleType === 'furgos'
          ? (listing.price || 0) - targetPrice  // For furgos: listing price - target
          : targetPrice - (listing.price || 0)  // For others: target - listing price
      }

      return {
        ...listing,
        title: cleanTitle,
        isReserved,
        price_difference,
        vehicle_type: vehicleType
      }
    })
    .sort((a, b) => 
      vehicleType === 'furgos'
        ? a.price_difference - b.price_difference  // For furgos: more negative = better
        : b.price_difference - a.price_difference  // For others: more positive = better
    )

  const getListingImages = (listing: VehicleListing & { listing_images_scooters?: Array<{ image_url: string }> }, type: VehicleType): Array<{ image_url: string }> => {
    switch (type) {
      case 'coches':
        return ('listing_images_coches' in listing ? listing.listing_images_coches : []) || []
      case 'motos':
        return ('listing_images_motos' in listing ? listing.listing_images_motos : []) || []
      case 'furgos':
        return ('listing_images_furgos' in listing ? listing.listing_images_furgos : []) || []
      case 'scooters':
        return ('listing_images_scooters' in listing ? listing.listing_images_scooters : []) || []
    }
  }
  
  const listingsWithFormattedImages = filteredListings.map(listing => ({
    ...listing,
    listing_images: getListingImages(listing, vehicleType)
  }))

  return NextResponse.json(listingsWithFormattedImages)
}

