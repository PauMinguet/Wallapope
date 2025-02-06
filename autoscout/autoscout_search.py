import cloudscraper
import json
import re
from datetime import datetime
from supabase import create_client
from dateutil.parser import parse
from dotenv import load_dotenv
import os

load_dotenv()
# Constants
MAX_PRICE_EUR = 15000  # Maximum price in EUR
CHF_TO_EUR_RATE = 1.067  # Exchange rate: 1 CHF = 1.0590 EUR

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Search configurations for different Golf models
SEARCH_CONFIGS = {
    "golf_7_gti": {
        "name": "Golf GTI MK7",
        "params": {
            "query": {
                "vehicleCategories": ["car"],
                "firstRegistrationYearFrom": 2013,
                "firstRegistrationYearTo": 2017,
                "horsePowerFrom": 220,
                "mileageTo":200000,
                "makeModelVersions": [
                    {
                        "modelKey": "golf",
                        "makeKey": "vw"
                    }
                ],
                "fuelTypes": ["petrol"]
            }
        }
    },
    "golf_6_gti": {
        "name": "Golf GTI MK6",
        "params": {
            "query": {
                "vehicleCategories": ["car"],
                "firstRegistrationYearFrom": 2009,
                "firstRegistrationYearTo": 2013,
                "horsePowerFrom": 190,
                "mileageTo":200000,
                "makeModelVersions": [
                    {
                        "modelKey": "golf",
                        "makeKey": "vw"
                    }
                ],
                "fuelTypes": ["petrol"]
            }
        }
    },
    "golf_7_r": {
        "name": "Golf R MK7",
        "params": {
            "query": {
                "vehicleCategories": ["car"],
                "firstRegistrationYearFrom": 2013,
                "firstRegistrationYearTo": 2017,
                "horsePowerFrom": 300,
                "mileageTo":200000,
                "bodyTypes": ["small-car", "saloon"],
                "makeModelVersions": [
                    {
                        "modelKey": "golf",
                        "makeKey": "vw"
                    }
                ],
                "fuelTypes": ["petrol"]
            }
        }
    },
    "golf_6_r": {
        "name": "Golf R MK6",
        "params": {
            "query": {
                "vehicleCategories": ["car"],
                "firstRegistrationYearFrom": 2009,
                "firstRegistrationYearTo": 2013,
                "horsePowerFrom": 270,
                "mileageTo":200000,
                "bodyTypes": ["small-car", "saloon"],
                "makeModelVersions": [
                    {
                        "modelKey": "golf",
                        "makeKey": "vw"
                    }
                ],
                "fuelTypes": ["petrol"]
            }
        }
    }
}

# Common parameters for all searches
COMMON_PARAMS = {
    "pagination": {
        "page": 0,
        "size": 20
    },
    "sort": [
        {
            "order": "ASC",
            "type": "PRICE"
        }
    ]
}

def generate_listing_url(listing):
    # Convert version name to URL-friendly format
    version = listing.get('versionFullName', '').lower().replace(' ', '-')
    # Remove any special characters except hyphen
    version = re.sub(r'[^a-z0-9-]', '', version)
    return f"https://www.autoscout24.ch/fr/d/{version}-{listing['id']}"

def save_to_supabase(config_key, config, listings):
    # First, create a run record
    run_data = {
        'model_key': config_key,
        'model_name': config['name'],
        'registration_year_from': config['params']['query']['firstRegistrationYearFrom'],
        'registration_year_to': config['params']['query']['firstRegistrationYearTo'],
        'horsepower_from': config['params']['query']['horsePowerFrom'],
        'mileage_to': config['params']['query'].get('mileageTo'),
        'max_price_eur': MAX_PRICE_EUR,
        'max_price_chf': round(MAX_PRICE_EUR * CHF_TO_EUR_RATE),  # Convert EUR to CHF
        'body_types': config['params']['query'].get('bodyTypes'),
        'total_results': len(listings)
    }
    
    # Insert run and get the run_id
    run_result = supabase.table('autoscout_runs').insert(run_data).execute()
    run_id = run_result.data[0]['id']
    
    # Prepare and insert listings
    for listing in listings:
        # Convert CHF price to EUR
        price_chf = listing['price']
        price_eur = round(price_chf / CHF_TO_EUR_RATE)
        previous_price_eur = round(listing.get('previousPrice', 0) / CHF_TO_EUR_RATE) if listing.get('previousPrice') else None

        # Parse dates and convert to ISO format strings
        created_at = parse(listing['createdDate']).isoformat()
        last_modified_at = parse(listing['lastModifiedDate']).isoformat()
        registration_date = parse(listing['firstRegistrationDate']).isoformat()

        # Convert image keys to full URLs
        image_urls = []
        
        for img in listing['images']:
            # Extract the ID part from the key (e.g., "75/10873075" from "75/10873075/0.jpg")
            id_parts = img['key'].split('/')
            
            # Use the original key format
            full_url = f"https://listing-images.autoscout24.ch/{img['key']}?w=800&q=70"
            image_urls.append(full_url)


        # Only proceed if we have valid images
        if not image_urls:
            # If no valid images, try the first image key as is
            if listing['images'] and len(listing['images']) > 0:
                image_urls = [f"https://listing-images.autoscout24.ch/{listing['images'][0]['key']}?w=800&q=70"]

        # Get CO2 emissions
        co2 = get_emissions_data(listing)
        
        # Calculate taxes
        import_fee = price_chf * 0.31
        
        # Determine emissions tax percentage
        if co2 is not None:
            if co2 <= 120:
                emissions_tax_pct = 0
            elif co2 <= 160:
                emissions_tax_pct = 4.75
            elif co2 <= 200:
                emissions_tax_pct = 9.75
            else:
                emissions_tax_pct = 14.75
            
            emissions_tax = price_chf * (emissions_tax_pct / 100)
        else:
            emissions_tax_pct = None
            emissions_tax = None
        
        total_cost = price_chf + import_fee + (emissions_tax or 0)
        
        listing_data = {
            'id': listing['id'],
            'run_id': run_id,
            'version_name': listing['versionFullName'],
            'listing_url': listing['listingUrl'],
            'price': price_chf,
            'price_chf': price_chf,
            'price_eur': price_eur,
            'mileage': listing['mileage'],
            'registration_date': registration_date,
            'registration_year': listing['firstRegistrationYear'],
            'horse_power': listing['horsePower'],
            'kilo_watts': listing['kiloWatts'],
            'fuel_type': listing['fuelType'],
            'transmission_type': listing['transmissionType'],
            'transmission_type_group': listing['transmissionTypeGroup'],
            'consumption_combined': listing.get('consumption', {}).get('combined'),
            'seller_name': listing['seller']['name'],
            'seller_type': listing['seller']['type'],
            'seller_city': listing['seller']['city'],
            'seller_zip': listing['seller']['zipCode'],
            'teaser': listing.get('teaser'),
            'images': image_urls,
            'created_at': created_at,
            'last_modified_at': last_modified_at,
            'co2_emissions': co2,
            'import_fee': import_fee,
            'emissions_tax_percentage': emissions_tax_pct,
            'emissions_tax': emissions_tax,
            'total_cost': total_cost
        }
        
        # Use upsert instead of insert
        supabase.table('autoscout_listings').upsert(listing_data).execute()
    
    return {'run_id': run_id, 'total_listings': len(listings)}

def search_autoscout(config_key):
    config = SEARCH_CONFIGS[config_key]
    search_params = config['params'].copy()
    search_params.update(COMMON_PARAMS)
    
    url = "https://api.autoscout24.ch/v1/listings/search"
    
    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
    
    try:
        scraper = cloudscraper.create_scraper()
        response = scraper.post(url, json=search_params, headers=headers)
        
        print(f"\nSearching for {config['name']}...")
        print(f"Status code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Error: Status code {response.status_code}")
            return None
            
        search_results = response.json()
        
        # Filter out listings above max price in EUR
        if 'content' in search_results:
            filtered_content = []
            for listing in search_results['content']:
                price_chf = listing.get('price', float('inf'))
                price_eur = price_chf / CHF_TO_EUR_RATE
                if price_eur <= MAX_PRICE_EUR:
                    listing['listingUrl'] = generate_listing_url(listing)
                    filtered_content.append(listing)
            
            # Save to Supabase
            result = save_to_supabase(config_key, config, filtered_content)
            print(f"Found {len(filtered_content)} listings under {MAX_PRICE_EUR}€")
            print(f"Saved to run_id: {result['run_id']}")
            
            return result
        
    except Exception as e:
        print(f"Error making request: {str(e)}")
        return None

def clear_tables():
    print("Clearing previous data...")
    # Delete all records from listings first (due to foreign key constraint)
    supabase.table('autoscout_listings').delete().neq('id', 0).execute()
    # Then delete all records from runs
    supabase.table('autoscout_runs').delete().neq('id', 0).execute()
    print("Tables cleared successfully")

def search_all_models():
    # Clear all existing data first
    clear_tables()
    
    results = {}
    for config_key in SEARCH_CONFIGS:
        results[config_key] = search_autoscout(config_key)
    return results

def find_emissions_in_db(make, model, version_name, year, horsepower):
    """
    Try to find matching emissions data in our database
    """
    response = supabase.table('car_emissions_data')\
        .select('*')\
        .eq('make', make)\
        .eq('model', model)\
        .lte('year_from', year)\
        .gte('year_to', year)\
        .eq('horsepower', horsepower)\
        .execute()
    
    if response.data and len(response.data) > 0:
        return response.data[0]['co2_emissions']
    return None

def search_and_store_emissions(make, model, version_name, year, horsepower):
    """
    Search Ultimate Specs for emissions data and store in our database
    """
    # First check if we already have this data
    existing = find_emissions_in_db(make, model, version_name, year, horsepower)
    if existing:
        return existing

    try:
        # Format search query
        search_query = f"{make} {model} {horsepower}cv {year} co2 ultimate specs"
        
        # Here we'd implement the web scraping logic for Ultimate Specs
        # This is a placeholder for the actual implementation
        co2_emissions = search_ultimate_specs(search_query)
        
        if co2_emissions:
            # Store in database
            emissions_data = {
                'make': make,
                'model': model,
                'version_name': version_name,
                'year_from': year,  # We could make this smarter to cover ranges
                'year_to': year,
                'horsepower': horsepower,
                'co2_emissions': co2_emissions,
                'source_url': f"https://www.ultimatespecs.com/car-specs/{make}/{model}..."  # Actual URL
            }
            
            supabase.table('car_emissions_data').upsert(emissions_data).execute()
            return co2_emissions
            
    except Exception as e:
        print(f"Error searching/storing emissions data: {str(e)}")
        return None

def get_emissions_data(listing):
    """
    Get emissions data for a listing, searching and storing if necessary
    """
    make = listing['make']['name']
    model = listing['model']['name']
    version_name = listing['versionFullName']
    year = listing['firstRegistrationYear']
    horsepower = listing['horsePower']
    
    return search_and_store_emissions(
        make, model, version_name, year, horsepower
    )

def search_ultimate_specs(search_query):
    """
    Get CO2 emissions from our known mappings
    Returns CO2 emissions in g/km or None if not found
    """
    # Mapping of Golf models to their CO2 emissions with HP ranges
    GOLF_EMISSIONS = {
        # Golf R MK7 (2013-2017)
        ((295, 310), range(2013, 2018)): 165,  # 2.0 TSI ~300HP (including variants)
        
        # Golf GTI MK7 (2013-2017)
        ((215, 225), range(2013, 2018)): 139,  # 2.0 TSI 220HP
        ((225, 235), range(2013, 2018)): 139,  # 2.0 TSI Performance 230HP
        ((260, 270), range(2013, 2018)): 139,  # Performance Pack variants
        
        # Golf R MK6 (2009-2013)
        ((265, 275), range(2009, 2014)): 199,  # 2.0 TSI 270HP
        ((295, 315), range(2009, 2014)): 199,  # Modified R variants
        
        # Golf GTI MK6 (2009-2013)
        ((190, 215), range(2009, 2014)): 170,  # 2.0 TSI 211HP (including lower variants)
        ((230, 240), range(2009, 2014)): 170,  # Edition 35 variants
    }
    
    # Extract horsepower and year from search query
    hp_match = re.search(r'(\d+)cv', search_query)
    year_match = re.search(r'\b(20\d{2})\b', search_query)
    
    if hp_match and year_match:
        horsepower = int(hp_match.group(1))
        year = int(year_match.group(1))
        
        # Find matching emissions
        for ((hp_min, hp_max), years), emissions in GOLF_EMISSIONS.items():
            if hp_min <= horsepower <= hp_max and year in years:
                print(f"Found CO2 emissions for {horsepower}HP {year} (range {hp_min}-{hp_max}HP): {emissions} g/km")
                return emissions
    
    print(f"No CO2 emissions data found for query: {search_query}")
    return None

if __name__ == "__main__":
    search_all_models() 