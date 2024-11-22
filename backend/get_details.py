from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import json
import time
from datetime import datetime
import ray

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

    def get_text_content(self, element):
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

    def get_listing_details(self, url):
        """Extract details from a single listing"""
        try:
            print(f"Worker {self.worker_id} scraping: {url}")
            self.driver.get(url)
            time.sleep(2)

            details = {
                'url': url,
                'info': [],
                'images': []
            }

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
                    details['info'] = filtered_text[start_idx + 1:end_idx]
                else:
                    details['info'] = filtered_text

            except Exception as e:
                print(f"Worker {self.worker_id} error getting text: {str(e)}")

            # Get images
            try:
                images = self.driver.find_elements(By.CSS_SELECTOR, 'img[src*="cdn.wallapop.com"]')
                details['images'] = [img.get_attribute('src') for img in images if img.get_attribute('src')]
            except:
                print(f"Worker {self.worker_id} could not find images")

            print(f"Worker {self.worker_id} completed: {url}")
            return details

        except Exception as e:
            print(f"Worker {self.worker_id} error scraping {url}: {str(e)}")
            return None

    def cleanup(self):
        self.driver.quit()

def process_search_results(search_results_file='search_results.json'):
    """Process all listings from search results in parallel"""
    if not ray.is_initialized():
        ray.init(ignore_reinit_error=True)

    try:
        # Load search results
        with open(search_results_file, 'r', encoding='utf-8') as f:
            search_results = json.load(f)

        # Initialize results dictionary with same structure
        detailed_results = {}

        # Create work queue
        work_queue = []
        for request_id, data in search_results.items():
            for listing in data['listings']:
                work_queue.append((request_id, listing['url'], data))

        total_urls = len(work_queue)
        print(f"Total URLs to process: {total_urls}")

        # Create scrapers with unique IDs
        num_scrapers = min(20, total_urls)  # Don't create more scrapers than URLs
        print(f"Creating {num_scrapers} browser instances...")
        scrapers = [DetailScraper.remote(i) for i in range(num_scrapers)]

        # Process URLs in batches
        batch_size = num_scrapers
        processed = 0

        while work_queue:
            # Get next batch of work
            batch = work_queue[:batch_size]
            work_queue = work_queue[batch_size:]

            # Assign work to scrapers
            futures = []
            for i, (request_id, url, data) in enumerate(batch):
                scraper = scrapers[i % num_scrapers]
                futures.append((request_id, data, scraper.get_listing_details.remote(url)))

            # Wait for batch to complete
            for request_id, data, future in futures:
                details = ray.get(future)
                if details:
                    if request_id not in detailed_results:
                        detailed_results[request_id] = {
                            'request': data['request'],
                            'search_parameters': data['search_parameters'],
                            'listings': []
                        }
                    detailed_results[request_id]['listings'].append(details)

            processed += len(batch)
            print(f"Progress: {processed}/{total_urls} URLs processed")

        # Cleanup
        for scraper in scrapers:
            ray.get(scraper.cleanup.remote())
        ray.shutdown()

        return detailed_results

    except Exception as e:
        print(f"Error processing search results: {str(e)}")
        if ray.is_initialized():
            ray.shutdown()
        return None

if __name__ == "__main__":
    print("Starting to get detailed information for listings...")
    results = process_search_results()
    
    if results:
        print("\nSummary:")
        for request_id, data in results.items():
            print(f"\nRequest {request_id}:")
            print(f"Car: {data['request']['marca']} {data['request']['modelo']}")
            print(f"Listings processed: {len(data['listings'])}") 