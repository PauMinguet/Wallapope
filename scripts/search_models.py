import pandas as pd
import sys
import os
import urllib.parse
import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

def search_all_models(latitude=41.224151, longitude=1.7255678):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(current_dir, 'data.csv')
    df = pd.read_csv(csv_path)
    
    all_results = {}
    
    # Create a single browser instance with additional options
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')  # Set window size
    options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')  # Set user agent
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    try:
        for index, row in df.iterrows():
            model = row['Modelo']
            max_price = int(row['Precio Máximo'])
            min_year = int(row['Año Mínimo'])
            max_year = int(row['Año Máximo'])
            
            print(f"\nSearching for {model} ({min_year}-{max_year})...")
            model_results = []
            results_by_year = {}
            
            # Import here to use the same driver
            sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from main import get_search_results
            
            for year in range(min_year, max_year + 1):
                try:
                    # Format model name and keywords properly
                    if "Volkswagen" in model:
                        search_model = f"vw golf"  # Add "golf" to the search
                    else:
                        search_model = model.lower()  # Convert to lowercase
                    
                    keywords = f"{search_model} {year}"
                    
                    print(f"\nSearching {keywords}...")
                    
                    # Try to load a simple page first to verify browser works
                    try:
                        driver.get("https://www.wallapop.com")
                        time.sleep(2)  # Wait for page to load
                    except Exception as e:
                        print(f"Error loading Wallapop homepage: {str(e)}")
                        continue
                    
                    results = get_search_results(
                        keywords=keywords,
                        latitude=latitude,
                        longitude=longitude,
                        distance=100000,
                        min_price=1000,
                        max_price=max_price,
                        driver=driver
                    )
                    
                    if results:
                        year_results = [
                            item for item in results 
                            if str(year) in item['title'].lower()
                        ]
                        if year_results:
                            print(f"Found {len(year_results)} results for {year}")
                            model_results.extend(year_results)
                            results_by_year[str(year)] = year_results
                        else:
                            print(f"No matching results for year {year}")
                    else:
                        print(f"No results found for {keywords}")
                    
                    # Wait between searches
                    time.sleep(5)  # Increased wait time
                    
                except Exception as e:
                    print(f"Error searching for {model} {year}:")
                    print(f"Error type: {type(e).__name__}")
                    print(f"Error message: {str(e)}")
                    if hasattr(e, 'msg'):
                        print(f"Selenium message: {e.msg}")
                    time.sleep(10)  # Longer wait after error
                    continue
            
            if model_results:
                all_results[model] = {
                    'parameters': {
                        'max_price': max_price,
                        'min_year': min_year,
                        'max_year': max_year,
                        'colors': row['Colores'].split('/'),
                        'max_km': row['Km'].replace('Menos de ', ''),
                        'maintenance': row['Mantenimiento'],
                        'common_repairs': row['Reparaciones'].split('/')
                    },
                    'results': model_results,
                    'results_by_year': results_by_year
                }
    
    finally:
        try:
            driver.quit()
        except:
            pass
    
    output_path = os.path.join(current_dir, 'model_search_results.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    return all_results

if __name__ == "__main__":
    print("Starting model-specific searches...")
    start_time = time.time()
    
    results = search_all_models()
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"\nSearch completed in {duration:.2f} seconds!")
    print("Results saved to model_search_results.json")
    
    print("\nSummary:")
    for model, data in results.items():
        total_results = len(data['results'])
        year_range = f"{data['parameters']['min_year']}-{data['parameters']['max_year']}"
        max_price = data['parameters']['max_price']
        
        print(f"\n{model} ({year_range}) - Total: {total_results} results (Max price: {max_price}€)")
        for year in sorted(data['results_by_year'].keys()):
            year_count = len(data['results_by_year'][year])
            print(f"  {year}: {year_count} results")