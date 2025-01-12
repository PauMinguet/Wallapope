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
import time

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s:%(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('wallapop_search.log')
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Add debug logging for Supabase operations
logger.debug("Initializing Supabase client...")

def get_motos_from_supabase():
    """Fetch motorcycle data from Supabase"""
    supabase = init_supabase()
    response = supabase.table('motos').select("*").execute()
    
    if not response or not isinstance(response, dict):
        logger.error("Invalid response from Supabase")
        return []
    
    data = response.get('data', [])
    
    if not data:
        logger.warning("No data returned from Supabase")
        return []
        
    if data:
        logger.info(f"First moto data: {data[0]}")
        
    # Validate each motorcycle has required fields
    valid_motos = []
    for moto in data:
        if all(moto.get(field) for field in ['brand', 'model', 'price_range']):
            valid_motos.append(moto)
        else:
            logger.warning(f"Skipping invalid moto data: {moto}")
            
    if not valid_motos:
        logger.warning("No valid motorcycles found in data")
        
    return valid_motos

def init_supabase():
    """Initialize Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise Exception("Missing Supabase credentials in .env file")
        
    return create_client(supabase_url, supabase_key)

def parse_price_range(price_str):
    """Parse price range string into min and max price values"""
    # Remove '€' and spaces
    clean_str = price_str.replace('€', '').replace(' ', '')
    
    # Handle different formats
    if '-' in clean_str:
        min_str, max_str = clean_str.split('-')
        min_price = float(min_str.strip())
        max_price = float(max_str.strip())
        return (min_price, max_price)
    else:
        price = float(clean_str.strip())
        return (price, price)  # Return same value for min and max if single price

def clean_title(title):
    """Clean up motorcycle title"""
    return title.split('\n')[0].strip()

def parse_year_range(year_range):
    """Parse year range string into list of years"""
    if not year_range:
        return []
        
    try:
        # Handle ranges like "2014 - 2016"
        if '-' in year_range:
            start_year, end_year = map(int, year_range.split('-'))
            return list(range(start_year, end_year + 1))
        # Handle single years
        else:
            return [int(year_range.strip())]
    except Exception as e:
        logger.error(f"Failed to parse year range '{year_range}': {str(e)}")
        return []

def search_wallapop(moto, specific_year=None):
    """Search Wallapop for motorcycle listings for a specific year"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    
    max_retries = 3
    retry_delay = 5
    
    for attempt in range(max_retries):
        driver = None
        try:
            driver = webdriver.Chrome(options=chrome_options)
            wait = WebDriverWait(driver, 15)
            
            model = moto['model']
            brand = moto['brand']
            min_price, max_price = parse_price_range(moto['price_range'])
            
            # Include year in search terms if specified
            search_terms = f"{brand} {model}"
            if specific_year:
                search_terms += f" {specific_year}"
                
            encoded_keywords = quote(search_terms)
            
            # Calculate price range
            avg_price = (min_price + max_price) / 2
            search_min_price = int(avg_price * 0.4)
            
            url = (
                f"https://es.wallapop.com/app/search?"
                f"keywords={encoded_keywords}"
                f"&latitude=41.224151"
                f"&longitude=1.7255678"
                f"&category_ids=14000"
                f"&min_sale_price={search_min_price}"
                f"&distance=200000"
                f"&order_by=price_low_to_high"
            )
            
            print(f"\nSearching URL for year {specific_year}: {url}")
            
            driver.get(url)
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'a[href*="/item/"]')))
            
            listing_elements = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/item/"]')[:15]
            
            listings = []
            for element in listing_elements:
                image_elements = element.find_elements(By.CSS_SELECTOR, 'img[src*="cdn.wallapop.com/images/"]')
                image_urls = [img.get_attribute('src') for img in image_elements if img.get_attribute('src')]
                
                original_title = element.text
                cleaned_title = clean_title(original_title)
                
                listing = {
                    'url': element.get_attribute('href'),
                    'title': cleaned_title + '\n' + '\n'.join(original_title.split('\n')[1:]),
                    'price': element.find_element(By.CSS_SELECTOR, '[class*="price"]').text if element.find_elements(By.CSS_SELECTOR, '[class*="price"]') else None,
                    'location': element.find_element(By.CSS_SELECTOR, '[class*="location"]').text if element.find_elements(By.CSS_SELECTOR, '[class*="location"]') else None,
                    'images': image_urls,
                    'search_year': specific_year
                }
                listings.append(listing)
                print(f"Found: {listing['title']} - {listing['price']} - {listing['location']}")
            
            search_params = {
                'model': model,
                'marca': brand,
                'min_price': search_min_price,
                'max_price': int(max_price),
                'min_year': specific_year,
                'max_year': specific_year,
                'search_url': url,
                'vehicle_type': 'moto'
            }
            
            print(f"\nSearch complete for {search_terms}. Found {len(listings)} listings")
            
            return {
                'search_parameters': search_params,
                'listings': listings
            }
            
        except Exception as e:
            logger.error(f"Attempt {attempt + 1}/{max_retries} failed: {str(e)}")
            if attempt < max_retries - 1:
                logger.info(f"Waiting {retry_delay} seconds before retry...")
                time.sleep(retry_delay)
            else:
                logger.error(f"All attempts failed for {moto['model']}: {str(e)}")
                return None
                
        finally:
            if driver:
                try:
                    driver.quit()
                except Exception as e:
                    logger.error(f"Error closing driver: {str(e)}")

def parse_listing_price(price_text):
    """Parse price text into numeric value"""
    if not price_text:
        return None
    
    # Remove currency symbol and any extra text
    clean_price = price_text.replace('€', '').replace('.', '').replace(',', '.').strip()
    
    # Extract first number found
    match = re.search(r'(\d+(?:\.\d+)?)', clean_price)
    if match:
        return float(match.group(1))
    return None

def has_wrong_engine_size(title, model):
    """
    Check if the listing title contains a different engine size than the model we're searching for.
    Returns True if a wrong engine size is found.
    """
    # Extract the correct engine size from our model
    correct_size = None
    size_match = re.search(r'(\d{3,4})', model)
    if size_match:
        correct_size = size_match.group(1)
        
    if not correct_size:
        return False  # If we can't determine the correct size, don't filter
    
    # If the model name contains the engine size (like Z900, MT-07), 
    # only check for explicit mentions of different engine sizes
    if correct_size in model.replace('-', '').replace(' ', '').lower():
        title_lower = title.lower()
        # Look for patterns like "125cc", "650cc", "1000cc" that are different from our model
        size_matches = re.findall(r'(\d{3,4})\s*(?:cc|cm3)', title_lower)
        
        for size in size_matches:
            if size != correct_size:
                logger.debug(f"Found wrong engine size in title: {size} (expected {correct_size})")
                return True
                
        # Also check for A2 limitations that indicate a different engine size
        if 'a2' in title_lower and int(correct_size) > 500:  # A2 bikes are usually restricted versions
            logger.debug(f"Found A2 limitation for a {correct_size}cc bike")
            return True
            
        return False
    else:
        # For other models, use the original strict checking
        title_lower = title.lower()
        size_matches = re.findall(r'(\d{3,4})(?:\s*cc|\s*cm3)?', title_lower)
        
        for size in size_matches:
            if size != correct_size:
                logger.debug(f"Found wrong engine size in title: {size} (expected {correct_size})")
                return True
                
        return False

def store_search_results(supabase, search_params, listings):
    """Store search results in Supabase"""
    try:
        # Insert search parameters
        search_data = {
            'model': search_params['model'],
            'marca': search_params['marca'],
            'min_price': search_params['min_price'],
            'max_price': search_params['max_price'],
            'min_year': search_params['min_year'],
            'search_url': search_params['search_url'],
            'vehicle_type': search_params['vehicle_type']
        }
        
        logger.info(f"Storing search: {search_data}")
        try:
            search_response = supabase.table('searches').insert(search_data).execute()
            logger.debug(f"Raw search response: {search_response}")
            
            if hasattr(search_response, 'dict'):
                search_response = search_response.dict()
            
            if not search_response.get('data'):
                raise Exception(f"Invalid search response: {search_response}")
            
            search_id = search_response['data'][0]['id']
            logger.info(f"Created search with ID: {search_id}")
        except Exception as e:
            logger.error(f"Failed to insert search data: {str(e)}\nData: {search_data}")
            raise
        
        # Track statistics
        new_listings = 0
        duplicate_listings = 0
        
        # Insert listings
        for listing in listings:
            try:
                # Check for wrong engine sizes before processing
                if has_wrong_engine_size(listing['title'], search_params['model']):
                    logger.info(f"Skipping listing with wrong engine size: {listing['title']}")
                    continue
                    
                details = parse_listing_details(listing['title'])
                listing_data = {
                    'search_id': search_id,
                    'url': listing['url'],
                    'title': listing['title'].split('\n')[-1],
                    'price': float(details['price']) if details['price'] else None,
                    'price_text': details['price_text'],
                    'location': listing['location'],
                    'year': listing.get('search_year') or (int(details['year']) if details['year'] else None),
                    'fuel_type': details['fuel_type'],
                    'transmission': details['transmission'],
                    'power_cv': int(details['power_cv']) if details['power_cv'] else None,
                    'kilometers': int(details['kilometers']) if details['kilometers'] else None,
                    'description': details['description']
                }
                
                logger.debug(f"Attempting to insert listing with data: {listing_data}")
                
                try:
                    # Check if listing exists first
                    check_response = supabase.table('listings_motos').select('id').eq('url', listing['url']).execute()
                    logger.debug(f"Check response: {check_response}")
                    
                    if hasattr(check_response, 'dict'):
                        check_response = check_response.dict()
                    
                    if check_response.get('data') and len(check_response['data']) > 0:
                        # Update existing listing
                        existing_id = check_response['data'][0]['id']
                        logger.info(f"Found existing listing with ID: {existing_id}")
                        
                        update_response = supabase.table('listings_motos').update({
                            'search_id': search_id
                        }).eq('id', existing_id).execute()
                        
                        if hasattr(update_response, 'dict'):
                            update_response = update_response.dict()
                            
                        if update_response.get('data'):
                            logger.info(f"Updated listing {existing_id} with new search_id")
                            duplicate_listings += 1
                        continue
                    
                    # Insert new listing
                    insert_response = supabase.table('listings_motos').insert(listing_data).execute()
                    logger.debug(f"Insert response: {insert_response}")
                    
                    if hasattr(insert_response, 'dict'):
                        insert_response = insert_response.dict()
                    
                    if insert_response.get('data') and len(insert_response['data']) > 0:
                        listing_id = insert_response['data'][0]['id']
                        logger.info(f"Created new listing: {listing_data['title']} (ID: {listing_id})")
                        new_listings += 1
                        
                        # Insert images
                        for idx, image_url in enumerate(listing['images']):
                            image_data = {
                                'listing_id': listing_id,
                                'image_url': image_url,
                                'image_order': idx
                            }
                            try:
                                image_response = supabase.table('listing_images_motos').insert(image_data).execute()
                                if hasattr(image_response, 'dict'):
                                    image_response = image_response.dict()
                                logger.debug(f"Image insert response: {image_response}")
                            except Exception as img_error:
                                logger.error(f"Failed to insert image {idx}: {str(img_error)}\nImage data: {image_data}")
                    else:
                        logger.error(f"Failed to insert listing. Response: {insert_response}")
                        
                except Exception as insert_error:
                    logger.error(f"Error during listing operation: {str(insert_error)}\nFull response: {insert_response if 'insert_response' in locals() else 'No response'}\nListing data: {listing_data}")
                    continue
                    
            except Exception as e:
                logger.error(f"Error processing listing {listing['url']}: {str(e)}")
                continue
                
        logger.info(f"Search complete. New listings: {new_listings}, Duplicates skipped: {duplicate_listings}")
                    
    except Exception as e:
        logger.error(f"Error in search process: {str(e)}")
        raise

def process_all_motos():
    """Process each motorcycle from Supabase, searching by individual years"""
    supabase = init_supabase()
    motos = get_motos_from_supabase()
    
    if not motos:
        print("No motorcycles found in database. Exiting.")
        return []
        
    all_results = []
    
    for moto in motos:
        if not moto.get('model') or not moto.get('brand'):
            print(f"Skipping motorcycle with missing model or brand: {moto}")
            continue
            
        # Get list of years to search
        years = parse_year_range(moto.get('year_range'))
        if not years:
            print(f"No valid years found for {moto['brand']} {moto['model']}, searching without year...")
            result = search_wallapop(moto)
            if result and result['listings']:
                store_search_results(supabase, result['search_parameters'], result['listings'])
                all_results.append(result)
        else:
            print(f"\nSearching {moto['brand']} {moto['model']} for years: {years}")
            for year in years:
                print(f"\nSearching year {year}...")
                result = search_wallapop(moto, specific_year=year)
                if result and result['listings']:
                    # Add year to search parameters
                    result['search_parameters']['min_year'] = year
                    result['search_parameters']['max_year'] = year
                    store_search_results(supabase, result['search_parameters'], result['listings'])
                    all_results.append(result)
                else:
                    print(f"No listings found for year {year}")
    
    return all_results

def parse_listing_details(title):
    """Parse motorcycle listing details from the title"""
    details = {
        'price': None,
        'price_text': None,
        'year': None,
        'fuel_type': None,
        'transmission': None,
        'power_cv': None,
        'kilometers': None,
        'description': title  # Store full title as description for now
    }
    
    # Extract year if present (4 digit number between 1900-2025)
    year_match = re.search(r'\b(19[0-9]{2}|20[0-2][0-9])\b', title)
    if year_match:
        details['year'] = year_match.group(1)
    
    # Extract price if present
    price_match = re.search(r'(\d+(?:\.\d+)?(?:\,\d+)?)\s*€', title)
    if price_match:
        price_text = price_match.group(0)
        details['price_text'] = price_text
        # Convert price text to float
        price_value = price_text.replace('€', '').replace('.', '').replace(',', '.').strip()
        try:
            details['price'] = float(price_value)
        except ValueError:
            pass
    
    # Extract kilometers if present
    km_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:km|kms|kilometros)', title.lower())
    if km_match:
        try:
            details['kilometers'] = int(float(km_match.group(1).replace('.', '')))
        except ValueError:
            pass
    
    # Look for common fuel types
    fuel_types = ['gasolina', 'diesel', 'electrica', 'hibrida']
    for fuel in fuel_types:
        if fuel in title.lower():
            details['fuel_type'] = fuel
            break
    
    # Look for transmission type
    if any(word in title.lower() for word in ['automatica', 'automático', 'auto']):
        details['transmission'] = 'automatica'
    elif any(word in title.lower() for word in ['manual', 'cambio manual']):
        details['transmission'] = 'manual'
    
    # Extract power (CV)
    cv_match = re.search(r'(\d+)\s*(?:cv|hp)', title.lower())
    if cv_match:
        try:
            details['power_cv'] = int(cv_match.group(1))
        except ValueError:
            pass
    
    return details

def handle_supabase_response(response, operation_name="operation"):
    """Helper function to handle Supabase responses"""
    try:
        logger.debug(f"Raw {operation_name} response: {response}")
        
        if hasattr(response, 'dict'):
            response = response.dict()
            
        # Empty data array is valid for select queries
        if operation_name == 'listing check' and response.get('data') == []:
            return []
            
        if not response.get('data'):
            raise Exception(f"No data in response: {response}")
            
        return response['data']
        
    except Exception as e:
        logger.error(f"Error handling {operation_name} response: {str(e)}\nResponse: {response}")
        raise

def clean_moto_database(supabase):
    """Clean all motorcycle-related data from the database"""
    try:
        logger.info("Starting database cleanup...")
        
        # Delete in reverse order of dependencies
        try:
            logger.info("1. Deleting images...")
            supabase.table('listing_images_motos').delete().execute()
            time.sleep(1)
        except Exception as e:
            logger.error(f"Error deleting images: {str(e)}")
        
        try:
            logger.info("2. Deleting listings...")
            supabase.table('listings_motos').delete().execute()
            time.sleep(1)
        except Exception as e:
            logger.error(f"Error deleting listings: {str(e)}")
        
        try:
            logger.info("3. Deleting moto searches...")
            supabase.table('searches').delete().filter('vehicle_type', 'eq', 'moto').execute()
            time.sleep(1)
        except Exception as e:
            logger.error(f"Error deleting searches: {str(e)}")
        
        # Simple verification
        try:
            remaining_searches = len(supabase.table('searches')
                .select('id')
                .filter('vehicle_type', 'eq', 'moto')
                .execute()
                .get('data', []))
            
            remaining_listings = len(supabase.table('listings_motos')
                .select('id')
                .execute()
                .get('data', []))
                
            remaining_images = len(supabase.table('listing_images_motos')
                .select('id')
                .execute()
                .get('data', []))
            
            logger.info(f"Cleanup verification:")
            logger.info(f"- Remaining searches: {remaining_searches}")
            logger.info(f"- Remaining listings: {remaining_listings}")
            logger.info(f"- Remaining images: {remaining_images}")
            
        except Exception as e:
            logger.error(f"Error during verification: {str(e)}")
            
    except Exception as e:
        logger.error(f"Error in cleanup process: {str(e)}")
        raise

def main():
    print("Starting Wallapop motorcycle search...")
    
    # Initialize Supabase
    supabase = init_supabase()
    
    # Clean database before starting
    clean_moto_database(supabase)
    
    # Continue with search
    results = process_all_motos()
    
    print("\nSearch complete!")
    print("\nResults summary:")
    for result in results:
        params = result['search_parameters']
        print(f"\n{params['marca']} {params['model']}:")
        print(f"- Min price: {params['min_price']}€")
        print(f"- Found {len(result['listings'])} listings")

if __name__ == '__main__':
    main() 