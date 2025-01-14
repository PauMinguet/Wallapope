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
from datetime import datetime
from chrome_config import create_driver, get_chrome_options
import logging

# Set up logging
logger = logging.getLogger(__name__)

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

def search_wallapop(driver, car, include_flexicar=False, use_relevance=False):
    """Search Wallapop for a car (now accepts driver as parameter)"""
    try:
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
        print(f"Error searching: {str(e)}")
        return [], ""

def insert_analysis_result(supabase, result_data):
    """Insert a single analysis result into the database"""
    try:
        supabase.table("car_price_analysis").insert({
            "brand": result_data['marca'],
            "model": result_data['modelo'],
            "year_range": result_data['ano_fabricacion'],
            "engine_type": result_data.get('combustible', ''),
            "regular_search_prices": result_data['regular_prices'],
            "regular_search_url": result_data['regular_url'],
            "relevance_search_prices": result_data['relevance_prices'],
            "relevance_search_url": result_data['relevance_url'],
            "flexicar_search_prices": result_data['flexicar_prices'],
            "flexicar_search_url": result_data['flexicar_url'],
            "timestamp": datetime.now().isoformat()
        }).execute()
        print(f"Inserted analysis for {result_data['marca']} {result_data['modelo']}")
    except Exception as e:
        print(f"Error inserting data: {str(e)}")

def analyze_car_prices():
    """Main analysis function"""
    supabase = init_supabase()
    
    # Reset and setup the analysis table
    setup_analysis_table(supabase)
    
    # Get cars from Supabase
    cars = get_cars_from_supabase()
    
    # Create Chrome driver once
    driver = create_driver()
    
    try:
        for car in cars:
            try:
                print(f"\nProcessing {car['marca']} {car['modelo']}...")
                
                # Pass the driver instance to search functions
                regular_prices, regular_url = search_wallapop(driver, car)
                relevance_prices, relevance_url = search_wallapop(driver, car, use_relevance=True)
                flexicar_prices, flexicar_url = search_wallapop(driver, car, include_flexicar=True)
                
                result_data = {
                    'marca': car['marca'],
                    'modelo': car['modelo'],
                    'ano_fabricacion': car['ano_fabricacion'],
                    'combustible': car.get('combustible', ''),
                    'regular_prices': regular_prices,
                    'regular_url': regular_url,
                    'relevance_prices': relevance_prices,
                    'relevance_url': relevance_url,
                    'flexicar_prices': flexicar_prices,
                    'flexicar_url': flexicar_url
                }
                
                insert_analysis_result(supabase, result_data)
                print(f"Completed analysis for {car['marca']} {car['modelo']}")
                
            except Exception as e:
                print(f"Error processing {car['marca']} {car['modelo']}: {str(e)}")
                continue
                
    finally:
        if driver:
            try:
                driver.quit()
            except Exception as e:
                print(f"Error closing driver: {str(e)}")

def setup_analysis_table(supabase):
    """Clear existing data and ensure table exists"""
    try:
        # First try to delete all rows - convert 0 to string '0'
        supabase.table("car_price_analysis").delete().neq('id', '0').execute()
        print("Cleared existing analysis data")
    except Exception as e:
        print(f"Error clearing analysis data: {str(e)}")
        try:
            # Alternative approach: delete all rows without filter
            supabase.table("car_price_analysis").delete().execute()
            print("Cleared existing analysis data (alternative method)")
        except Exception as e2:
            print(f"Error with alternative clear method: {str(e2)}")
            print("Will try to create table if it doesn't exist...")
            try:
                # Create table structure directly instead of using RPC
                supabase.table("car_price_analysis").insert({
                    "brand": "test",
                    "model": "test",
                    "year_range": "test",
                    "engine_type": "test",
                    "target_min_price": 0,
                    "target_max_price": 0,
                    "regular_search_prices": [],
                    "regular_search_url": "",
                    "relevance_search_prices": [],
                    "relevance_search_url": "",
                    "flexicar_search_prices": [],
                    "flexicar_search_url": "",
                    "timestamp": datetime.now().isoformat()
                }).execute()
                
                # Then delete the test row
                supabase.table("car_price_analysis").delete().execute()
                print("Created new analysis table")
            except Exception as e3:
                print(f"Error creating table: {str(e3)}")
                print("Please ensure the table exists in the database")

if __name__ == '__main__':
    print("Starting car price analysis...")
    analyze_car_prices()
    print("\nAnalysis complete! Results saved to CSV file.") 