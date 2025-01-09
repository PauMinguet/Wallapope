from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import os
from supabase import create_client
from urllib.parse import quote
from dotenv import load_dotenv
import re

# Load environment variables from .env file
load_dotenv()

def get_motos_from_supabase():
    """Fetch motorcycle data from Supabase"""
    supabase = init_supabase()
    response = supabase.table('motos').select("*").execute()
    
    if not response.data:
        print("Error: No data returned from Supabase")
        return []
        
    if response.data:
        print(f"First moto data: {response.data[0]}")
        
    # Validate each motorcycle has required fields
    valid_motos = []
    for moto in response.data:
        if all(moto.get(field) for field in ['brand', 'model', 'price_range']):
            valid_motos.append(moto)
        else:
            print(f"Skipping invalid moto data: {moto}")
            
    if not valid_motos:
        print("Error: No valid motorcycles found in data")
        
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

def search_wallapop(moto):
    """Search Wallapop for motorcycle listings"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
    
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 10)
    
    try:
        # Get parameters from the motorcycle data
        model = moto['model']
        brand = moto['brand']
        min_price, max_price = parse_price_range(moto['price_range'])
        
        # Calculate average price if it's a range
        avg_price = (min_price + max_price) / 2
        search_min_price = int(avg_price * 0.4)  # Use 40% (2/5) of average price as minimum
        
        # Use brand and model for search keywords
        search_terms = f"{brand} {model}"
        encoded_keywords = quote(search_terms)
        
        url = (
            f"https://es.wallapop.com/app/search?"
            f"keywords={encoded_keywords}"
            f"&latitude=41.224151"
            f"&longitude=1.7255678"
            f"&category_ids=14000"  # Motorcycle category
            f"&min_sale_price={search_min_price}"  # Using new calculated minimum price
            f"&distance=200000"
            f"&order_by=price_low_to_high"
        )
        
        print(f"\nSearching URL: {url}")
        
        driver.get(url)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'a[href*="/item/"]')))
        
        listing_elements = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/item/"]')[:5]
        
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
                'images': image_urls
            }
            listings.append(listing)
            print(f"Found: {listing['title']} - {listing['price']} - {listing['location']}")
        
        search_params = {
            'model': model,
            'marca': brand,
            'min_price': search_min_price,  # Update min_price in search params
            'max_price': None,
            'vehicle_type': 'moto',
            'url': url,
            'target_price_range': (min_price, max_price)  # Store original price range for difference calculation
        }
        
        print(f"\nSearch complete for {search_terms}. Found {len(listings)} listings")
        
        return {
            'search_parameters': search_params,
            'listings': listings
        }
        
    except Exception as e:
        print(f"\nError searching for {moto['model']}: {str(e)}")
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
        return float(match.group(1))
    return None

def store_search_results(supabase, search_params, listings):
    """Store search results in Supabase"""
    search_data = {
        'model': search_params['model'],
        'marca': search_params['marca'],
        'min_price': search_params['min_price'],
        'max_price': search_params['max_price'],
        'vehicle_type': search_params['vehicle_type'],
        'search_url': search_params['url']
    }
    
    try:
        search_result = supabase.table('searches').insert(search_data).execute()
        search_id = search_result.data[0]['id']
        
        for listing in listings:
            try:
                # Check if listing already exists
                existing = supabase.table('listings_motos').select('id').eq('url', listing['url']).execute()
                if existing.data:
                    print(f"Skipping duplicate listing: {listing['url']}")
                    continue
                
                # Parse price from price_text
                listing_price = parse_listing_price(listing['price'])
                
                if listing_price:
                    # Calculate price difference using the average of min and max target prices
                    target_min_price, target_max_price = search_params['target_price_range']
                    target_avg_price = (target_min_price + target_max_price) / 2
                    # Round to nearest integer for storage
                    price_difference = int(round(listing_price - target_avg_price))
                else:
                    price_difference = None
                
                # Prepare listing data
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
                
                # Insert listing
                listing_result = supabase.table('listings_motos').insert(listing_data).execute()
                listing_id = listing_result.data[0]['id']
                
                # Insert images
                for idx, image_url in enumerate(listing['images']):
                    image_data = {
                        'listing_id': listing_id,
                        'image_url': image_url,
                        'image_order': idx
                    }
                    supabase.table('listing_images_motos').insert(image_data).execute()
                    
            except Exception as e:
                print(f"Error storing listing {listing['url']}")
                print(f"Error details: {str(e)}")
                continue
                    
    except Exception as e:
        print(f"Error storing search results: {str(e)}")

def process_all_motos():
    """Process each motorcycle from Supabase"""
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
            
        print(f"\nSearching for {moto['brand']} {moto['model']} (Price range: {moto['price_range']})...")
        result = search_wallapop(moto)
        
        if result and result['listings']:
            print(f"Found {len(result['listings'])} listings")
            store_search_results(supabase, result['search_parameters'], result['listings'])
            all_results.append(result)
        else:
            print("No listings found")
    
    return all_results

def main():
    print("Starting Wallapop motorcycle search...")
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