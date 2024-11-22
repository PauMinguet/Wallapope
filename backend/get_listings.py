from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import pandas as pd
import json
import time

def setup_driver():
    """Initialize Chrome WebDriver with headless options"""
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
    return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

def calculate_price_range(price):
    """Calculate min and max price based on reference price"""
    try:
        reference_price = int(float(price))
        max_price = int(reference_price * 0.8)  # 80% of reference price
        min_price = int(reference_price / 3)    # One third of reference price
        return min_price, max_price
    except (ValueError, TypeError):
        print(f"Error calculating price range for price: {price}")
        return None, None

def calculate_year_range(year):
    """Calculate year range (±2 years)"""
    try:
        target_year = int(year)
        return target_year - 2, target_year + 2
    except (ValueError, TypeError):
        print(f"Error calculating year range for year: {year}")
        return None, None

def calculate_km_range(kilometraje):
    """Calculate kilometer range (up to target + 10000)"""
    try:
        max_km = int(float(kilometraje)) + 10000
        return 0, max_km  # Start from 0 km
    except (ValueError, TypeError):
        print(f"Error calculating km range for kilometraje: {kilometraje}")
        return None, None

def get_search_results(keywords, latitude, longitude, distance=200000, min_price=None, max_price=None, 
                      min_year=None, max_year=None, max_km=None, driver=None):
    """Get search results for given parameters"""
    url = "https://es.wallapop.com/app/search"
    
    search_url = (
        f"{url}?keywords={keywords}"
        f"&latitude={latitude}"
        f"&longitude={longitude}"
        f"&distance={distance}"
        f"&category_ids=100"  # Category for cars
        f"&filters_source=default_filters"
    )
    
    if min_price:
        search_url += f"&min_sale_price={min_price}"
    if max_price:
        search_url += f"&max_sale_price={max_price}"
    if min_year:
        search_url += f"&min_year={min_year}"
    if max_year:
        search_url += f"&max_year={max_year}"
    if max_km:
        search_url += f"&max_km={max_km}"
    
    search_url += "&order_by=price_low_to_high"
    
    try:
        print(f"Accessing URL: {search_url}")
        driver.get(search_url)
        
        # Wait for page to load
        time.sleep(3)
        
        try:
            wait = WebDriverWait(driver, 20)
            
            # Find all links that contain '/item/'
            links = wait.until(EC.presence_of_all_elements_located(
                (By.CSS_SELECTOR, 'a[href*="/item/"]')
            ))
            
            if not links:
                print("No item links found")
                return []
            
            # Extract URLs
            urls = []
            for link in links:
                try:
                    url = link.get_attribute('href')
                    if url and '/item/' in url:
                        urls.append({'url': url})
                except:
                    continue
            
            print(f"Found {len(urls)} item URLs")
            return urls
            
        except Exception as e:
            print(f"Error finding links: {str(e)}")
            return []
            
    except Exception as e:
        print(f"Error accessing URL: {str(e)}")
        return []

def get_listings_for_requests(csv_path='car_requests.csv', latitude=41.224151, longitude=1.7255678, 
                            distance=200000, single_request_id=None):
    """Process car requests and get listings"""
    try:
        # Read car requests
        df = pd.read_csv(csv_path)
        
        # Filter for single request if specified
        if single_request_id:
            df = df[df['id'] == single_request_id]
            if df.empty:
                print(f"No request found with ID {single_request_id}")
                return None
        
        # Initialize results dictionary
        all_results = {}
        
        # Setup WebDriver
        driver = setup_driver()
        
        try:
            # Process each request
            for _, request in df.iterrows():
                request_id = request['id']
                print(f"\nProcessing request {request_id}")
                print(f"Car: {request['marca']} {request['modelo']} ({request['año']})")
                
                # Calculate ranges
                min_price, max_price = calculate_price_range(request['precio'])
                min_year, max_year = calculate_year_range(request['año'])
                _, max_km = calculate_km_range(request['kilometraje'])
                
                print(f"Price range: {min_price}€ - {max_price}€")
                print(f"Year range: {min_year} - {max_year}")
                print(f"Max kilometers: {max_km}")
                
                # Create search keywords
                keywords = f"{request['marca']} {request['modelo']}"
                
                # Get listings
                listings = get_search_results(
                    keywords=keywords,
                    latitude=latitude,
                    longitude=longitude,
                    distance=distance,
                    min_price=min_price,
                    max_price=max_price,
                    min_year=min_year,
                    max_year=max_year,
                    max_km=max_km,
                    driver=driver
                )
                
                # Store results
                all_results[request_id] = {
                    'request': {
                        'marca': request['marca'],
                        'modelo': request['modelo'],
                        'año': request['año'],
                        'color': request['color'],
                        'kilometraje': request['kilometraje'],
                        'precio': request['precio'],
                        'precio_min': min_price,
                        'precio_max': max_price,
                        'año_min': min_year,
                        'año_max': max_year,
                        'km_max': max_km,
                        'email': request['email']
                    },
                    'search_parameters': {
                        'latitude': latitude,
                        'longitude': longitude,
                        'distance': distance
                    },
                    'listings': listings
                }
                
                print(f"Found {len(listings)} listings for request {request_id}")
                
        finally:
            driver.quit()
        
        return all_results
        
    except Exception as e:
        print(f"Error processing requests: {str(e)}")
        return None 