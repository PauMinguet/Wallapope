import pandas as pd
import sys
import os
import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

def save_results_to_files(all_results, current_dir):
    """Save results to both JSON and CSV files"""
    # Save JSON
    json_path = os.path.join(current_dir, 'model_search_results.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    # Create CSV data
    csv_data = []
    for model, data in all_results.items():
        for result in data['results']:
            csv_row = {
                'model': model,
                'url': result['url'],
                'year_range': data['parameters']['year_range'],
                'motors': '; '.join(data['parameters']['motors']),
                'colors': '; '.join(data['parameters']['colors']),
                'kilometers': data['parameters']['kilometers'],
                'price_reference': data['parameters']['price']
            }
            csv_data.append(csv_row)
    
    # Save CSV
    csv_path = os.path.join(current_dir, 'model_search_results.csv')
    pd.DataFrame(csv_data).to_csv(csv_path, index=False, encoding='utf-8')
    
    print(f"\nResults saved to:")
    print(f"- {json_path}")
    print(f"- {csv_path}")

def search_all_models(latitude=41.224151, longitude=1.7255678):
    # Import main.py functions first
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from main import get_search_results, load_car_data
    
    # Use the load_car_data function from main.py to ensure consistency
    df = load_car_data()
    
    # Clean up column names - remove colons and whitespace
    df.columns = df.columns.str.strip().str.rstrip(':')
    
    all_results = {}
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Setup Chrome options
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    try:
        total_models = len(df)
        for index, row in df.iterrows():
            # Extract model name and clean it
            model = row['Marca'].strip()
            
            print(f"\nProcessing model {index + 1}/{total_models}: {model}")
            
            # Extract year range and clean it
            year_str = row['Año'].strip('() ')  # Remove parentheses and spaces
            try:
                min_year, max_year = map(int, year_str.split('-'))
            except ValueError as e:
                print(f"Error parsing year range for {model}: {year_str}")
                print(f"Error: {str(e)}")
                continue
            
            print(f"Searching for {model} ({min_year}-{max_year})...")
            
            # Single search for the model with year range
            keywords = f"coche {model}"
            print(f"Searching {keywords}...")
            
            try:
                # Verify browser works
                driver.get("https://www.wallapop.com")
            except Exception as e:
                print(f"Error loading Wallapop homepage: {str(e)}")
                continue
            
            # Get search results with all parameters
            results = get_search_results(
                keywords=keywords,
                latitude=latitude,
                longitude=longitude,
                car_model=model,
                driver=driver
            )
            
            if results:
                print(f"Found {len(results)} URLs for {model}")
                
                all_results[model] = {
                    'parameters': {
                        'year_range': f"{min_year}-{max_year}",
                        'motors': row['Motores'].split(',') if 'Motores' in row and pd.notna(row['Motores']) else [],
                        'colors': row['Colores'].split(',') if 'Colores' in row and pd.notna(row['Colores']) else [],
                        'kilometers': row['Kilometraje'] if 'Kilometraje' in row and pd.notna(row['Kilometraje']) else None,
                        'price': row['Precio medio'] if 'Precio medio' in row else None
                    },
                    'results': results
                }
                
                # Save after each model is processed
                save_results_to_files(all_results, current_dir)
                print(f"Progress saved after processing {model}")
            else:
                print(f"No results found for {model}")
    
    finally:
        try:
            driver.quit()
        except:
            pass
    
    return all_results

if __name__ == "__main__":
    print("Starting model-specific searches...")
    start_time = time.time()
    
    results = search_all_models()
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"\nSearch completed in {duration:.2f} seconds!")
    
    print("\nSummary:")
    for model, data in results.items():
        total_results = len(data['results'])
        year_range = data['parameters']['year_range']
        price_info = data['parameters']['price']
        
        print(f"\n{model} ({year_range}) - Total: {total_results} results")
        print(f"Price range: {price_info}")