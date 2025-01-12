from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import os
from supabase_py import create_client
from urllib.parse import quote
from dotenv import load_dotenv
import re
import logging
from chrome_config import get_chrome_options, create_driver
import time

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

def get_motos_from_supabase():
    """Fetch motorcycle data from Supabase"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise Exception("Missing Supabase credentials")
    
    supabase = create_client(supabase_url, supabase_key)
    response = supabase.table('motos').select("*").execute()
    
    return response.get('data', [])

def search_wallapop(moto):
    """Search Wallapop for a specific motorcycle model"""
    driver = create_driver()
    wait = WebDriverWait(driver, 10)
    
    try:
        # Get model and price
        model = moto['model']
        brand = moto['brand']
        
        # Parse price (now a single number)
        target_price = float(moto['price_range'])  # No need to clean € since it's just a number
        min_price = int(target_price * 0.7)  # Set minimum price at 70% of target
        
        # Build search URL with exact format
        base_url = "https://es.wallapop.com/app/search"
        search_params = {
            'filters_source': 'side_bar_filters',
            'keywords': model,  # Just the model name
            'latitude': '41.224151',
            'longitude': '1.7255678',
            'distance': '200000',
            'min_sale_price': str(min_price),
            'order_by': 'price_low_to_high'
        }
        
        # Add year range if available
        if 'year_range' in moto:
            year_range = moto['year_range']
            if '-' in year_range:
                min_year, max_year = year_range.split('-')
                search_params['min_year'] = min_year.strip()
                search_params['max_year'] = max_year.strip()
        
        url = f"{base_url}?{'&'.join(f'{k}={quote(str(v))}' for k, v in search_params.items())}"
        print(f"\nSearching URL: {url}")
        logger.info(f"Searching URL: {url}")
        
        driver.get(url)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'a[href*="/item/"]')))
        
        listing_elements = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/item/"]')[:10]
        
        listings = []
        for element in listing_elements:
            try:
                listing = {
                    'url': element.get_attribute('href'),
                    'title': element.text,
                    'price': element.find_element(By.CSS_SELECTOR, '[class*="price"]').text if element.find_elements(By.CSS_SELECTOR, '[class*="price"]') else None,
                    'location': element.find_element(By.CSS_SELECTOR, '[class*="location"]').text if element.find_elements(By.CSS_SELECTOR, '[class*="location"]') else None,
                    'images': [img.get_attribute('src') for img in element.find_elements(By.CSS_SELECTOR, 'img[src*="cdn.wallapop.com/images/"]') if img.get_attribute('src')]
                }
                listings.append(listing)
                print(f"Found: {listing['title']} - {listing['price']} - {listing['location']}")
                
            except Exception as e:
                logger.error(f"Error processing listing element: {str(e)}")
                continue
        
        # Create search parameters dictionary with all required fields
        search_parameters = {
            'model': model,
            'brand': brand,
            'min_price': min_price,
            'target_price': target_price,
            'search_url': url
        }
        
        # Verify all required fields are present
        logger.info("Verifying search parameters:")
        for key, value in search_parameters.items():
            logger.info(f"  {key}: {value}")
            if value is None:
                logger.error(f"Missing required field: {key}")
                raise ValueError(f"Missing required field: {key}")
        
        print(f"\nSearch complete for {model}. Found {len(listings)} listings")
        
        return {
            'search_parameters': search_parameters,
            'listings': listings
        }
        
    except Exception as e:
        logger.error(f"Error searching for {moto['brand']} {moto['model']}: {str(e)}")
        return None
        
    finally:
        if driver:
            driver.quit()

def parse_listing_details(title_text):
    """Parse listing details from title"""
    details = {
        'year': None,
        'fuel_type': None,
        'transmission': None,
        'power_cv': None,
        'kilometers': None,
        'description': title_text,
        'price_text': None
    }
    
    # Try to extract year (4 digits)
    year_match = re.search(r'\b(19|20)\d{2}\b', title_text)
    if year_match:
        details['year'] = int(year_match.group())
    
    # Common fuel types in Spanish
    fuel_types = ['gasolina', 'diesel', 'diésel', 'híbrido', 'eléctrico']
    for fuel in fuel_types:
        if fuel.lower() in title_text.lower():
            details['fuel_type'] = fuel
            break
    
    # Look for transmission type
    if any(word in title_text.lower() for word in ['manual', 'cambio manual']):
        details['transmission'] = 'manual'
    elif any(word in title_text.lower() for word in ['automático', 'automatico', 'auto']):
        details['transmission'] = 'automático'
    
    # Try to extract power (CV)
    cv_match = re.search(r'(\d+)\s*[cC][vV]', title_text)
    if cv_match:
        details['power_cv'] = int(cv_match.group(1))
    
    # Try to extract kilometers
    km_match = re.search(r'(\d+[\d.,]*)\s*[kK][mM]', title_text)
    if km_match:
        km_str = km_match.group(1).replace('.', '').replace(',', '')
        details['kilometers'] = int(km_str)
    
    return details

def store_search_results(supabase, search_params, listings):
    """Store search results in Supabase"""
    try:
        # Insert search parameters matching the actual schema
        search_data = {
            'model': f"{search_params['brand']} {search_params['model']}",  # Combined model name
            'marca': search_params['brand'],  # 'marca' is brand in Spanish
            'min_price': search_params['min_price'],
            'max_price': int(search_params['target_price']),  # Using target price as max_price
            'search_url': search_params['search_url'],
            'vehicle_type': 'moto'
        }
        
        # Add year range if available
        if 'min_year' in search_params:
            search_data['min_year'] = int(search_params['min_year'])
        
        logger.info("Attempting to insert search data:")
        logger.info(str(search_data))
        
        try:
            search_response = supabase.table('searches').insert(search_data).execute()
            
            if not isinstance(search_response, dict):
                search_response = search_response.dict()
            
            logger.info(f"Search response received: {search_response}")
            
            if not search_response.get('data'):
                logger.error("No data in search response")
                logger.error(f"Full response: {search_response}")
                raise Exception("No data returned from search insert")
            
            search_id = search_response['data'][0]['id']
            logger.info(f"Created search with ID: {search_id}")
            
        except Exception as e:
            logger.error(f"Error inserting search: {str(e)}")
            logger.error(f"Search data that failed: {search_data}")
            logger.error(f"Response if available: {search_response if 'search_response' in locals() else 'No response'}")
            raise
        
        # Track statistics
        new_listings = 0
        duplicate_listings = 0
        
        # Insert listings
        for listing in listings:
            try:
                # Check if listing already exists
                existing_response = supabase.table('listings_motos').select('id').eq('url', listing['url']).execute()
                
                if existing_response.get('data'):
                    duplicate_listings += 1
                    continue
                
                # Parse price and additional details
                price_text = listing['price']
                clean_price = price_text.replace('€', '').replace('.', '').replace(',', '.').strip()
                try:
                    price = float(clean_price)
                except:
                    logger.warning(f"Could not parse price: {price_text}")
                    price = None
                
                # Parse additional details from title
                details = parse_listing_details(listing['title'])
                
                # Calculate price difference if target price available
                price_difference = None
                if price and search_params['target_price']:
                    price_difference = int(search_params['target_price'] - price)
                
                # Insert new listing with all fields
                listing_data = {
                    'search_id': search_id,
                    'url': listing['url'],
                    'title': listing['title'],
                    'price': price,
                    'price_text': price_text,
                    'location': listing['location'],
                    'year': details['year'],
                    'fuel_type': details['fuel_type'],
                    'transmission': details['transmission'],
                    'power_cv': details['power_cv'],
                    'kilometers': details['kilometers'],
                    'description': details['description'],
                    'price_difference': price_difference
                }
                
                try:
                    listing_response = supabase.table('listings_motos').insert(listing_data).execute()
                    if listing_response.get('data'):
                        listing_id = listing_response['data'][0]['id']
                        new_listings += 1
                        
                        # Insert images
                        for idx, image_url in enumerate(listing['images']):
                            image_data = {
                                'listing_id': listing_id,
                                'image_url': image_url,
                                'image_order': idx
                            }
                            supabase.table('listing_images_motos').insert(image_data).execute()
                except Exception as e:
                    logger.error(f"Error inserting listing: {str(e)}")
                    logger.error(f"Listing data: {listing_data}")
                    continue
                
            except Exception as e:
                logger.error(f"Error processing listing: {str(e)}")
                logger.error(f"Raw listing: {listing}")
                continue
        
        return new_listings, duplicate_listings
                    
    except Exception as e:
        logger.error(f"Error storing search results: {str(e)}")
        logger.error(f"Search params: {search_params}")
        logger.error(f"First listing example: {listings[0] if listings else 'No listings'}")
        return 0, 0

def cleanup_old_data(supabase, moto):
    """Clean up old data for this motorcycle model before new search"""
    try:
        full_model = f"{moto['brand']} {moto['model']}"
        logger.info(f"Cleaning up old data for {full_model}")
        
        # Get all search IDs for this model
        searches = supabase.table('searches')\
            .select('id')\
            .eq('model', full_model)\
            .eq('vehicle_type', 'moto')\
            .execute()
            
        # Convert response to dict if needed
        if not isinstance(searches, dict):
            searches = searches.dict()
        
        if searches.get('data'):
            # Make sure we're handling the data correctly
            logger.info(f"Raw search response: {searches}")
            
            # Handle different possible response formats
            if isinstance(searches['data'], list):
                search_ids = [s['id'] for s in searches['data']]
            else:
                logger.warning(f"Unexpected search data format: {type(searches['data'])}")
                return
                
            logger.info(f"Found {len(search_ids)} old searches to clean up")
            
            # Delete related images first (due to foreign key constraints)
            for search_id in search_ids:
                # Get listings for this search
                listings = supabase.table('listings_motos')\
                    .select('id')\
                    .eq('search_id', search_id)\
                    .execute()
                
                if not isinstance(listings, dict):
                    listings = listings.dict()
                
                if listings.get('data'):
                    listing_ids = [l['id'] for l in listings['data']]
                    if listing_ids:
                        # Delete images for these listings
                        supabase.table('listing_images_motos')\
                            .delete()\
                            .in_('listing_id', listing_ids)\
                            .execute()
                
                # Delete listings for this search
                supabase.table('listings_motos')\
                    .delete()\
                    .eq('search_id', search_id)\
                    .execute()
            
            # Finally delete the searches
            if search_ids:
                supabase.table('searches')\
                    .delete()\
                    .in_('id', search_ids)\
                    .execute()
            
            logger.info("Cleanup completed successfully")
            
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")
        logger.error(f"Search response: {searches if 'searches' in locals() else 'No response'}")
        raise

def cleanup_all_moto_data(supabase):
    """Clean up all motorcycle-related data before starting new search"""
    try:
        print("\n=== Starting complete cleanup of all motorcycle data ===")
        
        # First verify we can connect and read data
        try:
            searches = supabase.table('searches').select('id').execute()
            listings = supabase.table('listings_motos').select('id').execute()
            images = supabase.table('listing_images_motos').select('id').execute()
        except Exception as e:
            print(f"Error accessing tables: {str(e)}")
            raise
            
        search_count = len(searches['data']) if searches.get('data') else 0
        listing_count = len(listings['data']) if listings.get('data') else 0
        image_count = len(images['data']) if images.get('data') else 0
        
        print(f"Current database state:")
        print(f"- {search_count} searches found")
        print(f"- {listing_count} listings found")
        print(f"- {image_count} images found")
            
        print("\nDeleting data...")
        
        try:
            # Delete using raw SQL in correct order
            sql_delete_images = "DELETE FROM listing_images_motos"
            sql_delete_listings = "DELETE FROM listings_motos"
            sql_delete_searches = "DELETE FROM searches WHERE vehicle_type = 'moto'"
            
            # Execute deletions
            supabase.table('listing_images_motos').select('*').execute().data
            supabase.postgrest.rpc('exec_sql', {'query': sql_delete_images}).execute()
            print("✓ Deleted all listing images")
            
            supabase.table('listings_motos').select('*').execute().data
            supabase.postgrest.rpc('exec_sql', {'query': sql_delete_listings}).execute()
            print("✓ Deleted all listings")
            
            supabase.table('searches').select('*').execute().data
            supabase.postgrest.rpc('exec_sql', {'query': sql_delete_searches}).execute()
            print("✓ Deleted all moto searches")
            
            # Verify deletion
            verify_images = supabase.table('listing_images_motos').select('id').execute()
            verify_listings = supabase.table('listings_motos').select('id').execute()
            verify_searches = supabase.table('searches').select('id').eq('vehicle_type', 'moto').execute()
            
            print("\nVerification after deletion:")
            print(f"- Images remaining: {len(verify_images.get('data', []))}")
            print(f"- Listings remaining: {len(verify_listings.get('data', []))}")
            print(f"- Moto searches remaining: {len(verify_searches.get('data', []))}")
            
        except Exception as e:
            print(f"Error during deletion: {str(e)}")
            print(f"Full error details: {str(e.__dict__)}")
            raise
            
        print("\n=== Cleanup completed successfully ===")
        
    except Exception as e:
        print(f"\nERROR during cleanup: {str(e)}")
        raise

def process_all_motos():
    """Process each motorcycle from Supabase"""
    motos = get_motos_from_supabase()
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    
    if not motos:
        logger.warning("No motorcycles found in database")
        return []
    
    all_results = []
    for moto in motos:
        if not moto.get('model') or not moto.get('brand') or not moto.get('price_range'):
            logger.warning(f"Skipping motorcycle with missing required data: {moto}")
            continue
        
        # Clean up old data before new search
        cleanup_old_data(supabase, moto)
            
        print(f"\n{'='*50}")
        print(f"Searching for {moto['brand']} {moto['model']}")
        print(f"Target price: {moto['price_range']}")
        print(f"Year range: {moto.get('year_range', 'Not specified')}")
        print(f"{'='*50}")
        
        logger.info(f"\nSearching for {moto['brand']} {moto['model']} (Target: {moto['price_range']})")
        result = search_wallapop(moto)
        
        if result and result['listings']:
            total_listings = len(result['listings'])
            logger.info(f"Found {total_listings} listings")
            
            # Store results and get statistics
            new_listings, duplicate_listings = store_search_results(supabase, result['search_parameters'], result['listings'])
            
            print(f"Found {total_listings} listings:")
            print(f"- {new_listings} new listings stored")
            print(f"- {duplicate_listings} duplicate listings skipped")
            
            result['statistics'] = {
                'total_listings': total_listings,
                'new_listings': new_listings,
                'duplicate_listings': duplicate_listings
            }
            
            all_results.append(result)
        else:
            print("No listings found")
    
    return all_results

def main():
    print("\n=== Starting Wallapop motorcycle search ===")
    
    # Initialize Supabase
    print("Initializing Supabase connection...")
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    print("✓ Supabase connection initialized")
    
    # Clean everything first
    print("\nStarting database cleanup...")
    try:
        cleanup_all_moto_data(supabase)
        print("Waiting for cleanup to complete...")
        time.sleep(2)  # Give Supabase time to process deletions
    except Exception as e:
        print(f"Error during cleanup: {str(e)}")
        return
    
    # Continue with the search
    print("\n=== Starting motorcycle searches ===")
    results = process_all_motos()
    
    print("\nSearch complete!")
    print("\nResults summary:")
    for result in results:
        params = result['search_parameters']
        print(f"\n{params['brand']} {params['model']}:")
        print(f"- Min price: {params['min_price']}€")
        print(f"- Found {len(result['listings'])} listings")

if __name__ == '__main__':
    main() 