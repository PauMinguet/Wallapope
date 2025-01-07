from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import json
import os
from supabase import create_client
from urllib.parse import quote
from dotenv import load_dotenv
import re

# Load environment variables from .env file
load_dotenv()

def get_cars_from_supabase():
    """Fetch car data from Supabase"""
    supabase = init_supabase()
    response = supabase.table('coches').select("*").execute()
    return response.data

def init_supabase():
    """Initialize Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise Exception("Missing Supabase credentials in .env file")
        
    return create_client(supabase_url, supabase_key)

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
    # Insert search parameters
    search_data = {
        'model': search_params['model'],
        'min_price': search_params['min_price'],
        'max_price': search_params['max_price'],
        'min_year': search_params['year'],
        'search_url': search_params['url']
    }
    
    search_result = supabase.table('searches').insert(search_data).execute()
    search_id = search_result.data[0]['id']
    
    # Insert listings
    for listing in listings:
        # Parse listing details
        details = parse_listing_details(listing['title'])
        
        # Prepare listing data
        listing_data = {
            'search_id': search_id,
            'url': listing['url'],
            'title': listing['title'],
            'price': details['price'],
            'price_text': details['price_text'],
            'location': listing['location'],
            'year': details['year'],
            'fuel_type': details['fuel_type'],
            'transmission': details['transmission'],
            'power_cv': details['power_cv'],
            'kilometers': details['kilometers'],
            'description': details['description']
        }
        
        try:
            # Insert listing
            listing_result = supabase.table('listings').insert(listing_data).execute()
            listing_id = listing_result.data[0]['id']
            
            # Insert images
            for idx, image_url in enumerate(listing['images']):
                image_data = {
                    'listing_id': listing_id,
                    'image_url': image_url,
                    'image_order': idx
                }
                supabase.table('listing_images').insert(image_data).execute()
                
        except Exception as e:
            print(f"Error storing listing {listing['url']}: {str(e)}")

def parse_price_range(price_str):
    """Parse price range string into min and max values"""
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
        # Remove any remaining spaces and replace comma with nothing (for thousands)
        price_str = price_str.strip().replace(',', '')
        return float(price_str)
    
    return parse_price(min_str), parse_price(max_str)

def search_wallapop(car):
    """Search Wallapop for car listings using Selenium with specific parameters"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
    
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 10)
    
    try:
        # Get parameters from the car data
        model = car['modelo']
        engine = car['motor_recomendado'] if car['motor_recomendado'] else ''
        min_price, max_price = parse_price_range(car['precio_compra'])
        
        # Parse year range
        start_year = car['ano_fabricacion'].split('/')[0]
        
        # Format search keywords to include model and engine
        keywords = f"{model} {engine}".strip()
        
        # Construct search URL with all parameters
        encoded_keywords = quote(keywords)
        url = (
            f"https://es.wallapop.com/app/search?"
            f"keywords={encoded_keywords}"
            f"&latitude=41.224151"
            f"&longitude=1.7255678"
            f"&category_ids=100"
            f"&max_sale_price={int(max_price)}"
            f"&min_sale_price={int(min_price)}"
            f"&min_year={start_year}"
            f"&max_km=200000"  # Fixed max kilometers
            f"&distance=200000"  # 200km in meters
            f"&order_by=price_low_to_high"
        )
        
        print(url)
        
        # Navigate to search page
        driver.get(url)
        
        # Wait for listings to load
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'a[href*="/item/"]')))
        
        # Get all listing elements
        listing_elements = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/item/"]')
        
        # Extract information from listings
        listings = []
        for element in listing_elements:
            # Get image URLs from the listing card
            image_elements = element.find_elements(By.CSS_SELECTOR, 'img[src*="cdn.wallapop.com/images/"]')
            image_urls = [img.get_attribute('src') for img in image_elements if img.get_attribute('src')]
            
            listing = {
                'url': element.get_attribute('href'),
                'title': element.text,
                'price': element.find_element(By.CSS_SELECTOR, '[class*="price"]').text if element.find_elements(By.CSS_SELECTOR, '[class*="price"]') else None,
                'location': element.find_element(By.CSS_SELECTOR, '[class*="location"]').text if element.find_elements(By.CSS_SELECTOR, '[class*="location"]') else None,
                'images': image_urls
            }
            listings.append(listing)
        
        return {
            'search_parameters': {
                'model': model,
                'min_price': int(min_price),
                'max_price': int(max_price),
                'year': start_year,
                'url': url
            },
            'listings': listings
        }
        
    except Exception as e:
        print(f"Error searching for {car['modelo']}: {str(e)}")
        return None
        
    finally:
        driver.quit()

def process_all_cars():
    """Process each car from Supabase"""
    # Initialize Supabase
    supabase = init_supabase()
    
    # Load car data from Supabase
    cars = get_cars_from_supabase()
    
    all_results = []
    
    # Process each car
    for car in cars:
        print(f"\nSearching for {car['modelo']} ({car['ano_fabricacion']}, {car['precio_compra']}€)...")
        result = search_wallapop(car)
        
        if result and result['listings']:
            print(f"Found {len(result['listings'])} listings")
            # Store results in Supabase
            store_search_results(supabase, result['search_parameters'], result['listings'])
            all_results.append(result)
        else:
            print("No listings found")
    
    # Save results to JSON (keeping this for backup)
    with open('detailed_search_results.json', 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
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