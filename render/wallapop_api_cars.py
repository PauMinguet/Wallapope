import requests
from datetime import datetime
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import logging
from urllib.parse import quote

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Define unwanted keywords as a global constant
UNWANTED_KEYWORDS = [
    'accidentado', 'accidentada', 'inundado', 'accidente', 'inundó', 'flexicar', 'dana', 'averias', 'golpe', 'averia', 'gripado', 
    'gripada', 'despiece', 'no arranca', 'averiado', 'cambiar motor', '¡No contesto mensajes!', 'averiada', '647 358 133', 'mallorca', 'palma'
]

def init_supabase() -> Client:
    """Initialize Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise Exception("Missing Supabase credentials in .env file")
        
    return create_client(supabase_url, supabase_key)

def api_url_to_frontend_url(api_url):
    """Convert Wallapop API URL to frontend URL"""
    return api_url.replace(
        "api.wallapop.com/api/v3/cars/search",
        "es.wallapop.com/app/search"
    ).split("&filters_source=")[0]

def has_unwanted_keywords(text: str, unwanted_keywords: list) -> bool:
    """Check if text contains any unwanted keywords"""
    if not text:
        return False
    
    text = text.lower()
    return any(keyword in text for keyword in unwanted_keywords)

def insert_search_results(supabase: Client, search_params, listings):
    """Insert search results into database using batch operations"""
    stats = {
        'new_listings': 0,
        'existing_listings': 0,
        'failed_listings': 0,
        'filtered_listings': 0,
        'images_inserted': 0
    }
    
    try:
        # Insert search record with frontend_url
        frontend_url = api_url_to_frontend_url(search_params['url'])
        search_data = {
            'brand': search_params['brand'],
            'model': search_params['model'],
            'min_price': search_params['min_price'],
            'min_year': search_params['min_year'],
            'search_url': search_params['url'],
            'frontend_url': frontend_url,
            'price_range_min': search_params['price_range_min'],
            'market_price': search_params['market_price'],
            'search_parameters': search_params
        }
        
        search_response = supabase.table('car_searches').insert(search_data).execute()
        search_id = search_response.data[0]['id']
        
        # Prepare batch data
        new_listings_data = []
        images_data = []
        
        # Get all existing external_ids in one query
        external_ids = [listing['content']['id'] for listing in listings]
        existing_listings = supabase.table('car_listings')\
            .select('id,external_id')\
            .in_('external_id', external_ids)\
            .execute()
        
        existing_ids = {item['external_id']: item['id'] for item in existing_listings.data}
        
        # Process each listing
        for listing in listings:
            content = listing['content']
            external_id = content['id']
            
            # Handle kilometer conversion for low values
            kilometers = int(content['km'])
            if kilometers < 1000 and kilometers >= 200:
                kilometers *= 1000  # Convert to actual kilometers
            elif kilometers <= 200:
                logger.info(f"Filtering out listing {external_id} - likely new car with {kilometers}km")
                stats['filtered_listings'] += 1
                continue

            # Skip if kilometers > 200000
            if kilometers > 200000:
                logger.info(f"Filtering out listing {external_id} - too many kilometers: {kilometers}")
                stats['filtered_listings'] += 1
                continue

            # Check for unwanted keywords in title and description
            title = content['title'].lower()
            description = content.get('storytelling', '').lower()
            
            if has_unwanted_keywords(title, UNWANTED_KEYWORDS) or \
               has_unwanted_keywords(description, UNWANTED_KEYWORDS):
                logger.info(f"Filtering out listing {external_id} due to unwanted keywords")
                stats['filtered_listings'] += 1
                continue
            
            if external_id in existing_ids:
                logger.info(f"Listing {external_id} already exists, skipping...")
                stats['existing_listings'] += 1
                continue
            
            # Prepare listing data
            listing_data = {
                'search_id': search_id,
                'external_id': external_id,
                'title': content['title'],
                'description': content.get('storytelling', ''),
                'price': float(content['price']),
                'currency': content['currency'],
                'web_slug': content['web_slug'],
                'distance': float(content['distance']),
                'location': {
                    'postal_code': content['location']['postal_code'],
                    'city': content['location']['city'],
                    'country_code': content['location']['country_code']
                },
                'brand': content['brand'],
                'model': content['model'],
                'year': int(content['year']),
                'version': content.get('version', ''),
                'kilometers': kilometers,
                'engine_type': content.get('engine', ''),
                'gearbox': content.get('gearbox', ''),
                'horsepower': float(content.get('horsepower', 0)),
                'seller_info': {
                    'id': content['user']['id'],
                    'micro_name': content['user']['micro_name'],
                    'image': content['user']['image'],
                    'online': content['user']['online'],
                    'kind': content['user']['kind']
                },
                'flags': content['flags'],
                'external_created_at': content['creation_date'],
                'external_updated_at': content['modification_date']
            }
            
            new_listings_data.append(listing_data)
            stats['new_listings'] += 1
            
        # Batch insert new listings
        if new_listings_data:
            logger.info(f"Inserting {len(new_listings_data)} new listings in batch...")
            listings_response = supabase.table('car_listings').insert(new_listings_data).execute()
            
            # Prepare images data for batch insert
            for idx, new_listing in enumerate(listings_response.data):
                listing_id = new_listing['id']
                original_listing = listings[idx]
                
                for img_idx, image in enumerate(original_listing['content']['images']):
                    images_data.append({
                        'listing_id': listing_id,
                        'image_urls': image,
                        'image_order': img_idx
                    })
                    stats['images_inserted'] += 1
            
            # Batch insert images in chunks of 50
            if images_data:
                chunk_size = 50
                for i in range(0, len(images_data), chunk_size):
                    chunk = images_data[i:i + chunk_size]
                    logger.info(f"Inserting batch of {len(chunk)} images...")
                    supabase.table('car_images').insert(chunk).execute()
        
        logger.info(f"Search results summary:")
        logger.info(f"- New listings: {stats['new_listings']}")
        logger.info(f"- Existing listings: {stats['existing_listings']}")
        logger.info(f"- Filtered listings: {stats['filtered_listings']}")
        logger.info(f"- Failed listings: {stats['failed_listings']}")
        logger.info(f"- Images inserted: {stats['images_inserted']}")
        
        return search_id
        
    except Exception as e:
        logger.error(f"Error inserting search results: {str(e)}", exc_info=True)
        return None

def parse_price_range(price_str):
    """Parse price range string into min price value"""
    try:
        # Remove currency symbol and spaces
        clean_str = price_str.replace('€', '').replace(' ', '')
        
        # Handle different formats
        if '-' in clean_str:
            min_str, _ = clean_str.split('-')
        elif '/' in clean_str:
            min_str, _ = clean_str.split('/')
        else:
            return float(clean_str.replace(',', ''))
        
        # Convert to float, handling comma as decimal separator
        return float(min_str.replace(',', ''))
        
    except Exception as e:
        logger.error(f"Error parsing price range '{price_str}': {str(e)}")
        return None

def search_wallapop_cars(car, market_data):
    """Search Wallapop for cars with market price limits"""
    try:
        # Parse year range
        year_range = car['ano_fabricacion']
        if '/' in year_range:
            start_year, end_year = year_range.split('/')
        elif '-' in year_range:
            start_year, end_year = year_range.split('-')
        else:
            start_year = end_year = year_range
            
        start_year = start_year.strip()
        end_year = end_year.strip()

        # Calculate price limits based on market price
        market_price = market_data['market_price']
        min_price = market_price * 0.5  # 50% of market price
        max_price = market_price * 0.9  # 90% of market price (10% below)

        # Build search URL
        base_url = "https://api.wallapop.com/api/v3/cars/search"
        search_params = {
            'keywords': car['modelo'],
            'brand': car['marca'],
            'latitude': '41.224151',
            'longitude': '1.7255678',
            'category_ids': '100',
            'distance': '200000',
            'min_year': start_year,
            'max_year': end_year,
            'max_km': '200000',
            'min_sale_price': int(min_price),
            'max_sale_price': int(max_price),
            'order_by': 'price_low_to_high'
        }

        # Add engine type if specified
        if 'combustible' in car:
            if car['combustible'] == 'Diésel':
                search_params['engine'] = 'gasoil'
            elif car['combustible'] == 'Gasolina':
                search_params['engine'] = 'gasoline'

        url = f"{base_url}?{'&'.join(f'{k}={quote(str(v))}' for k, v in search_params.items())}"
        logger.info(f"\nListing search URL: {url}")
        
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        search_results = data.get('search_objects', [])
        
        return {
            'search_parameters': {
                'brand': car['marca'],
                'model': car['modelo'],
                'min_price': min_price,
                'max_price': max_price,
                'market_price': market_price,
                'min_year': start_year,
                'max_year': end_year,
                'url': response.url,
                'price_range_min': market_price
            },
            'listings': search_results
        }
        
    except Exception as e:
        logger.error(f"Error searching Wallapop: {str(e)}", exc_info=True)
        return None

def get_cars_from_supabase():
    """Fetch car data from Supabase"""
    supabase = init_supabase()
    try:
        response = supabase.table('coches').select('*').execute()
        data = response.data
        
        if not data:
            logger.warning("No data returned from Supabase")
            return []
        
        valid_cars = []
        for car in data:
            required_fields = ['marca', 'modelo', 'ano_fabricacion', 'precio_compra']
            if all(car.get(field) for field in required_fields):
                valid_cars.append(car)
            else:
                missing_fields = [field for field in required_fields if not car.get(field)]
                logger.warning(f"Skipping car with missing fields {missing_fields}: {car}")
        
        logger.info(f"Found {len(valid_cars)} valid cars in database")
        return valid_cars
        
    except Exception as e:
        logger.error(f"Error fetching cars from Supabase: {str(e)}", exc_info=True)
        return []

def insert_images_batch(supabase: Client, listing_id: str, images: list):
    """Insert images in batch for better performance"""
    image_data = [
        {
            'listing_id': listing_id,
            'image_urls': image,
            'image_order': idx
        }
        for idx, image in enumerate(images)
    ]
    
    if image_data:
        supabase.table('car_images').insert(image_data).execute()

def get_market_price(car):
    """Get market price using relevance-based search"""
    try:
        # Parse year range
        year_range = car['ano_fabricacion']
        if '/' in year_range:
            start_year, end_year = year_range.split('/')
        elif '-' in year_range:
            start_year, end_year = year_range.split('-')
        else:
            start_year = end_year = year_range
            
        # Build search URL for market analysis
        base_url = "https://api.wallapop.com/api/v3/cars/search"
        search_params = {
            'model': car['modelo'],
            'brand': car['marca'],
            'latitude': '41.224151',
            'longitude': '1.7255678',
            'category_ids': '100',
            'distance': '100000',
            'min_year': start_year.strip(),
            'max_year': end_year.strip(),
            'max_km': '200000',
            'order_by': 'price_low_to_high',
            'min_sale_price': '3000',
        }

        # Add engine type if specified
        if 'combustible' in car:
            if car['combustible'] == 'Diésel':
                search_params['engine'] = 'gasoil'
            elif car['combustible'] == 'Gasolina':
                search_params['engine'] = 'gasoline'

        url = f"{base_url}?{'&'.join(f'{k}={quote(str(v))}' for k, v in search_params.items())}"
        logger.info(f"\nMarket price search URL: {url}")
        
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        # Filter and process listings
        valid_prices = []
        for listing in data.get('search_objects', [])[:15]:  # Only use first 20 listings
            content = listing['content']
            
            # Apply same filtering as main search
            kilometers = int(content['km'])
            if kilometers < 1000 and kilometers >= 200:
                kilometers *= 1000
            elif kilometers <= 200 or kilometers > 200000:
                continue

            # Skip unwanted listings
            if has_unwanted_keywords(content['title'], UNWANTED_KEYWORDS) or \
               has_unwanted_keywords(content.get('storytelling', ''), UNWANTED_KEYWORDS):
                continue

            valid_prices.append(float(content['price']))

        if valid_prices:
            avg_price = sum(valid_prices) / len(valid_prices)
            market_price = avg_price * 0.9  # 90% of average price
            return {
                'market_price': market_price,
                'sample_size': len(valid_prices),
                'min_price': market_price * 0.5,
                'max_price': market_price,
                'raw_average': avg_price
            }
        return None

    except Exception as e:
        logger.error(f"Error getting market price: {str(e)}", exc_info=True)
        return None

def update_search_params_with_market_price(search_params, market_data):
    """Update search parameters with market-based price limits"""
    if market_data:
        search_params['min_sale_price'] = int(market_data['min_price'])
        search_params['max_sale_price'] = int(market_data['max_price'])
    return search_params

def insert_market_price(supabase: Client, search_id: str, market_data: dict):
    """Insert market price data into database"""
    try:
        data = {
            'search_id': search_id,
            'market_price': market_data['market_price'],
            'sample_size': market_data['sample_size'],
            'raw_average': market_data['raw_average'],
            'timestamp': datetime.now().isoformat()
        }
        supabase.table('car_market_price').insert(data).execute()
        logger.info(f"Inserted market price data for search {search_id}")
    except Exception as e:
        logger.error(f"Error inserting market price: {str(e)}", exc_info=True)

def clear_tables(supabase: Client):
    """Clear all data from tables we're writing to"""
    try:
        # Delete in correct order to respect foreign key constraints
        tables = ['car_images', 'car_market_price', 'car_listings', 'car_searches']
        for table in tables:
            logger.info(f"Clearing table: {table}")
            # Use RPC call to truncate table
            supabase.rpc('truncate_table', {'table_name': table}).execute()
        logger.info("Successfully cleared all tables")
    except Exception as e:
        logger.error(f"Error clearing tables: {str(e)}")

def main():
    logger.info("Starting Wallapop car searches...")
    supabase = init_supabase()
    
    # Clear all tables before starting
    clear_tables(supabase)
    
    cars = get_cars_from_supabase()
    
    if not cars:
        logger.warning("No cars found in database")
        return
    
    # Remove HTTP request logging for Supabase
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)
    
    successful_searches = 0
    failed_searches = 0
    
    for car in cars:
        logger.info(f"\nProcessing {car['marca']} {car['modelo']}...")
        
        # First get market price
        market_data = get_market_price(car)
        if market_data:
            logger.info(f"Market price analysis: {market_data}")
            
            # Search with price limits based on market price
            result = search_wallapop_cars(car, market_data)
            if result and result['listings']:
                search_id = insert_search_results(supabase, result['search_parameters'], result['listings'])
                if search_id:
                    insert_market_price(supabase, search_id, market_data)
                    successful_searches += 1
                else:
                    failed_searches += 1
            else:
                failed_searches += 1
        else:
            failed_searches += 1
            logger.warning(f"Could not determine market price for {car['marca']} {car['modelo']}")
    
    logger.info("\nSearch summary:")
    logger.info(f"Successful searches: {successful_searches}")
    logger.info(f"Failed searches: {failed_searches}")
    logger.info(f"Total searches: {successful_searches + failed_searches}")

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    main() 