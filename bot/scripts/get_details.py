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
from collections import deque

@ray.remote
class DetailScraper:
    def __init__(self, worker_id):
        self.worker_id = worker_id
        options = webdriver.ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
        self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    def get_listing_details(self, url, model_info):
        try:
            print(f"Worker {self.worker_id} scraping: {url}")
            self.driver.get(url)
            time.sleep(2)
            
            details = {
                'url': url,
                'model': model_info['model'],
                'parameters': model_info['parameters'],
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
                print(f"Worker {self.worker_id}: No images found for {url}")

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
                filtered_text = [
                    text.strip() 
                    for text in all_text 
                    if text.strip() and len(text.strip()) > 1
                ]
                
                # Remove duplicates while preserving order
                seen = set()
                filtered_text = [
                    x for x in filtered_text 
                    if not (x in seen or seen.add(x))
                ]
                
                # Find start and end markers
                start_idx = -1
                end_idx = len(filtered_text)
                
                for i, text in enumerate(filtered_text):
                    if text == "Inicio":
                        start_idx = i
                    elif "© 2013-2024 Wallapop" in text:
                        end_idx = i
                        break
                
                # Only keep text between markers
                if start_idx != -1:
                    details['info'] = filtered_text[start_idx + 1:end_idx]  # Skip "Inicio"
                else:
                    details['info'] = []
                
            except Exception as e:
                print(f"Worker {self.worker_id} error getting text: {str(e)}")

            print(f"Worker {self.worker_id} completed: {url}")
            print(f"Found {len(details['info'])} text items")
            return details
            
        except Exception as e:
            print(f"Worker {self.worker_id} error scraping {url}: {str(e)}")
            return None
        
    def cleanup(self):
        self.driver.quit()

def save_results(results, is_intermediate=True):
    # Process results
    final_results = {}
    for result in results:
        if result is not None:
            model = result['model']
            if model not in final_results:
                final_results[model] = {
                    'parameters': result['parameters'],
                    'listings': []
                }
            final_results[model]['listings'].append(result)
    
    # Save results with timestamp for intermediate saves
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    if is_intermediate:
        output_file = f'detailed_results_intermediate_{timestamp}.json'
    else:
        output_file = 'detailed_results.json'
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_results, f, indent=2, ensure_ascii=False)
    
    # Also save a progress summary
    progress_file = 'scraping_progress.json'
    progress_info = {
        'timestamp': timestamp,
        'total_processed': len(results),
        'models_summary': {
            model: len(data['listings']) 
            for model, data in final_results.items()
        },
        'last_processed_urls': [
            result['url'] 
            for result in results[-10:]  # Last 10 processed URLs
        ] if results else []
    }
    
    with open(progress_file, 'w', encoding='utf-8') as f:
        json.dump(progress_info, f, indent=2, ensure_ascii=False)
    
    print(f"\nResults saved to {output_file}")
    print(f"Progress info saved to {progress_file}")
    print("\nSummary:")
    for model, data in final_results.items():
        print(f"{model}: {len(data['listings'])} listings processed")

def main():
    if not ray.is_initialized():
        ray.init(ignore_reinit_error=True)
    
    print("Loading model_search_results.json...")
    with open('model_search_results.json', 'r', encoding='utf-8') as f:
        all_results = json.load(f)
    
    # Create work queue
    work_queue = deque()
    for model, data in all_results.items():
        parameters = data['parameters']
        for item in data['results']:
            work_queue.append((item['url'], {
                'model': model,
                'parameters': parameters
            }))
    
    total_urls = len(work_queue)
    print(f"Total URLs to process: {total_urls}")
    
    # Create scrapers with unique IDs
    num_scrapers = min(20, total_urls)  # Don't create more scrapers than URLs
    print(f"Creating {num_scrapers} browser instances...")
    scrapers = [DetailScraper.remote(i) for i in range(num_scrapers)]
    
    # Process URLs in batches
    batch_size = num_scrapers
    results = []
    
    while work_queue:
        # Get next batch of work
        batch = []
        for _ in range(min(batch_size, len(work_queue))):
            batch.append(work_queue.popleft())
        
        # Assign work to scrapers
        futures = []
        for i, (url, model_info) in enumerate(batch):
            scraper = scrapers[i % num_scrapers]
            futures.append(scraper.get_listing_details.remote(url, model_info))
        
        # Wait for batch to complete
        batch_results = ray.get(futures)
        valid_results = [r for r in batch_results if r is not None]
        results.extend(valid_results)
        
        # Print and save progress
        processed = total_urls - len(work_queue)
        print(f"\nProgress: {processed}/{total_urls} URLs processed")
        
        # Save intermediate results more frequently
        if valid_results:  # Save whenever we have new valid results
            save_results(results, is_intermediate=True)
    
    # Save final results
    save_results(results, is_intermediate=False)
    
    # Cleanup
    for scraper in scrapers:
        ray.get(scraper.cleanup.remote())
    ray.shutdown()

if __name__ == "__main__":
    main() 