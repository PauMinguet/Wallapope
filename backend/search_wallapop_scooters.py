from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from supabase_py import create_client
from urllib.parse import quote
from dotenv import load_dotenv
import os
import re

# Load environment variables from .env file
load_dotenv()

def init_supabase():
    """Initialize Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise Exception("Missing Supabase credentials in .env file")
        
    return create_client(supabase_url, supabase_key)

def clean_title(title):
    """Clean up scooter title"""
    return title.split('\n')[0].strip()

def search_wallapop_scooters():
    """Search Wallapop for scooter listings using Selenium"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
    
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 10)
    
    try:
        # Fixed search parameters for scooters
        keywords = "Scooter 125cc"
        min_price = 400
        max_price = 2000  # Increased max price for more results
        
        encoded_keywords = quote(keywords)
        url = (
            f"https://es.wallapop.com/app/search?"
            f"keywords={encoded_keywords}"
            f"&latitude=41.224151"
            f"&longitude=1.7255678"
            f"&category_ids=14000"  # Motorcycle/Scooter category
            f"&min_sale_price={min_price}"
            f"&max_sale_price={max_price}"
            f"&distance=200000"
            f"&order_by=price_low_to_high"
        )
        
        print(f"Searching: {url}")
        
        driver.get(url)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'a[href*="/item/"]')))
        
        listing_elements = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/item/"]')[:10]
        
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
            'model': keywords,
            'min_price': min_price,
            'max_price': max_price,
            'vehicle_type': 'scooter',
            'url': url
        }
        
        return {
            'search_parameters': search_params,
            'listings': listings
        }
        
    except Exception as e:
        print(f"Error searching for scooters: {str(e)}")
        return None
        
    finally:
        driver.quit()

def parse_listing_details(title_text):
    """Parse listing title text into structured data"""
    lines = title_text.split('\n')
    data = {
        'price_text': lines[1] if len(lines) > 1 else None,
        'year': None,
        'engine_cc': None,
        'kilometers': None,
        'description': None
    }
    
    # Parse price
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
        elif 'cc' in line.lower():
            try:
                data['engine_cc'] = int(re.search(r'\d+', line).group())
            except:
                pass
        elif 'km' in line.lower():
            try:
                data['kilometers'] = int(re.search(r'\d+', line).group())
            except:
                pass
        else:
            data['description'] = line if not data['description'] else data['description'] + ' ' + line
    
    return data

def store_search_results(supabase, search_params, listings):
    """Store search results in Supabase"""
    search_data = {
        'model': search_params['model'],
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
                existing = supabase.table('listings_scooters').select('id').eq('url', listing['url']).execute()
                if existing.data:
                    print(f"Skipping duplicate listing: {listing['url']}")
                    continue
                
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
                    'engine_cc': details['engine_cc'],
                    'kilometers': details['kilometers'],
                    'description': details['description']
                }
                
                # Insert listing
                listing_result = supabase.table('listings_scooters').insert(listing_data).execute()
                listing_id = listing_result.data[0]['id']
                
                # Insert images
                for idx, image_url in enumerate(listing['images']):
                    image_data = {
                        'listing_id': listing_id,
                        'image_url': image_url,
                        'image_order': idx
                    }
                    supabase.table('listing_images_scooters').insert(image_data).execute()
                    
            except Exception as e:
                print(f"Error storing listing {listing['url']}")
                print(f"Error details: {str(e)}")
                continue
                    
    except Exception as e:
        print(f"Error storing search results: {str(e)}")

def process_all_scooters():
    """Process scooter search"""
    supabase = init_supabase()
    
    print("\nStarting scooter search...")
    result = search_wallapop_scooters()
    
    if result and result['listings']:
        print(f"Found {len(result['listings'])} listings")
        store_search_results(supabase, result['search_parameters'], result['listings'])
        return [result]
    else:
        print("No listings found")
        return []

def main():
    print("Starting Wallapop scooter search...")
    results = process_all_scooters()
    
    print("\nSearch complete!")
    if results:
        params = results[0]['search_parameters']
        print(f"\nScooter search:")
        print(f"- Price range: {params['min_price']}€ - {params['max_price']}€")
        print(f"- Found {len(results[0]['listings'])} listings")

if __name__ == '__main__':
    main() 