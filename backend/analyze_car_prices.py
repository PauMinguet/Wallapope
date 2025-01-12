from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import csv
from datetime import datetime
from urllib.parse import quote
import statistics
from supabase_py import create_client
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

def init_supabase():
    """Initialize Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise Exception("Missing Supabase credentials")
    return create_client(supabase_url, supabase_key)

def get_cars_from_supabase():
    """Fetch car data from Supabase"""
    supabase = init_supabase()
    response = supabase.table('coches').select("*").execute()
    return response.get('data', [])

def parse_price(price_text):
    """Parse price text into numeric value"""
    try:
        # Remove currency symbol and clean up
        clean_price = price_text.replace('€', '').replace('.', '').replace(',', '.').strip()
        return float(clean_price)
    except:
        return None

def parse_price_range(price_str):
    """Parse price range string into min and max values"""
    try:
        # Remove '€' and spaces
        clean_str = price_str.replace('€', '').replace(' ', '')
        
        # Handle different formats
        if '-' in clean_str:
            min_str, max_str = clean_str.split('-')
            min_price = float(min_str.replace(',', ''))
            max_price = float(max_str.replace(',', ''))
            return (min_price, max_price)
        else:
            price = float(clean_str.replace(',', ''))
            return (price, price)
    except:
        return None, None

def search_wallapop(car, include_flexicar=False, use_relevance=False):
    """Search Wallapop with specific parameters"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
    
    try:
        # Setup ChromeDriver using webdriver_manager
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        wait = WebDriverWait(driver, 10)
        
        # Prepare search parameters
        model = car['modelo']
        brand = car['marca']
        keywords = model  # Only use model in keywords, brand goes in separate parameter
        if include_flexicar:
            keywords += " flexicar"
            
        # Parse price range and calculate minimum price (70% of average)
        target_min, target_max = parse_price_range(car['precio_compra'])
        if target_min is not None and target_max is not None:
            avg_price = (target_min + target_max) / 2
            min_sale_price = int(avg_price * 0.7)  # 70% of average price
        else:
            min_sale_price = None
            
        # Parse year range
        year_range = car['ano_fabricacion']
        if '/' in year_range:
            min_year, max_year = year_range.split('/')
        elif '-' in year_range:
            min_year, max_year = year_range.split('-')
        else:
            min_year = max_year = year_range
            
        # Build search URL
        base_url = "https://es.wallapop.com/app/search"
        search_params = {
            'keywords': keywords,
            'brand': brand,
            'latitude': '41.224151',
            'longitude': '1.7255678',
            'category_ids': '100',  # Cars category
            'distance': '200000',
            'min_year': min_year.strip(),
            'max_year': max_year.strip(),
            'max_km': '200000'
        }
        
        # Add engine type if specified
        if 'combustible' in car:
            if car['combustible'] == 'Diésel':
                search_params['engine'] = 'gasoil'
            elif car['combustible'] == 'Gasolina':
                search_params['engine'] = 'gasoline'
        
        # Add min_sale_price only for regular search (low to high)
        if not use_relevance and not include_flexicar and min_sale_price:
            search_params['min_sale_price'] = min_sale_price
            search_params['order_by'] = 'price_low_to_high'
        elif use_relevance:
            search_params['order_by'] = 'most_relevance'
        
        url = f"{base_url}?{'&'.join(f'{k}={quote(str(v))}' for k, v in search_params.items())}"
        print(f"Searching URL: {url}")
        
        driver.get(url)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'a[href*="/item/"]')))
        
        # Get up to 10 listings
        listing_elements = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/item/"]')[:10]
        
        # Extract prices
        prices = []
        for element in listing_elements:
            price_element = element.find_elements(By.CSS_SELECTOR, '[class*="price"]')
            if price_element:
                price_text = price_element[0].text
                price = parse_price(price_text)
                if price:
                    prices.append(price)
        
        return prices, url
        
    except Exception as e:
        print(f"Error initializing Chrome driver: {str(e)}")
        return [], ""
        
    finally:
        if 'driver' in locals() and driver:
            try:
                driver.quit()
            except Exception as e:
                print(f"Error closing driver: {str(e)}")

def analyze_car_prices():
    """Analyze prices for each car"""
    cars = get_cars_from_supabase()
    
    # Prepare CSV file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'car_price_analysis_{timestamp}.csv'
    
    # Create and write headers
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([
            'Brand', 
            'Model',
            'Year Range',
            'Engine Type',
            'Target Min Price',
            'Target Max Price',
            'Regular Search Prices (Low to High)',
            'Regular Search URL',
            'Relevance Search Prices',
            'Relevance Search URL',
            'Flexicar Search Prices',
            'Flexicar Search URL',
            'Timestamp'
        ])
    
    # Process each car and write results immediately
    for car in cars:
        print(f"\nAnalyzing {car['marca']} {car['modelo']}...")
        
        try:
            # Parse target price range
            target_min, target_max = parse_price_range(car['precio_compra'])
            
            # Perform searches one at a time and write results immediately
            regular_prices, regular_url = search_wallapop(car)
            print(f"Regular search complete: {len(regular_prices)} listings")
            
            relevance_prices, relevance_url = search_wallapop(car, use_relevance=True)
            print(f"Relevance search complete: {len(relevance_prices)} listings")
            
            flexicar_prices, flexicar_url = search_wallapop(car, include_flexicar=True)
            print(f"Flexicar search complete: {len(flexicar_prices)} listings")
            
            # Write results to CSV immediately after searches complete
            with open(filename, 'a', newline='') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow([
                    car['marca'],
                    car['modelo'],
                    car['ano_fabricacion'],
                    car.get('combustible', ''),  # Use get() to handle missing combustible
                    target_min,
                    target_max,
                    regular_prices if regular_prices else '',
                    regular_url,
                    relevance_prices if relevance_prices else '',
                    relevance_url,
                    flexicar_prices if flexicar_prices else '',
                    flexicar_url,
                    datetime.now().isoformat()
                ])
            
            print(f"Target price range: {target_min}€ - {target_max}€")
            print(f"Results saved for {car['marca']} {car['modelo']}")
            
        except Exception as e:
            print(f"Error processing {car['marca']} {car['modelo']}: {str(e)}")
            # Write error entry to CSV
            with open(filename, 'a', newline='') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow([
                    car['marca'],
                    car['modelo'],
                    car['ano_fabricacion'],
                    car.get('combustible', ''),
                    target_min,
                    target_max,
                    f"ERROR: {str(e)}",
                    "",
                    "",
                    "",
                    "",
                    "",
                    datetime.now().isoformat()
                ])

if __name__ == '__main__':
    print("Starting car price analysis...")
    analyze_car_prices()
    print("\nAnalysis complete! Results saved to CSV file.") 