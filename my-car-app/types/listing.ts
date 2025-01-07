export interface Listing {
  id: number
  search_id: number
  url: string
  title: string
  price: number
  price_text: string
  location: string
  year: number
  fuel_type: string
  transmission: string
  power_cv: number
  kilometers: number
  description: string
  created_at: string
  listing_images: Array<{
    image_url: string
    image_order: number
  }>
}

