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
from chrome_config import get_chrome_options, get_chrome_service
import logging
from selenium.common.exceptions import WebDriverException
import time

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
        # Insert search parameters
        search_data = {
            'model': search_params['model'],
            'marca': search_params['brand'],
            'min_price': search_params['min_price'],
            'max_price': search_params['max_price'],
            'min_year': search_params['year'],
            'search_url': search_params['url'],
            'vehicle_type': 'car'
        }
        
        logger.info(f"Storing search: {search_data}")
        search_response = supabase.table('searches').insert(search_data).execute()
        
        if not isinstance(search_response, dict):
            search_response = search_response.dict()
            
        search_id = search_response['data'][0]['id']
        logger.info(f"Created search with ID: {search_id}")
        
        # Track statistics
        new_listings = 0
        duplicate_listings = 0
        
        # Insert listings
        for listing in listings:
            try:
                # Check if listing already exists
                existing_response = supabase.table('listings_coches').select('id').eq('url', listing['url']).execute()
                
                if not isinstance(existing_response, dict):
                    existing_response = existing_response.dict()
                
                if existing_response.get('data'):
                    logger.info(f"Skipping duplicate listing: {listing['url']}")
                    duplicate_listings += 1
                    continue
                
                # Parse and insert new listing
                details = parse_listing_details(listing['title'])
                listing_data = {
                    'search_id': search_id,
                    'url': listing['url'],
                    'title': listing['title'],
                    'price': float(details['price']) if details['price'] else None,
                    'price_text': details['price_text'],
                    'location': listing['location'],
                    'year': int(details['year']) if details['year'] else None,
                    'fuel_type': details['fuel_type'],
                    'transmission': details['transmission'],
                    'power_cv': int(details['power_cv']) if details['power_cv'] else None,
                    'kilometers': int(details['kilometers']) if details['kilometers'] else None,
                    'description': details['description']
                }
                
                try:
                    listing_response = supabase.table('listings_coches').insert(listing_data).execute()
                    if listing_response.get('data'):
                        listing_id = listing_response['data'][0]['id']
                        logger.info(f"Created new listing: {listing_data['title']} (ID: {listing_id})")
                        new_listings += 1
                        
                        # Insert images
                        for idx, image_url in enumerate(listing['images']):
                            image_data = {
                                'listing_id': listing_id,
                                'image_url': image_url,
                                'image_order': idx
                            }
                            supabase.table('listing_images_coches').insert(image_data).execute()
                            
                except Exception as insert_error:
                    if 'unique constraint' in str(insert_error).lower():
                        logger.info(f"Duplicate listing detected during insert: {listing['url']}")
                        duplicate_listings += 1
                    else:
                        logger.error(f"Error inserting listing: {str(insert_error)}")
                    continue
                    
            except Exception as e:
                logger.error(f"Error processing listing {listing['url']}: {str(e)}")
                continue
                
        logger.info(f"Search complete. New listings: {new_listings}, Duplicates skipped: {duplicate_listings}")
                    
    except Exception as e:
        logger.error(f"Error in search process: {str(e)}")

def parse_price_range(price_str):
    """Parse price range string into min price value"""
    # Remove '€' and spaces
    clean_str = price_str.replace('€', '').replace(' ', '')
    
    # Handle different formats
    if '-' in clean_str:
        min_str, max_str = clean_str.split('-')
    elif '/' in clean_str:
        min_str, max_str = clean_str.split('/')
    else:
        raise ValueError(f"Unexpected price format: {price_str}")
    
    # Convert to numbers, handling thousands separator
    def parse_price(price_str):
        price_str = price_str.strip().replace(',', '')
        return float(price_str)
    
    min_price = parse_price(min_str)
    max_price = parse_price(max_str)
    
    avg_price = (min_price + max_price) / 2
    calculated_min_price = (avg_price / 2)
    
    return max(calculated_min_price, 0)  # Ensure min price is not negative

def clean_title(title):
    """Clean up car title by removing everything after first parenthesis"""
    # Get first line of title
    title = title.split('\n')[0]
    
    # Remove everything after first parenthesis (including the parenthesis)
    title = title.split('(')[0].strip()
    return title

def search_wallapop(car):
    """Search Wallapop for car listings using Selenium"""
    chrome_options = get_chrome_options()
    service = get_chrome_service()
    
    try:
        driver = webdriver.Chrome(
            service=service,
            options=chrome_options
        )
        
        # Increase timeouts
        driver.set_page_load_timeout(30)
        wait = WebDriverWait(driver, 30)  # Increased timeout to 30 seconds
        
        # Add error handling and logging
        logger.info(f"Starting search for {car['marca']} {car['modelo']}")
        
        # Get parameters from the car data
        model = car['modelo']  # Just the model name
        brand = car['marca']   # Brand is now a separate field
        min_price = parse_price_range(car['precio_compra'])
        start_year = car['ano_fabricacion'].split('/')[0]
        
        # Use only the model for search keywords
        encoded_keywords = quote(model)
        encoded_brand = quote(brand)
        
        url = (
            f"https://es.wallapop.com/app/search?"
            f"keywords={encoded_keywords}"
            f"&latitude=41.224151"
            f"&longitude=1.7255678"
            f"&category_ids=100"
            f"&min_sale_price={int(min_price)}"
            f"&min_year={start_year}"
            f"&max_km=200000"
            f"&distance=200000"
            f"&order_by=price_low_to_high"
            f"&brand={encoded_brand}"  # Use the brand from marca field
        )
        
        print(f"\nSearching URL: {url}")
        
        # Navigate to search page
        driver.get(url)
        
        # Wait for listings to load
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'a[href*="/item/"]')))
        
        # Get all listing elements (limit to first 5)
        listing_elements = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/item/"]')[:5]
        
        # Extract information from listings
        listings = []
        for element in listing_elements:
            # Get image URLs from the listing card
            image_elements = element.find_elements(By.CSS_SELECTOR, 'img[src*="cdn.wallapop.com/images/"]')
            image_urls = [img.get_attribute('src') for img in image_elements if img.get_attribute('src')]
            
            original_title = element.text
            cleaned_title = clean_title(original_title.split('\n')[0])  # Clean only the first line which is the title
            
            listing = {
                'url': element.get_attribute('href'),
                'title': cleaned_title + '\n' + '\n'.join(original_title.split('\n')[1:]),  # Keep the rest of the text
                'price': element.find_element(By.CSS_SELECTOR, '[class*="price"]').text if element.find_elements(By.CSS_SELECTOR, '[class*="price"]') else None,
                'location': element.find_element(By.CSS_SELECTOR, '[class*="location"]').text if element.find_elements(By.CSS_SELECTOR, '[class*="location"]') else None,
                'images': image_urls
            }
            listings.append(listing)
            print(f"Found: {listing['title']} - {listing['price']} - {listing['location']}")
        
        search_params = {
            'model': model,
            'brand': brand,
            'min_price': int(min_price),
            'max_price': None,  # No max price
            'year': start_year,
            'url': url
        }
        
        print(f"\nSearch complete for {model}. Found {len(listings)} listings")
        
        return {
            'search_parameters': search_params,
            'listings': listings
        }
        
    except Exception as e:
        logger.error(f"Error in search_wallapop: {str(e)}")
        return None
    finally:
        try:
            driver.quit()
        except Exception as e:
            logger.error(f"Error closing driver: {str(e)}")

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

def main():
    print("Starting Wallapop car search...")
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