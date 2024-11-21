import json
import ray
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import os

@ray.remote
class DetailScraper:
    def __init__(self):
        options = webdriver.ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
        self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    def get_listing_details(self, url, title, price_raw, max_price):
        try:
            # Price validation
            try:
                price_str = price_raw.replace('€', '').replace('.', '').replace(',', '.').strip()
                price = float(price_str)
                min_valid_price = max_price / 3
                
                if price < min_valid_price:
                    print(f"Skipping {title} - Price too low ({price}€ < {min_valid_price}€)")
                    return None
            except:
                print(f"Could not parse price for {title}: {price_raw}")
                return None

            print(f"Scraping details for: {title} ({price_raw})")
            self.driver.get(url)
            time.sleep(2)
            
            details = {
                'url': url,
                'info': [],
                'images': []
            }
            
            # Get all images
            try:
                image_elements = WebDriverWait(self.driver, 5).until(
                    EC.presence_of_all_elements_located((By.CSS_SELECTOR, 'img[src*="cdn.wallapop.com"]'))
                )
                details['images'] = [img.get_attribute('src') for img in image_elements if img.get_attribute('src')]
            except:
                print(f"No images found for {title}")

            # Get all text content using JavaScript
            try:
                script = """
                function getAllText(element = document.body) {
                    let text = [];
                    for (let node of element.childNodes) {
                        if (node.nodeType === 3 && node.textContent.trim()) {
                            text.push(node.textContent.trim());
                        }
                        if (node.nodeType === 1 && !['SCRIPT', 'STYLE'].includes(node.tagName)) {
                            text = text.concat(getAllText(node));
                        }
                    }
                    return text;
                }
                return getAllText();
                """
                all_text = self.driver.execute_script(script)
                
                # Clean and filter text
                details['info'] = [
                    text.strip() 
                    for text in all_text 
                    if text.strip() and len(text.strip()) > 1  # Filter out single characters
                ]
                
                # Remove duplicates while preserving order
                seen = set()
                details['info'] = [
                    x for x in details['info'] 
                    if not (x in seen or seen.add(x))
                ]
                
                # Find start and end indices
                try:
                    start_idx = details['info'].index("Inicio")
                    end_idx = details['info'].index("Sigue explorando")
                    
                    # Keep only the content between "Inicio" and "Sigue explorando"
                    details['info'] = details['info'][start_idx:end_idx + 1]
                except ValueError:
                    print("Could not find start/end markers in text")
                
            except Exception as e:
                print(f"Error getting text: {str(e)}")

            print(f"Successfully scraped details for: {title}")
            print(f"Found {len(details['info'])} text items")
            return details
            
        except Exception as e:
            print(f"Error scraping {title}: {str(e)}")
            return None
        
    def cleanup(self):
        self.driver.quit()

def main():
    if not ray.is_initialized():
        ray.init()
    
    print("Loading model_search_results.json...")
    with open('model_search_results.json', 'r', encoding='utf-8') as f:
        all_results = json.load(f)
    
    num_scrapers = 20
    print(f"Creating {num_scrapers} browser instances...")
    scrapers = [DetailScraper.remote() for _ in range(num_scrapers)]
    scraper_index = 0
    
    detailed_results = {}
    futures = []
    
    # Process each model
    for model, data in all_results.items():
        print(f"\nProcessing {model}...")
        max_price = data['parameters']['max_price']
        
        # Limit to 15 listings per model
        model_listings = data['results']
        print(f"Processing {len(model_listings)} out of {len(data['results'])} listings")
        
        model_futures = []
        for item in model_listings:
            scraper = scrapers[scraper_index % num_scrapers]
            future = scraper.get_listing_details.remote(
                item['url'],
                item['title'],
                item.get('price_raw', item.get('price', 'N/A')),
                max_price
            )
            model_futures.append((future, item))
            futures.append(future)
            scraper_index += 1
        
        detailed_results[model] = {
            'parameters': data['parameters'],
            'listings': model_futures
        }
    
    if not futures:
        print("No listings to process!")
        return
    
    print(f"\nWaiting for {len(futures)} scraping tasks to complete...")
    results = ray.get(futures)
    
    # Process results
    final_results = {}
    for model, data in detailed_results.items():
        valid_results = []
        for future_result, original_item in zip(results, data['listings']):
            if future_result is not None:
                valid_results.append(future_result)
        
        if valid_results:
            final_results[model] = {
                'parameters': data['parameters'],
                'listings': valid_results
            }
    
    # Save results
    output_file = 'detailed_results.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_results, f, indent=2, ensure_ascii=False)
    
    print(f"\nDetailed results saved to {output_file}")
    
    # Print summary
    print("\nSummary:")
    for model, data in final_results.items():
        print(f"{model}: {len(data['listings'])} valid listings processed")
    
    # Cleanup
    for scraper in scrapers:
        ray.get(scraper.cleanup.remote())
    ray.shutdown()

if __name__ == "__main__":
    main() 