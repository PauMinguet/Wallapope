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

interface Moto extends BaseVehicle {
  model: string
  price_range: string
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
  searches?: {
    model: string
  }
}

interface CocheListing extends BaseListing {
  listing_images_coches: Array<{ image_url: string }>
}

interface MotoListing extends BaseListing {
  listing_images_motos: Array<{ image_url: string }>
}

interface FurgoListing extends BaseListing {
  configuracion: string
  motor: string
  listing_images_furgos: Array<{ image_url: string }>
}

type VehicleListing = CocheListing | MotoListing | FurgoListing

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const vehicleType = (searchParams.get('type') || 'coches') as VehicleType

  // For scooters, we don't need to fetch target data since we use fixed parameters
  let targetData = []
  if (vehicleType !== 'scooters') {
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
        search_url
      )
    `)
    .order('created_at', { ascending: false })

  if (listingsError) {
    console.error('Listings error:', listingsError)
    return NextResponse.json({ error: listingsError.message }, { status: 500 })
  }

  const filteredListings = (listings as VehicleListing[]).filter(listing => {
    const lowerTitle = listing.title.toLowerCase()
    const lowerDesc = (listing.description || '').toLowerCase()
    const unwantedKeywords = ['accidentado', 'accidente', 'despiece', 'reparar']
    
    return !unwantedKeywords.some(keyword => 
      lowerTitle.includes(keyword) || lowerDesc.includes(keyword)
    )
  })

  const parsePrice = (str: string): number => 
    Number(str.replace('€', '').replace('.', '').replace(',', '.').trim())

  // For scooters, use a fixed target price
  const targetPrices = vehicleType === 'scooters' 
    ? new Map([['scooter', 900]]) // Fixed target price for scooters at 900€
    : new Map(
        (targetData as (Coche | Moto | Furgo)[]).map(item => {
          if (vehicleType === 'coches') {
            const car = item as Coche
            return [car.modelo, parsePrice(car.precio_compra.split('-')[0])] as const
          } 
          
          if (vehicleType === 'motos') {
            const moto = item as Moto
            const [min, max] = moto.price_range.split('-').map(parsePrice)
            return [moto.model, (min + max) / 2] as const
          } 
          
          if (vehicleType === 'furgos') {
            const van = item as Furgo
            const [min, max] = van.precio.split('-').map(parsePrice)
            return [`${van.modelo}-${van.configuracion}-${van.motor}`, (min + max) / 2] as const
          }
          
          return ['', 0] as const
        })
      )

  const isFurgoListing = (listing: VehicleListing): listing is FurgoListing => 
    'configuracion' in listing && 'motor' in listing

  const listingsWithDiff = filteredListings
    .map(listing => {
      const isReserved = listing.title.toLowerCase().startsWith('reservado')
      const cleanTitle = isReserved 
        ? listing.title.replace(/^reservado\s+/i, '')
        : listing.title

      let price_difference = 0
      if (vehicleType === 'scooters') {
        const targetPrice = targetPrices.get('scooter') || 0
        price_difference = targetPrice - (listing.price || 0)
      } else if (vehicleType === 'furgos') {
        // For furgos, use the price_difference from the database
        price_difference = listing.price_difference || 0
      } else {
        const targetPrice = targetPrices.get(listing.searches?.model || '') || 0
        price_difference = targetPrice - (listing.price || 0)
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
  
  const listingsWithFormattedImages = listingsWithDiff.map(listing => ({
    ...listing,
    listing_images: getListingImages(listing, vehicleType)
  }))

  return NextResponse.json(listingsWithFormattedImages)
}

