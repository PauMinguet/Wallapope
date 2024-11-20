from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import json
import re

def clean_price(price_text):
    if not price_text:
        return None
    numbers = re.findall(r'[\d.,]+', price_text)
    if numbers:
        return float(numbers[0].replace('.', '').replace(',', '.'))
    return None

def get_search_results(keywords, latitude, longitude, distance=100000, min_price=18, max_price=5000):
    base_url = "https://es.wallapop.com/app/search"
    search_url = (
        f"{base_url}?"
        f"keywords={keywords}"
        f"&latitude={latitude}"
        f"&longitude={longitude}"
        f"&distance={distance}"
        f"&min_sale_price={min_price}"
        f"&max_sale_price={max_price}"
        f"&order_by=newest"
    )
    
    print("Setting up driver...")
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--disable-software-rasterizer')
    options.add_argument('--disable-extensions')
    options.add_argument('--remote-debugging-port=9222')
    
    try:
        driver = webdriver.Chrome(
            service=Service('/usr/bin/chromedriver'),
            options=options
        )
    except:
        driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=options
        )
    
    try:
        print(f"Accessing URL: {search_url}")
        driver.get(search_url)
        
        # Wait for items to load
        wait = WebDriverWait(driver, 10)
        item_cards = wait.until(EC.presence_of_all_elements_located(
            (By.CSS_SELECTOR, '.ItemCardList__item')
        ))
        
        # Extract information
        results = []
        for card in item_cards:
            try:
                # Basic information
                url = card.get_attribute('href')
                if not url or not url.startswith('https://es.wallapop.com/item/'):
                    continue
                
                # Title
                title = card.get_attribute('title')
                
                # Price
                price_element = card.find_element(By.CSS_SELECTOR, '.ItemCard__price')
                price_text = price_element.text if price_element else None
                price = clean_price(price_text)
                
                # Skip items outside price range
                if price and (price < min_price or price > max_price):
                    continue
                
                # Image URL
                try:
                    img_element = card.find_element(By.CSS_SELECTOR, 'img')
                    image_url = img_element.get_attribute('src')
                except:
                    image_url = None
                
                # Check if item is highlighted/featured
                try:
                    highlighted = bool(card.find_element(By.CSS_SELECTOR, '.ItemCard__highlight-text'))
                except:
                    highlighted = False
                
                # Location (if available)
                try:
                    location = card.find_element(By.CSS_SELECTOR, '[data-testid="item-location"]').text
                except:
                    location = None
                
                item_data = {
                    'url': url,
                    'title': title,
                    'price': price,
                    'price_raw': price_text,
                    'image_url': image_url,
                    'highlighted': highlighted,
                    'location': location
                }
                
                results.append(item_data)
                print(f"Found: {title} - {price_text}")
                
            except Exception as e:
                print(f"Error processing item: {e}")
                continue
        
        # Save results
        with open('search_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
            
        print(f"\nTotal items found: {len(results)}")
        return results
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    keywords = "coche"
    latitude = 41.224151
    longitude = 1.7255678
    distance = 100000
    min_price = 18
    max_price = 5000
    
    get_search_results(
        keywords=keywords,
        latitude=latitude,
        longitude=longitude,
        distance=distance,
        min_price=min_price,
        max_price=max_price
    )