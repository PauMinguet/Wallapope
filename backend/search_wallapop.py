from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import json
import os
from supabase_py import create_client
from urllib.parse import quote
from dotenv import load_dotenv
import re
from chrome_config import get_chrome_options, create_driver
import logging
from selenium.common.exceptions import WebDriverException
import time
import asyncio

logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

def get_cars_from_supabase():
    """Fetch car data from Supabase"""
    supabase = init_supabase()
    response = supabase.table('coches').select("*").execute()
    
    # Add error checking and logging
    if not response or not isinstance(response, dict):
        logger.error("Invalid response from Supabase")
        return []
    
    # Extract data from response
    data = response.get('data', [])
    
    if not data:
        logger.warning("No data returned from Supabase")
        return []
        
    # Log the first car to check structure
    if data:
        logger.info(f"First car data: {data[0]}")
        
    # Validate each car has required fields
    valid_cars = []
    for car in data:
        if all(car.get(field) for field in ['marca', 'modelo', 'ano_fabricacion', 'precio_compra']):
            valid_cars.append(car)
        else:
            logger.warning(f"Skipping invalid car data: {car}")
            
    if not valid_cars:
        logger.warning("No valid cars found in data")
        
    return valid_cars

def init_supabase():
    """Initialize Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise Exception("Missing Supabase credentials in .env file")
    
    try:
        # Create client without proxy argument
        return create_client(
            supabase_url=supabase_url,
            supabase_key=supabase_key
        )
    except Exception as e:
        logger.error(f"Error initializing Supabase client: {str(e)}")
        raise

def parse_listing_details(title_text):
    """Parse listing title text into structured data"""
    lines = title_text.split('\n')
    data = {
        'price_text': lines[1] if len(lines) > 1 else None,
        'year': None,
        'fuel_type': None,
        'transmission': None,
        'power_cv': None,
        'kilometers': None,
        'description': None
    }
    
    # Parse price to decimal
    if data['price_text']:
        price_str = data['price_text'].replace('€', '').replace('.', '').replace(',', '.').strip()
        try:
            data['price'] = float(price_str)
        except ValueError:
            data['price'] = None
    
    # Parse other fields
    for line in lines[2:]:
        if line.isdigit() and not data['year']:
            data['year'] = int(line)
        elif 'cv' in line.lower():
            try:
                data['power_cv'] = int(re.search(r'\d+', line).group())
            except:
                pass
        elif 'km' in line.lower():
            try:
                data['kilometers'] = int(re.search(r'\d+', line).group())
            except:
                pass
        elif any(fuel in line.lower() for fuel in ['gasolina', 'diesel', 'diésel', 'híbrido', 'eléctrico']):
            data['fuel_type'] = line
        elif any(trans in line.lower() for trans in ['manual', 'automático', 'automática']):
            data['transmission'] = line
        else:
            data['description'] = line if not data['description'] else data['description'] + ' ' + line
    
    return data

def store_search_results(supabase, search_params, listings):
    """Store search results in Supabase"""
    try:
        # Convert min_price to integer before inserting
        search_data = {
            'model': search_params['model'],
            'marca': search_params['brand'],
            'min_price': int(search_params['min_price']) if search_params['min_price'] else None,
            'max_price': int(search_params['max_price']) if search_params['max_price'] else None,
            'min_year': search_params['year'],
            'search_url': search_params['url'],
            'vehicle_type': 'car'
        }
        
        logger.debug(f"Inserting search data: {search_data}")
        search_response = supabase.table('searches').insert(search_data).execute()
        
        # More detailed response checking
        if not search_response:
            logger.error("Search response is None")
            return
            
        logger.debug(f"Raw search response: {search_response}")
        
        # Check if response has the expected structure
        if not isinstance(search_response, dict):
            logger.error(f"Unexpected response type: {type(search_response)}")
            return
            
        data = search_response.get('data')
        if not data or not isinstance(data, list) or len(data) == 0:
            logger.error(f"Invalid data in response: {data}")
            return
            
        try:
            search_id = data[0].get('id')
            if not search_id:
                logger.error("No ID found in response data")
                return
        except (IndexError, AttributeError) as e:
            logger.error(f"Error extracting ID from response: {str(e)}")
            return
            
        logger.debug(f"Created search record with ID: {search_id}")
        
        # Track statistics
        new_listings = 0
        duplicate_listings = 0
        error_listings = 0
        
        # Insert listings
        for listing in listings:
            try:
                # Check if listing already exists - Fix the duplicate check
                try:
                    existing_response = supabase.table('listings_coches').select('id').eq('url', listing['url']).execute()
                    
                    # Debug log for existing check
                    logger.debug(f"Checking existing listing with URL {listing['url']}")
                    logger.debug(f"Existing response: {existing_response}")
                    
                    # Check if there are any results in the data array
                    if (existing_response 
                        and isinstance(existing_response, dict) 
                        and existing_response.get('data') 
                        and len(existing_response['data']) > 0):
                        logger.info(f"Skipping duplicate listing: {listing['url']}")
                        duplicate_listings += 1
                        continue
                        
                except Exception as e:
                    logger.error(f"Error checking for existing listing: {str(e)}")
                    error_listings += 1
                    continue
                
                # Parse and insert new listing
                details = parse_listing_details(listing['title'])
                
                # Convert price to integer before inserting
                price = details['price']
                if price is not None:
                    try:
                        price = int(price)  # Round down to nearest integer
                    except (ValueError, TypeError):
                        logger.warning(f"Could not convert price to integer: {price}")
                        price = None
                
                listing_data = {
                    'search_id': search_id,
                    'url': listing['url'],
                    'title': listing['title'],
                    'price': price,
                    'price_text': details['price_text'],
                    'location': listing['location'],
                    'year': int(details['year']) if details['year'] else None,
                    'fuel_type': details['fuel_type'],
                    'transmission': details['transmission'],
                    'power_cv': int(details['power_cv']) if details['power_cv'] else None,
                    'kilometers': int(details['kilometers']) if details['kilometers'] else None,
                    'description': details['description']
                }
                
                logger.debug(f"Inserting listing data: {listing_data}")
                listing_response = supabase.table('listings_coches').insert(listing_data).execute()
                
                if not listing_response:
                    logger.error("Listing response is None")
                    error_listings += 1
                    continue
                    
                logger.debug(f"Raw listing response: {listing_response}")
                
                if not isinstance(listing_response, dict):
                    logger.error(f"Unexpected listing response type: {type(listing_response)}")
                    error_listings += 1
                    continue
                
                data = listing_response.get('data')
                if not data or not isinstance(data, list) or len(data) == 0:
                    logger.error(f"Invalid data in listing response: {data}")
                    error_listings += 1
                    continue
                
                try:
                    listing_id = data[0].get('id')
                    if not listing_id:
                        logger.error("No listing ID found in response data")
                        error_listings += 1
                        continue
                except (KeyError, IndexError) as e:
                    logger.error(f"Error extracting listing ID. Response data: {data}")
                    error_listings += 1
                    continue
                
                logger.debug(f"Created listing record with ID: {listing_id}")
                new_listings += 1
                
                # Insert images
                for idx, image_url in enumerate(listing['images']):
                    try:
                        image_data = {
                            'listing_id': listing_id,
                            'image_url': image_url,
                            'image_order': idx
                        }
                        image_response = supabase.table('listing_images_coches').insert(image_data).execute()
                        if not image_response or not image_response.get('data'):
                            logger.warning(f"Failed to insert image {idx} for listing {listing_id}")
                    except Exception as e:
                        logger.error(f"Error inserting image {idx}: {str(e)}")
                    
            except Exception as e:
                error_listings += 1
                logger.error(f"Error processing listing: {str(e)}", exc_info=True)
                continue
                
        logger.info(f"Storage summary: {new_listings} new, {duplicate_listings} duplicates, {error_listings} errors")
                    
    except Exception as e:
        logger.error(f"Error storing search results: {str(e)}", exc_info=True)
        logger.error(f"Failed search parameters: {search_params}")
        raise

def parse_price_range(price_str):
    """Parse price range string into min price value"""
    try:
        # Remove '€' and spaces
        clean_str = price_str.replace('€', '').replace(' ', '')
        
        # Handle different formats
        if '-' in clean_str:
            min_str, max_str = clean_str.split('-')
        elif '/' in clean_str:
            min_str, max_str = clean_str.split('/')
        else:
            # Handle single price value
            return float(clean_str.replace(',', '')) * 0.7  # 70% of target price
        
        # Convert to numbers, handling thousands separator
        min_price = float(min_str.replace(',', ''))
        max_price = float(max_str.replace(',', ''))
        
        avg_price = (min_price + max_price) / 2
        calculated_min_price = (avg_price * 0.7)  # 70% of average price
        
        return max(calculated_min_price, 0)  # Ensure min price is not negative
        
    except Exception as e:
        logger.error(f"Error parsing price range '{price_str}': {str(e)}")
        return None

def clean_title(title):
    """Clean up car title by removing everything after first parenthesis"""
    # Get first line of title
    title = title.split('\n')[0]
    
    # Remove everything after first parenthesis (including the parenthesis)
    title = title.split('(')[0].strip()
    return title

def search_wallapop(car):
    """Search Wallapop for a specific car model"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
    
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 10)
    
    try:
        # Get model and price range
        model = car['modelo']
        brand = car['marca']
        price_range = car['precio_compra']
        start_year = car['ano_fabricacion'].split('/')[0] if '/' in car['ano_fabricacion'] else car['ano_fabricacion']
        
        # Parse price range
        min_price = parse_price_range(price_range)
        if min_price is None:  # Handle error case
            logger.error(f"Could not parse price range: {price_range}")
            return None
            
        # Build search URL
        base_url = "https://es.wallapop.com/app/search"
        search_params = {
            'keywords': model,
            'latitude': '41.224151',
            'longitude': '1.7255678',
            'category_ids': '100',
            'min_sale_price': str(int(min_price)),
            'min_year': start_year,
            'max_km': '200000',
            'distance': '200000',
            'order_by': 'price_low_to_high',
            'brand': brand
        }
        
        url = f"{base_url}?{'&'.join(f'{k}={quote(str(v))}' for k, v in search_params.items())}"
        logger.debug(f"Searching URL: {url}")  # Changed to debug level
        
        driver.get(url)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'a[href*="/item/"]')))
        
        listing_elements = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/item/"]')[:5]
        
        if not listing_elements:
            logger.warning("No listings found")
            return None
            
        listings = []
        for element in listing_elements:
            try:
                image_elements = element.find_elements(By.CSS_SELECTOR, 'img[src*="cdn.wallapop.com/images/"]')
                image_urls = [img.get_attribute('src') for img in image_elements if img.get_attribute('src')]
                
                original_title = element.text
                cleaned_title = clean_title(original_title)
                
                listing = {
                    'url': element.get_attribute('href'),
                    'title': cleaned_title + '\n' + '\n'.join(original_title.split('\n')[1:]),
                    'price': element.find_element(By.CSS_SELECTOR, '[class*="price"]').text if element.find_elements(By.CSS_SELECTOR, '[class*="price"]') else None,
                    'location': element.find_element(By.CSS_SELECTOR, '[class*="location"]').text if element.find_elements(By.CSS_SELECTOR, '[class*="location"]') else None,
                    'images': image_urls
                }
                listings.append(listing)
            except Exception as e:
                logger.error(f"Error processing listing element: {str(e)}")
                continue
        
        search_params = {
            'model': model,
            'brand': brand,
            'min_price': min_price,
            'max_price': None,
            'year': start_year,
            'vehicle_type': 'car',
            'url': url
        }
        
        logger.info(f"Found {len(listings)} listings for {brand} {model}")  # Simplified log message
        
        return {
            'search_parameters': search_params,
            'listings': listings
        }
        
    except Exception as e:
        logger.error(f"Error searching for {car['modelo']}: {str(e)}")
        return None
        
    finally:
        if driver:
            driver.quit()

def search_with_retry(car, max_retries=3, delay=5):
    """Retry search with exponential backoff"""
    for attempt in range(max_retries):
        try:
            result = search_wallapop(car)
            if result:
                return result
        except WebDriverException as e:
            logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:  # Don't sleep on the last attempt
                time.sleep(delay * (2 ** attempt))  # Exponential backoff
    return None

def process_all_cars():
    """Process each car from Supabase"""
    # Initialize Supabase
    supabase = init_supabase()
    
    # Load car data from Supabase
    cars = get_cars_from_supabase()
    
    if not cars:
        logger.warning("No cars found in database. Exiting.")
        return []
        
    all_results = []
    
    # Process each car
    for car in cars:
        if not car.get('modelo') or not car.get('marca'):
            logger.warning(f"Skipping car with missing model or brand: {car}")
            continue
            
        logger.info(f"\nSearching for {car['marca']} {car['modelo']} ({car['ano_fabricacion']}, {car['precio_compra']}€)...")
        result = search_with_retry(car)
        
        if result and result['listings']:
            logger.info(f"Found {len(result['listings'])} listings")
            store_search_results(supabase, result['search_parameters'], result['listings'])
            all_results.append(result)
        else:
            logger.warning("No listings found")
    
    return all_results

def clean_car_database(supabase):
    """Clean all car-related data from the database using direct table operations"""
    try:
        logger.info("Starting car database cleanup...")
        
        # Delete in reverse order of dependencies
        try:
            logger.info("1. Deleting car images...")
            # First, get all listing IDs
            listing_ids_response = supabase.table('listings_coches').select('id').execute()
            if hasattr(listing_ids_response, 'dict'):
                listing_ids_response = listing_ids_response.dict()
            
            if listing_ids_response.get('data'):
                for listing in listing_ids_response['data']:
                    # Delete images for each listing
                    supabase.table('listing_images_coches').delete().eq('listing_id', str(listing['id'])).execute()
                    time.sleep(0.1)  # Small delay between operations
            
            # Delete any remaining images
            supabase.table('listing_images_coches').delete().gt('id', '0').execute()
            logger.debug("Images deleted")
            time.sleep(1)
        except Exception as e:
            logger.error(f"Error deleting car images: {str(e)}", exc_info=True)
        
        try:
            logger.info("2. Deleting car listings...")
            # Delete all listings
            supabase.table('listings_coches').delete().gt('id', '0').execute()
            logger.debug("Listings deleted")
            time.sleep(1)
        except Exception as e:
            logger.error(f"Error deleting car listings: {str(e)}", exc_info=True)
        
        try:
            logger.info("3. Deleting car searches...")
            # Delete car searches
            supabase.table('searches').delete().eq('vehicle_type', 'car').execute()
            logger.debug("Car searches deleted")
            time.sleep(1)
        except Exception as e:
            logger.error(f"Error deleting car searches: {str(e)}", exc_info=True)
        
        # Verify cleanup
        try:
            # Check remaining records
            image_count = len(supabase.table('listing_images_coches').select('id').execute().get('data', []))
            listing_count = len(supabase.table('listings_coches').select('id').execute().get('data', []))
            search_count = len(supabase.table('searches').select('id').eq('vehicle_type', 'car').execute().get('data', []))
            
            logger.info("Cleanup verification:")
            logger.info(f"- Remaining car images: {image_count}")
            logger.info(f"- Remaining car listings: {listing_count}")
            logger.info(f"- Remaining car searches: {search_count}")
            
            if image_count == 0 and listing_count == 0 and search_count == 0:
                logger.info("Database cleanup successful!")
            else:
                logger.error("Some records remain after cleanup")
                logger.info("Attempting final cleanup...")
                
                # Final cleanup attempt using gt instead of neq
                supabase.table('listing_images_coches').delete().gt('id', '0').execute()
                supabase.table('listings_coches').delete().gt('id', '0').execute()
                supabase.table('searches').delete().eq('vehicle_type', 'car').execute()
                
        except Exception as e:
            logger.error(f"Error verifying cleanup: {str(e)}", exc_info=True)
            
    except Exception as e:
        logger.error(f"Error in cleanup process: {str(e)}", exc_info=True)
        raise

def main():
    print("Starting Wallapop car search...")
    
    # Initialize Supabase
    supabase = init_supabase()
    
    # Clean database before starting
    clean_car_database(supabase)
    
    # Continue with search
    results = process_all_cars()
    
    # Print summary
    print("\nSearch complete!")
    print("\nResults summary:")
    for result in results:
        params = result['search_parameters']
        print(f"\n{params['model']} ({params['year']}):")
        print(f"- Price range: {params['min_price']}€ - {params['max_price']}€")
        print(f"- Found {len(result['listings'])} listings")

if __name__ == '__main__':
    main() 