import requests
from typing import Dict, Any, Optional
import logging
from urllib.parse import quote

logger = logging.getLogger(__name__)

# Spain's center coordinates (Madrid)
SPAIN_CENTER = {
    'lat': 40.4637,
    'lng': -3.7492
}

# Define unwanted keywords as a global constant
UNWANTED_KEYWORDS = [
    'accidentado', 'accidentada', 'inundado', 'accidente', 'inundó', 'flexicar', 'dana', 'averias', 'golpe', 'averia', 'gripado', 
    'gripada', 'despiece', 'no arranca', 'averiado', 'cambiar motor', '¡No contesto mensajes!', 'averiada', '647 358 133', 'mallorca', 'palma'
]

def format_price_text(price: float) -> str:
    """Format price as text with euro symbol"""
    return f"{price:,.0f} €".replace(",", ".")

def has_unwanted_keywords(text: str, unwanted_keywords: list) -> bool:
    """Check if text contains any unwanted keywords"""
    if not text:
        return False
    
    text = text.lower()
    return any(keyword in text for keyword in unwanted_keywords)

def convert_api_url_to_web_url(api_url: str) -> str:
    """Convert an API URL to a web-friendly URL"""
    # Extract the query parameters
    params = dict(param.split('=') for param in api_url.split('?')[1].split('&'))
    
    # Build the web URL base
    web_url = "https://es.wallapop.com/app/search"
    
    # Keep all original parameters and just add filters_source=deep_link
    params['filters_source'] = 'deep_link'
    
    # Build the query string
    query_string = '&'.join(f'{k}={quote(str(v))}' for k, v in params.items())
    
    return f"{web_url}?{query_string}"

def get_market_price(params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Get market price for the given parameters"""
    try:
        # Debug log the incoming parameters
        logger.info(f"Received params: {params}")
        
        # Build search URL for market analysis
        base_url = "https://api.wallapop.com/api/v3/cars/search"
        
        # Create base search parameters for market analysis
        max_km = params.get('max_kilometers')
        
        # Calculate kilometer range for market analysis (80-110% of max_km)
        if max_km is not None:
            market_max_km = int(float(max_km) * 1.20)  # 110% of max_km
            market_min_km = int(float(max_km) * 0.60)  # 80% of max_km
            logger.info(f"Market analysis km range: {market_min_km} - {market_max_km}")
        else:
            market_max_km = 240000
            market_min_km = None

        # First create the base search params
        search_params = {
            'brand': params.get('brand', ''),
            'model': params.get('model', ''),
            'latitude': format(float(params.get('latitude', SPAIN_CENTER['lat'])), '.4f'),
            'longitude': format(float(params.get('longitude', SPAIN_CENTER['lng'])), '.4f'),
            'category_ids': '100',
            'distance': str(int(params.get('distance', 200)) * 1000),  # Convert km to meters
            'max_km': str(market_max_km),
            'min_sale_price': '3000',
            'order_by': 'price_low_to_high'
        }
        
        # Calculate horsepower range for market analysis (80-130% of min_horse_power)
        min_hp = params.get('min_horse_power')
        if min_hp is not None:
            min_hp = int(float(min_hp))
            market_min_hp = int(min_hp * 0.8)  # 80% of min horsepower
            market_max_hp = int(min_hp * 1.30)  # 130% of min horsepower
            logger.info(f"Market analysis horsepower range: {market_min_hp} - {market_max_hp}")
            search_params['min_horse_power'] = str(market_min_hp)
            search_params['max_horse_power'] = str(market_max_hp)

        # Add minimum kilometers for market analysis
        if market_min_km is not None:
            search_params['min_km'] = str(market_min_km)

        # Add year parameters if provided
        if 'min_year' in params:
            search_params['min_year'] = str(params['min_year'])
        if 'max_year' in params:
            search_params['max_year'] = str(params['max_year'])

        # Add engine type if specified
        if 'engine' in params:
            search_params['engine'] = str(params['engine'])

        # Remove empty parameters
        search_params = {k: v for k, v in search_params.items() if v and v != ''}

        url = f"{base_url}?{'&'.join(f'{k}={quote(str(v))}' for k, v in search_params.items())}"
        web_url = convert_api_url_to_web_url(url)
        logger.info(f"\nMarket price search URL: {url}")
        logger.info(f"\nMarket price web URL: {web_url}")
        
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        # Filter and process all listings
        valid_prices = []
        for listing in data.get('search_objects', []):
            content = listing['content']
            
            # Apply same filtering logic
            kilometers = int(content.get('km', 0))
            if kilometers < 1000 and kilometers >= 200:
                kilometers *= 1000
            elif kilometers <= 200 or kilometers > 200000:
                continue

            # Skip unwanted listings
            if has_unwanted_keywords(content['title'], UNWANTED_KEYWORDS) or \
               has_unwanted_keywords(content.get('storytelling', ''), UNWANTED_KEYWORDS):
                continue

            valid_prices.append(float(content['price']))

        if valid_prices:
            # Sort prices to calculate median and percentiles
            valid_prices.sort()
            num_prices = len(valid_prices)
            median_price = valid_prices[num_prices // 2]
            
            # Calculate average excluding outliers (prices beyond 2 standard deviations)
            mean = sum(valid_prices) / num_prices
            std_dev = (sum((x - mean) ** 2 for x in valid_prices) / num_prices) ** 0.5
            filtered_prices = [p for p in valid_prices if abs(p - mean) <= 2 * std_dev]
            
            avg_price = sum(filtered_prices) / len(filtered_prices) if filtered_prices else mean
            
            # Format market data to match the new database schema
            market_data = {
                'average_price': avg_price,
                'median_price': median_price,
                'min_price': valid_prices[0],
                'max_price': valid_prices[-1],
                'total_listings': len(data.get('search_objects', [])),
                'valid_listings': num_prices,
                'search_url': web_url
            }
            
            logger.info(f"Calculated market data: {market_data}")
            return market_data
        
        logger.warning("No valid prices found for market analysis")
        return None

    except Exception as e:
        logger.error(f"Error getting market price: {str(e)}", exc_info=True)
        return None

def search_wallapop_endpoint(params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Search Wallapop using endpoint parameters.
    Applies the same filtering logic as the original script.
    """
    try:
        # Debug log the incoming parameters
        logger.info(f"Search endpoint received params: {params}")
        logger.info(f"Search endpoint max_kilometers value: {params.get('max_kilometers')}")
        
        # First get market price
        market_data = get_market_price(params)
        if not market_data:
            return {
                "error": "Could not determine market price",
                "search_params": params
            }
            
        
        # Build search URL with price limits from market analysis
        base_url = "https://api.wallapop.com/api/v3/cars/search"
        
        # Calculate price range based on market analysis (50-90% of average price)
        market_avg_price = market_data['average_price']
        min_price = int(market_avg_price * 0.50)  # 50% of market price
        max_price = int(market_avg_price * 0.90)  # 90% of market price
        logger.info(f"Price range for bargain search: {min_price} - {max_price} (based on average price {market_avg_price})")
        
        # Create base search parameters
        search_params = {
            'brand': params.get('brand', ''),
            'model': params.get('model', ''),
            'latitude': format(float(params.get('latitude', SPAIN_CENTER['lat'])), '.4f'),
            'longitude': format(float(params.get('longitude', SPAIN_CENTER['lng'])), '.4f'),
            'category_ids': '100',
            'distance': str(int(params.get('distance', 200)) * 1000),  # Convert km to meters
            'min_sale_price': str(min_price),
            'max_sale_price': str(max_price),
            'max_km': str(params.get('max_kilometers', 240000)),  # Use get() with default
            'order_by': params.get('order_by', 'price_low_to_high')
        }

        # Add year parameters if provided
        if 'min_year' in params:
            search_params['min_year'] = str(params['min_year'])
        if 'max_year' in params:
            search_params['max_year'] = str(params['max_year'])

        # Add engine type if specified
        if 'engine' in params:
            search_params['engine'] = str(params['engine'])

        # Add horsepower if specified (use the same range as in market analysis)
        min_hp = params.get('min_horse_power')
        if min_hp is not None:
            min_hp = int(float(min_hp))
            search_params['min_horse_power'] = str(min_hp)
            search_params['max_horse_power'] = str(int(min_hp * 1.30))

        # Remove empty parameters
        search_params = {k: v for k, v in search_params.items() if v and v != ''}

        url = f"{base_url}?{'&'.join(f'{k}={quote(str(v))}' for k, v in search_params.items())}"
        web_url = convert_api_url_to_web_url(url)
        logger.info(f"\nListing search URL: {url}")
        logger.info(f"\nListing web URL: {web_url}")
        
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        search_results = data.get('search_objects', [])
        filtered_results = []
        
        # Apply filtering logic
        for listing in search_results:
            content = listing['content']
            
            # Handle kilometer conversion and filtering
            kilometers = int(content.get('km', 0))
            if kilometers < 1000 and kilometers >= 200:
                kilometers *= 1000  # Convert to actual kilometers
            elif kilometers <= 200:
                logger.info(f"Filtering out listing {content['id']} - likely new car with {kilometers}km")
                continue

            # Skip if kilometers > 200000
            if kilometers > 200000:
                logger.info(f"Filtering out listing {content['id']} - too many kilometers: {kilometers}")
                continue

            # Check for unwanted keywords in title and description
            title = content['title'].lower()
            description = content.get('storytelling', '').lower()
            
            if has_unwanted_keywords(title, UNWANTED_KEYWORDS) or \
               has_unwanted_keywords(description, UNWANTED_KEYWORDS):
                logger.info(f"Filtering out listing {content['id']} due to unwanted keywords")
                continue
            
            # Update the kilometers value in the listing
            content['km'] = kilometers
            
            # Transform listing to match the new database schema
            price = float(content['price'])
            market_price = market_data['median_price']
            price_difference = market_price - price
            price_difference_percentage = (price_difference / market_price * 100) if market_price > 0 else 0
            
            try:
                distance_km = round(float(content.get('distance', 0)))
            except Exception as e:
                distance_km = 0
            
            transformed_listing = {
                'listing_id': content['id'],
                'title': content['title'],
                'price': price,
                'price_text': format_price_text(price),
                'market_price': market_price,
                'market_price_text': format_price_text(market_price),
                'price_difference': round(price_difference, 2),
                'price_difference_percentage': f"{abs(price_difference_percentage):.1f}%",
                'location': f"{content['location']['city']}, {content['location']['postal_code']}",
                'year': int(content['year']),
                'kilometers': kilometers,
                'fuel_type': content['engine'].capitalize() if content['engine'] else '',
                'transmission': content['gearbox'].capitalize() if content['gearbox'] else '',
                'url': f"https://es.wallapop.com/item/{content['web_slug']}",
                'horsepower': float(content.get('horsepower', 0)),
                'distance': distance_km,
                'listing_images': [
                    {'image_url': img.get('large', img.get('original'))} 
                    for img in content.get('images', [])
                    if isinstance(img, dict) and (img.get('large') or img.get('original'))
                ]
            }
            filtered_results.append(transformed_listing)
        
        # Create the final result matching the new database schema
        result = {
            'success': True,
            'search_parameters': search_params,
            'listings': filtered_results,
            'total_results': len(search_results),
            'filtered_results': len(filtered_results),
            'search_url': web_url,
            'market_data': market_data,
            'market_search_url': market_data['search_url']
        }
        
        logger.info(f"Final response structure: {list(result.keys())}")  # Log the keys to verify structure
        return result
        
    except Exception as e:
        logger.error(f"Error searching Wallapop: {str(e)}", exc_info=True)
        return {
            "error": str(e),
            "search_params": params
        } 