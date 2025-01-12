export interface BaseListing {
  id: number
  title: string
  description: string
  price: number
  price_text: string
  location: string
  searches?: {
    model: string
  }
}

export interface ScooterListing extends BaseListing {
  engine_cc: number
  listing_images_scooters: Array<{ image_url: string }>
}

export interface Listing {
  id: number
  title: string
  description?: string
  price?: number
  price_text: string
  price_difference?: number
  location?: string
  year?: number
  fuel_type?: string
  transmission?: string
  power_cv?: number
  kilometers?: number
  engine_cc?: number
  motor?: string
  configuracion?: string
  url: string
  isReserved?: boolean
  listing_images?: Array<{ image_url: string }>
  listing_images_coches?: Array<{ image_url: string }>
  listing_images_motos?: Array<{ image_url: string }>
  listing_images_furgos?: Array<{ image_url: string }>
  listing_images_scooters?: Array<{ image_url: string }>
  searches?: {
    model: string
    marca: string
    vehicle_type: string
    search_url: string
    max_price: number
  }
}

