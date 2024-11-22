from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, WebDriverException
import json
import time
import pandas as pd
import re
import math
def load_car_data():
    """Load and process the car tips CSV file"""
    df = pd.read_csv('scripts/Wallapop-tips - jeje.csv')
    # Clean up column names - remove colons and whitespace
    df.columns = df.columns.str.strip().str.rstrip(':')
    return df

def extract_price_range(price_str):
    """Extract price from price string and set range as [price/3, price], ensuring integer values"""
    try:
        # Handle ranges (we'll use the average)
        if isinstance(price_str, str) and '-' in price_str:
            prices = re.findall(r'(\d+(?:\.\d+)?)', price_str)
            if len(prices) >= 2:
                price1 = float(prices[0]) * 1000
                price2 = float(prices[1]) * 1000
                max_price = int((price1 + price2) / 2)  # Take average of the range
                min_price = int(max_price / 3)
                return min_price, max_price
        
        # Handle single values
        price = int(float(re.findall(r'(\d+(?:\.\d+)?)', price_str)[0]) * 1000)
        min_price = int(price / 3)
        return min_price, price
    except:
        return None, None

def get_text_content(element):
    """Recursively get all text content from an element"""
    text_content = []
    try:
        # Get direct text
        if element.text:
            text_content.append(element.text.strip())
        
        # Get text from all child elements
        children = element.find_elements(By.XPATH, ".//*")
        for child in children:
            try:
                if child.text and child.text.strip():
                    text_content.append(child.text.strip())
            except:
                continue
                
    except:
        pass
    return text_content

def get_search_results(keywords, latitude, longitude, distance=100000, min_price=None, max_price=None, driver=None, car_model=None):
    """Enhanced search function with car model filtering"""
    # Load car data
    car_df = load_car_data()
    
    # If a specific car model is provided, get its details
    if car_model:
        car_info = car_df[car_df['Marca'].str.contains(car_model, case=False, na=False)]
        if not car_info.empty:
            # Get the first matching car's price range
            price_info = car_info.iloc[0]['Precio medio']
            min_price_default, max_price_default = extract_price_range(price_info)
            
            # Get kilometraje range
            km_range = car_info.iloc[0]['Kilometraje'] if 'Kilometraje' in car_info.iloc[0] else None
            min_km, max_km = 30000, 100000  # Default values
            if isinstance(km_range, str):
                # Extract numbers from format like "100.000 - 150.000 km"
                km_numbers = re.findall(r'(\d+(?:\.\d+)?)', km_range.replace('.', ''))
                if len(km_numbers) >= 2:
                    min_km, max_km = map(int, km_numbers[:2])
            
            # Get year range
            year_str = car_info.iloc[0]['Año'].strip('() ')
            try:
                min_year, max_year = map(int, year_str.split('-'))
            except:
                min_year, max_year = 2000, 2023  # Default values
            
            # Use provided prices if specified, otherwise use defaults from CSV
            min_price = min_price or min_price_default
            max_price = max_price or max_price_default
            
            print(f"Searching for {car_model}")
            print(f"Price range: {min_price} - {max_price}")

    # Build search URL with all parameters
    url = "https://es.wallapop.com/app/search"
    
    search_url = (
        f"{url}?keywords={keywords}"
        f"&latitude={latitude}"
        f"&longitude={longitude}"
        f"&distance={distance}"
        f"&category_ids=100"  # Category for cars
        f"&filters_source=default_filters"
    )
    
    if car_model:
        search_url += (
            f"&min_km={min_km}"
            f"&max_km={max_km}"
            f"&min_year={min_year}"
            f"&max_year={max_year}"
        )
    
    if min_price:
        search_url += f"&min_sale_price={min_price}"
    if max_price:
        search_url += f"&max_sale_price={max_price}"
    
    search_url += "&order_by=price_low_to_high"
    
    try:
        should_quit = False
        if not driver:
            should_quit = True
            options = webdriver.ChromeOptions()
            options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        
        print(f"Accessing URL: {search_url}")
        driver.get(search_url)
        
        # Wait for page to load initially
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
            
            if should_quit:
                driver.quit()
                
            return urls
            
        except TimeoutException:
            print("Timeout waiting for items to load")
            return []
            
    except WebDriverException as e:
        print(f"WebDriver Error: {type(e).__name__}: {str(e)}")
        if should_quit and driver:
            driver.quit()
        return []
    except Exception as e:
        print(f"Unexpected Error: {type(e).__name__}: {str(e)}")
        if should_quit and driver:
            driver.quit()
        return []

def get_available_car_models():
    """Return a list of available car models from the CSV"""
    car_df = load_car_data()
    return car_df['Marca'].tolist()

if __name__ == "__main__":
    keywords = "coche"
    latitude = 41.224151
    longitude = 1.7255678
    
    # Example: Search for a specific car model
    car_model = "Volkswagen Golf"  # You can change this to any model from the CSV
    results = get_search_results(
        keywords=keywords,
        latitude=latitude,
        longitude=longitude,
        car_model=car_model
    )
    
    print(f"Found {len(results)} results for {car_model}")
    
    # Print available car models
    print("\nAvailable car models:")
    for model in get_available_car_models():
        print(f"- {model}")