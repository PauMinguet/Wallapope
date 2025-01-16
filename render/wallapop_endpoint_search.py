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
    'accidentado', 'accidentada', 'inundado', 'accidente', 'inundó', 'dana', 'averias', 'golpe', 'averia', 'gripado', 
    'gripada', 'despiece', 'reparar', 'no arranca', 'averiado', 'averiada', '647 358 133', 'mallorca', 'palma'
]

def has_unwanted_keywords(text: str, unwanted_keywords: list) -> bool:
    """Check if text contains any unwanted keywords"""
    if not text:
        return False
    
    text = text.lower()
    return any(keyword in text for keyword in unwanted_keywords)

def get_market_price(params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Get market price for the given parameters"""
    try:
        # Build search URL for market analysis
        base_url = "https://es.wallapop.com/api/v3/cars/search"
        
        # Create base search parameters for market analysis
        search_params = {
            'keywords': params.get('keywords', ''),
            'brand': params.get('brand', ''),
            'model': params.get('model', ''),
            'latitude': format(float(params.get('latitude', SPAIN_CENTER['lat'])), '.4f'),
            'longitude': format(float(params.get('longitude', SPAIN_CENTER['lng'])), '.4f'),
            'category_ids': '100',
            'distance': str(int(params.get('distance', 200)) * 1000),  # Convert km to meters
            'max_km': str(params.get('max_kilometers', 240000)),  # Add max kilometers
            'min_sale_price': '3000',  # Base minimum price for market analysis
            'order_by': 'price_low_to_high'
        }

        # Remove empty parameters
        search_params = {k: v for k, v in search_params.items() if v}

        # Add year parameters if provided
        if 'min_year' in params:
            search_params['min_year'] = str(params['min_year'])
        if 'max_year' in params:
            search_params['max_year'] = str(params['max_year'])

        # Add engine type if specified
        if 'engine' in params:
            search_params['engine'] = str(params['engine'])

        url = f"{base_url}?{'&'.join(f'{k}={quote(str(v))}' for k, v in search_params.items())}"
        logger.info(f"\nMarket price search URL: {url}")
        
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        # Filter and process all listings
        valid_prices = []
        for listing in data.get('search_objects', []):  # Process all listings
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
            
            market_data = {
                'market_price': median_price,  # Use median as market price
                'median_price': median_price,
                'average_price': avg_price,  # Average price excluding outliers
                'min_price': valid_prices[0],  # Minimum actual price
                'max_price': valid_prices[-1],  # Maximum actual price
                'total_listings': len(data.get('search_objects', [])),
                'valid_listings': num_prices,
                'sample_size': len(filtered_prices)  # Number of prices used for average calculation
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
        # First get market price
        market_data = get_market_price(params)
        if not market_data:
            return {
                "error": "Could not determine market price",
                "search_params": params
            }
            
        logger.info(f"Market price analysis: {market_data}")
        
        # Build search URL with price limits from market analysis
        base_url = "https://es.wallapop.com/api/v3/cars/search"
        
        # Create base search parameters
        search_params = {
            'keywords': params.get('keywords', ''),
            'brand': params.get('brand', ''),
            'model': params.get('model', ''),
            'latitude': format(float(params.get('latitude', SPAIN_CENTER['lat'])), '.4f'),
            'longitude': format(float(params.get('longitude', SPAIN_CENTER['lng'])), '.4f'),
            'category_ids': '100',
            'distance': str(int(params.get('distance', 200)) * 1000),  # Convert km to meters
            'min_sale_price': str(int(market_data['min_price'])),
            'max_sale_price': str(int(market_data['max_price'])),
            'max_km': str(params.get('max_kilometers', 240000)),  # Add max kilometers
            'order_by': 'price_low_to_high'
        }

        # Remove empty parameters
        search_params = {k: v for k, v in search_params.items() if v}

        # Add year parameters if provided
        if 'min_year' in params:
            search_params['min_year'] = str(params['min_year'])
        if 'max_year' in params:
            search_params['max_year'] = str(params['max_year'])

        # Add engine type if specified
        if 'engine' in params:
            search_params['engine'] = str(params['engine'])

        url = f"{base_url}?{'&'.join(f'{k}={quote(str(v))}' for k, v in search_params.items())}"
        logger.info(f"\nListing search URL: {url}")
        
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
            filtered_results.append(listing)

        result = {
            'success': True,
            'search_parameters': search_params,
            'listings': filtered_results,
            'total_results': len(search_results),
            'filtered_results': len(filtered_results),
            'url': url,
            'market_data': market_data  # Include the complete market_data
        }
        
        logger.info(f"Final response market data: {result['market_data']}")
        return result
        
    except Exception as e:
        logger.error(f"Error searching Wallapop: {str(e)}", exc_info=True)
        return {
            "error": str(e),
            "search_params": params
        } 