import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import puppeteer from 'puppeteer'

function cleanPrice(priceText: string | null): number | null {
  if (!priceText) return null
  const numbers = priceText.match(/[\d.,]+/)
  if (numbers) {
    return parseFloat(numbers[0].replace('.', '').replace(',', '.'))
  }
  return null
}

function isRelevantResult(title: string | null, searchTerms: { marca: string, modelo: string }): boolean {
  if (!title) return false
  
  const titleLower = title.toLowerCase()
  const marca = searchTerms.marca.toLowerCase()
  const modelo = searchTerms.modelo.toLowerCase()

  // Common variations of brand names
  const brandVariations: { [key: string]: string[] } = {
    'vw': ['volkswagen', 'vw'],
    'volkswagen': ['volkswagen', 'vw'],
    'bmw': ['bmw'],
    'mercedes': ['mercedes', 'mercedes-benz', 'merche'],
    // Add more brand variations as needed
  }

  // Get all possible variations of the brand
  const brandOptions = brandVariations[marca] || [marca]
  
  // Check if any brand variation is present
  const hasBrand = brandOptions.some(brand => titleLower.includes(brand))
  
  // Check if model is present
  const hasModel = titleLower.includes(modelo)

  // Must have both brand and model to be considered relevant
  return hasBrand && hasModel
}

export async function POST(request: NextRequest) {
  console.log('Search-wallapop endpoint hit')
  let browser = null
  
  try {
    const body = await request.json()
    console.log('Raw body:', body)

    const searchParams = {
      keywords: String(body.keywords || ''),
      minPrice: typeof body.minPrice === 'number' ? body.minPrice : undefined,
      maxPrice: typeof body.maxPrice === 'number' ? body.maxPrice : undefined,
      año: body.año !== undefined ? Number(body.año) : undefined,
      kilometraje: body.kilometraje !== undefined ? Number(body.kilometraje) : undefined
    }

    console.log('Parsed search params:', searchParams)

    const { keywords, minPrice, maxPrice, año, kilometraje } = searchParams

    console.log('Received data:', { 
      keywords, 
      minPrice, 
      maxPrice, 
      año: año !== undefined ? `${año} (${typeof año})` : 'undefined',
      kilometraje: kilometraje !== undefined ? `${kilometraje} (${typeof kilometraje})` : 'undefined'
    })
    
    // Extract marca and modelo from keywords
    const [marca = '', modelo = ''] = keywords.split(' ').reduce((acc: string[], word: string) => {
      if (acc[0] === '') acc[0] = word
      else if (acc[1] === '') acc[1] = word
      else acc[1] += ' ' + word
      return acc
    }, ['', ''])

    // Build the Wallapop search URL with all parameters
    const searchUrl = new URL('https://es.wallapop.com/app/search')
    
    // Basic parameters
    searchUrl.searchParams.set('keywords', keywords)
    searchUrl.searchParams.set('category_ids', '100')
    searchUrl.searchParams.set('filters_source', 'quick_filters')
    searchUrl.searchParams.set('latitude', '41.224151')
    searchUrl.searchParams.set('longitude', '1.7255678')
    searchUrl.searchParams.set('distance', '200000')
    
    // Price range
    if (minPrice) {
      searchUrl.searchParams.set('min_sale_price', minPrice.toString())
      searchUrl.searchParams.set('max_sale_price', maxPrice?.toString() || '')
    }

    // Year range (±2 years)
    if (año !== undefined && !isNaN(año)) {
      const minYear = Math.max(1900, año - 2)
      const maxYear = Math.min(new Date().getFullYear(), año + 2)
      searchUrl.searchParams.set('min_year', minYear.toString())
      searchUrl.searchParams.set('max_year', maxYear.toString())
      console.log('Setting year range:', { minYear, maxYear })
    }

    // Maximum kilometers (+20%)
    if (kilometraje !== undefined && !isNaN(kilometraje)) {
      const maxKm = Math.round(kilometraje * 1.2) // Allow 20% more kilometers
      searchUrl.searchParams.set('max_km', maxKm.toString())
      console.log('Setting max km:', maxKm)
    }

    // Always set order by newest
    searchUrl.searchParams.set('order_by', 'newest')

    console.log('Final Search URL:', searchUrl.toString())

    // Launch browser with similar options to main.py
    console.log('Launching browser...')
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--window-size=1920,1080'
      ]
    })
    
    console.log('Browser launched, creating new page...')
    const page = await browser.newPage()

    // Set user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    await page.setViewport({ width: 1920, height: 1080 })

    try {
      console.log('Navigating to search URL...')
      await page.goto(searchUrl.toString(), { waitUntil: 'networkidle0', timeout: 30000 })

      // Wait for items to load (using the same selector as main.py)
      console.log('Waiting for results...')
      await page.waitForSelector('.ItemCardList__item', { timeout: 10000 })

      console.log('Extracting results...')
      const results = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.ItemCardList__item'))
        return cards.map(card => {
          // Get URL and basic validation
          const url = card.getAttribute('href')
          if (!url?.startsWith('https://es.wallapop.com/item/')) {
            return null
          }

          // Get title
          const title = card.getAttribute('title')

          // Get price
          const priceElement = card.querySelector('.ItemCard__price')
          const priceText = priceElement?.textContent || null

          // Get image
          const imgElement = card.querySelector('img')
          const imageUrl = imgElement?.getAttribute('src') || null

          // Check if highlighted
          const highlighted = !!card.querySelector('.ItemCard__highlight-text')

          // Get location
          const locationElement = card.querySelector('[data-testid="item-location"]')
          const location = locationElement?.textContent || null

          // Get description if available
          const descElement = card.querySelector('[data-testid="item-description"]')
          const description = descElement?.textContent || null

          return {
            url,
            title,
            price_raw: priceText,
            image_url: imageUrl,
            highlighted,
            location,
            description
          }
        }).filter(Boolean)
      })

      console.log(`Found ${results.length} initial results`)

      // Filter relevant results using the extracted marca and modelo
      const relevantResults = results.filter(item => 
        item && isRelevantResult(item.title, { marca, modelo })
      )

      console.log(`Found ${relevantResults.length} relevant results`)

      // Process and clean up results
      const processedResults = relevantResults
        .map(item => item && ({
          ...item,
          price: cleanPrice(item.price_raw)
        }))
        .filter(Boolean)
        .slice(0, 9)

      return NextResponse.json({ results: processedResults })
    } catch (error) {
      console.error('Error during page operations:', error)
      throw error
    }
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Error searching Wallapop' },
      { status: 500 }
    )
  } finally {
    if (browser) {
      await browser.close()
      console.log('Browser closed')
    }
  }
} 