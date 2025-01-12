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
import json
from datetime import datetime

# Load environment variables from .env file
load_dotenv()

def get_furgos_from_supabase():
    """Fetch van data from Supabase"""
    supabase = init_supabase()
    response = supabase.table('furgos').select("*").execute()
    
    if not response or not isinstance(response, dict):
        logger.error("Invalid response from Supabase")
        return []
    
    data = response.get('data', [])
    
    if not data:
        logger.warning("No data returned from Supabase")
        return []
        
    if data:
        logger.info(f"First van data: {data[0]}")
        
    # Validate each van has required fields
    valid_furgos = []
    for furgo in data:
        if all(furgo.get(field) for field in ['marca', 'modelo', 'motor', 'configuracion', 'precio', 'año_fabricacion']):
            valid_furgos.append(furgo)
        else:
            logger.warning(f"Skipping invalid van data: {furgo}")
            
    if not valid_furgos:
        logger.warning("No valid vans found in data")
        
    return valid_furgos

def init_supabase():
    """Initialize Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise Exception("Missing Supabase credentials in .env file")
        
    return create_client(supabase_url, supabase_key)

def parse_price_range(price_str):
    """Parse price range string into min and max price values"""
    # Remove '€' and spaces, and handle thousand separators
    clean_str = price_str.replace('€', '').replace(' ', '').replace(',', '')
    
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
    """Clean up van title"""
    return title.split('\n')[0].strip()

def log_search_error(furgo, url, error_message):
    """Log search errors to a JSON file"""
    error_log = {
        'timestamp': datetime.now().isoformat(),
        'furgo': {
            'marca': furgo['marca'],
            'modelo': furgo['modelo'],
            'motor': furgo['motor'],
            'configuracion': furgo['configuracion'],
            'precio': furgo['precio'],
            'año_fabricacion': furgo['año_fabricacion']
        },
        'search_url': url
        }
    
    try:
        # Load existing errors
        try:
            with open('search_errors.json', 'r') as f:
                errors = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            errors = []
        
        # Append new error
        errors.append(error_log)
        
        # Write back to file
        with open('search_errors.json', 'w') as f:
            json.dump(errors, f, indent=2)
            
        print(f"\nLogged error to search_errors.json")
    except Exception as e:
        print(f"\nFailed to log error: {str(e)}")

def search_wallapop(furgo):
    """Search Wallapop for van listings"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
    
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 10)
    
    try:
        # Get parameters from the van data
        model = furgo['modelo']
        brand = furgo['marca']
        motor = furgo['motor']
        config = furgo['configuracion']
        min_price, max_price = parse_price_range(furgo['precio'])
        year_range = furgo['año_fabricacion']
        
        # Calculate minimum price (using same approach as cars)
        avg_price = (min_price + max_price) / 2
        search_min_price = int(avg_price / 2)  # Use 50% of average price as minimum
        
        # Extract year range
        start_year = year_range.split('-')[0]
        
        # Use only the model for search keywords
        encoded_keywords = quote(model)
        encoded_brand = quote(brand)
        
        url = (
            f"https://es.wallapop.com/app/search?"
            f"keywords={encoded_keywords}"
            f"&latitude=41.224151"
            f"&longitude=1.7255678"
            f"&category_ids=100"  # Cars/vehicles category
            f"&min_sale_price={search_min_price}"
            f"&min_year={start_year}"
            f"&max_km=200000"
            f"&distance=200000"
            f"&order_by=price_low_to_high"
            f"&brand={encoded_brand}"  # Add brand parameter
        )
        
        print(f"\nSearching URL: {url}")
        
        driver.get(url)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'a[href*="/item/"]')))
        
        listing_elements = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/item/"]')[:5]
        
        if not listing_elements:
            log_search_error(furgo, url, "No listings found")
            return None
            
        listings = []
        
        for element in listing_elements:
            image_elements = element.find_elements(By.CSS_SELECTOR, 'img[src*="cdn.wallapop.com/images/"]')
            image_urls = [img.get_attribute('src') for img in image_elements if img.get_attribute('src')]
            
            original_title = element.text
            cleaned_title = clean_title(original_title)
            price_text = element.find_element(By.CSS_SELECTOR, '[class*="price"]').text if element.find_elements(By.CSS_SELECTOR, '[class*="price"]') else None
            
            # Calculate price difference right here
            listing_price = parse_listing_price(price_text)
            if listing_price:
                target_avg_price = (min_price + max_price) / 2
                price_difference = int(round(listing_price - target_avg_price))
                
                print("\n" + "="*50)
                print(f"Listing: {cleaned_title}")
                print(f"Raw price text: {price_text}")
                print("\nCalculation:")
                print(f"Parsed listing price: {listing_price}€")
                print(f"Target price range: {min_price}€ - {max_price}€")
                print(f"Target average: ({min_price} + {max_price}) / 2 = {target_avg_price}€")
                print(f"Price difference: {listing_price} - {target_avg_price} = {price_difference}€")
                print("="*50)
            
            listing = {
                'url': element.get_attribute('href'),
                'title': cleaned_title + '\n' + '\n'.join(original_title.split('\n')[1:]),
                'price': price_text,
                'location': element.find_element(By.CSS_SELECTOR, '[class*="location"]').text if element.find_elements(By.CSS_SELECTOR, '[class*="location"]') else None,
                'images': image_urls
            }
            listings.append(listing)
        
        search_params = {
            'model': model,
            'marca': brand,
            'min_price': search_min_price,
            'max_price': None,
            'motor': motor,
            'configuracion': config,
            'vehicle_type': 'furgo',
            'url': url,
            'target_price_range': (min_price, max_price)
        }
        
        print(f"\nSearch complete for {model}. Found {len(listings)} listings")
        
        return {
            'search_parameters': search_params,
            'listings': listings
        }
        
    except Exception as e:
        log_search_error(furgo, url, e)
        print(f"\nError searching for {furgo['modelo']}: {str(e)}")
        return None
        
    finally:
        driver.quit()

def parse_listing_price(price_text):
    """Parse price text into numeric value"""
    if not price_text:
        return None
    
    # Remove currency symbol and any extra text
    clean_price = price_text.replace('€', '').replace('.', '').replace(',', '.').strip()
    
    # Extract first number found
    match = re.search(r'(\d+(?:\.\d+)?)', clean_price)
    if match:
        # Convert to float first, then round to integer
        return int(round(float(match.group(1))))
    return None

def clear_furgo_data(supabase):
    """Clear all furgo-related data from the database"""
    try:
        # Delete in correct order to respect foreign key constraints
        print("Clearing old furgo data...")
        supabase.table('listing_images_furgos').delete().neq('id', 0).execute()
        print("Cleared furgo images")
        supabase.table('listings_furgos').delete().neq('id', 0).execute()
        print("Cleared furgo listings")
        supabase.table('searches').delete().eq('vehicle_type', 'furgo').execute()
        print("Cleared furgo searches")
    except Exception as e:
        print(f"Error clearing furgo data: {str(e)}")
        raise e

def store_search_results(supabase, all_searches, all_listings):
    """Store all search results in Supabase"""
    try:
        # Insert all searches first
        search_results = supabase.table('searches').insert(all_searches).execute()
        search_id_map = {search['search_url']: result['id'] 
                        for search, result in zip(all_searches, search_results.data)}
        
        # Prepare all listings with correct search_ids
        all_listing_data = []
        all_image_data = []
        seen_urls = set()  # Track URLs we've already processed
        
        for search_url, listings in all_listings.items():
            search_id = search_id_map[search_url]
            
            for listing in listings:
                # Skip if we've already processed this URL
                if listing['url'] in seen_urls:
                    print(f"\nSkipping duplicate listing URL: {listing['url']}")
                    continue
                    
                seen_urls.add(listing['url'])
                listing_price = parse_listing_price(listing['price'])
                
                if listing_price:
                    # Get search params for this listing
                    search_params = next(s for s in all_searches if s['search_url'] == search_url)
                    
                    # Get the original furgo data to calculate target prices
                    min_price = search_params['min_price'] * 2  # Reverse the 50% calculation
                    max_price = search_params['max_price'] if search_params['max_price'] else min_price
                    target_avg_price = (min_price + max_price) / 2
                    price_difference = int(round(listing_price - target_avg_price))
                    
                    # Print detailed price calculation
                    print("\n" + "="*50)
                    title_parts = listing['title'].split('\n')
                    print(f"Listing: {title_parts[0]}")
                    print(f"Raw price text: {listing['price']}")
                    print("\nCalculation:")
                    print(f"Parsed listing price: {listing_price}€")
                    print(f"Target price range: {min_price}€ - {max_price}€")
                    print(f"Target average: ({min_price} + {max_price}) / 2 = {target_avg_price}€")
                    print(f"Price difference: {listing_price} - {target_avg_price} = {price_difference}€")
                    print("="*50)
                else:
                    price_difference = None
                    print(f"\nWarning: Could not parse price from: {listing['price']}")
                
                listing_data = {
                    'search_id': search_id,
                    'url': listing['url'],
                    'title': listing['title'],
                    'price': listing_price,
                    'price_text': listing['price'],
                    'price_difference': price_difference,
                    'location': listing['location'],
                    'description': listing['title']
                }
                all_listing_data.append(listing_data)
        
        # Insert all listings using upsert
        if all_listing_data:
            listing_results = supabase.table('listings_furgos').upsert(
                all_listing_data,
                on_conflict='url'  # Specify which column causes the conflict
            ).execute()
            
            # Map listing URLs to their IDs from the upsert result
            listing_id_map = {result['url']: result['id'] for result in listing_results.data}
            
            # First delete any existing images for these listings
            listing_ids = list(listing_id_map.values())
            if listing_ids:
                supabase.table('listing_images_furgos').delete().in_('listing_id', listing_ids).execute()
            
            # Prepare all image data
            for search_url, listings in all_listings.items():
                for listing in listings:
                    listing_id = listing_id_map[listing['url']]
                    for idx, image_url in enumerate(listing['images']):
                        image_data = {
                            'listing_id': listing_id,
                            'image_url': image_url,
                            'image_order': idx
                        }
                        all_image_data.append(image_data)
            
            # Insert all images
            if all_image_data:
                supabase.table('listing_images_furgos').insert(all_image_data).execute()
                
    except Exception as e:
        print(f"Error storing search results: {str(e)}")
        raise e

def process_all_furgos():
    """Process each van from Supabase"""
    supabase = init_supabase()
    furgos = get_furgos_from_supabase()
    
    if not furgos:
        print("No vans found in database. Exiting.")
        return []
        
    all_searches = []
    all_listings = {}  # Key: search_url, Value: list of listings
    
    for furgo in furgos:
        if not furgo.get('modelo') or not furgo.get('marca'):
            print(f"Skipping van with missing model or brand: {furgo}")
            continue
            
        print(f"\nSearching for {furgo['marca']} {furgo['modelo']} {furgo['configuracion']} ({furgo['motor']})...")
        result = search_wallapop(furgo)
        
        if result and result['listings']:
            print(f"Found {len(result['listings'])} listings")
            search_params = result['search_parameters']
            
            # Extract start year from año_fabricacion
            start_year = furgo['año_fabricacion'].split('-')[0]
            
            # Modified to match actual database schema
            search_data = {
                'model': search_params['model'],
                'marca': search_params['marca'],
                'min_price': search_params['min_price'],
                'max_price': search_params['max_price'],
                'min_year': int(start_year),
                'vehicle_type': search_params['vehicle_type'],
                'search_url': search_params['url']
            }
            
            all_searches.append(search_data)
            all_listings[search_params['url']] = result['listings']
        else:
            print("No listings found")
    
    if all_searches and all_listings:
        try:
            # Clear existing data
            clear_furgo_data(supabase)
            # Store new data
            store_search_results(supabase, all_searches, all_listings)
            print("Successfully stored all search results")
        except Exception as e:
            print(f"Error in database operations: {str(e)}")
    
    return all_searches, all_listings

def main():
    print("Starting Wallapop van search...")
    searches, listings = process_all_furgos()
    
    print("\nSearch complete!")
    print("\nResults summary:")
    for search in searches:
        print(f"\n{search['marca']} {search['model']}:")
        print(f"- Found {len(listings[search['search_url']])} listings")

if __name__ == '__main__':
    main() 