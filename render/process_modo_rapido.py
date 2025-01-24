from datetime import datetime, timezone
import logging
from typing import Dict, Any
import wallapop_endpoint_search

__all__ = ['process_modo_rapido_entries']

logger = logging.getLogger(__name__)

def format_price_text(price: float) -> str:
    """Format price as text with euro symbol"""
    return f"{price:,.0f} €".replace(",", ".")

def process_modo_rapido_entries(supabase):
    """Process all modo_rapido entries and run searches"""
    try:
        # Get all modo_rapido entries
        entries_response = supabase.table('modo_rapido').select('*').execute()
        entries = entries_response.data
        
        if not entries:
            return {"message": "No modo_rapido entries found", "entries_processed": 0}
        
        logger.info(f"Found {len(entries)} modo_rapido entries to process")
        processed_entries = []
        successful_entries = 0
        
        for entry in entries:
            try:
                logger.info(f"Processing entry {entry['id']}: {entry['marca']} {entry['modelo']}")
                
                # Validate required fields
                required_fields = ['marca', 'modelo', 'minimo', 'maximo', 'cv', 'combustible']
                missing_fields = [field for field in required_fields if not entry.get(field)]
                if missing_fields:
                    logger.error(f"Entry {entry['id']} missing required fields: {missing_fields}")
                    continue

                # Map combustible values to Wallapop's expected values
                combustible_mapping = {
                    'gasolina': 'gasoline',
                    'diesel': 'gasoil',
                    'diésel': 'gasoil',
                    'híbrido': 'hybrid',
                    'hibrido': 'hybrid',
                    'eléctrico': 'electric',
                    'electrico': 'electric'
                }
                
                engine = entry['combustible'].lower()
                engine = combustible_mapping.get(engine, engine)
                
                # Prepare search parameters using Spanish column names
                search_params = {
                    'brand': entry['marca'],
                    'model': entry['modelo'],
                    'min_year': entry['minimo'],
                    'max_year': entry['maximo'],
                    'engine': engine,
                    'min_horse_power': entry['cv'] - 5,
                    'max_horse_power': entry['cv'] + 5,
                    'latitude': 41.3851,  # Default to Barcelona coordinates
                    'longitude': 2.1734,
                    'distance': 200,  # Default to 200km radius
                    'max_kilometers': 200000  # Max 200,000 km
                }
                
                logger.info(f"Search params for entry {entry['id']}: {search_params}")
                
                # Remove None values
                search_params = {k: v for k, v in search_params.items() if v is not None}
                
                # Run the search
                result = wallapop_endpoint_search.search_wallapop_endpoint(search_params)
                
                if result and result.get('listings'):
                    # Calculate market data
                    market_data = result.get('market_data', {})
                    
                    # Transform listings to match frontend format
                    transformed_listings = []
                    for listing in result['listings']:
                        content = listing['content']
                        price = float(content['price'])
                        market_price = market_data.get('median_price', 0)
                        price_difference = market_price - price
                        price_difference_percentage = (price_difference / market_price * 100) if market_price > 0 else 0
                                                    
                        try:
                            distance_km = round(float(content.get('distance', 0)))
                        except Exception as e:
                            distance_km = 0
                        
                        transformed_listing = {
                            'id': content['id'],
                            'title': content['title'],
                            'price': price,
                            'price_text': format_price_text(price),
                            'market_price': market_price,
                            'market_price_text': format_price_text(market_price),
                            'price_difference': round(price_difference, 2),
                            'price_difference_percentage': f"{abs(price_difference_percentage):.1f}%",
                            'location': f"{content['location']['city']}, {content['location']['postal_code']}",
                            'year': int(content['year']),
                            'kilometers': int(content['km']),
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
                        transformed_listings.append(transformed_listing)
                    
                    # Transform market data to match frontend format
                    transformed_market_data = {
                        'average_price': market_data.get('average_price', 0),
                        'average_price_text': format_price_text(market_data.get('average_price', 0)),
                        'median_price': market_data.get('median_price', 0),
                        'median_price_text': format_price_text(market_data.get('median_price', 0)),
                        'min_price': market_data.get('min_price', 0),
                        'min_price_text': format_price_text(market_data.get('min_price', 0)),
                        'max_price': market_data.get('max_price', 0),
                        'max_price_text': format_price_text(market_data.get('max_price', 0)),
                        'total_listings': market_data.get('total_listings', 0),
                        'valid_listings': market_data.get('valid_listings', 0)
                    }
                    
                    # Insert run data
                    run_data = {
                        'modo_rapido_id': entry['id'],
                        'listings': transformed_listings,
                        'market_data': transformed_market_data,
                        'created_at': datetime.now(timezone.utc).isoformat()
                    }
                    
                    try:
                        # Insert data into modo_rapido_runs table
                        response = supabase.table('modo_rapido_runs').insert(run_data).execute()
                        if hasattr(response, 'error') and response.error:
                            logger.error(f"Error inserting run for entry {entry['id']}: {response.error}")
                            continue
                        
                        successful_entries += 1
                        logger.info(f"Successfully processed entry {entry['id']} with {len(transformed_listings)} listings")
                        
                        processed_entries.append({
                            'modo_rapido_id': entry['id'],
                            'success': True,
                            'listings_found': len(transformed_listings),
                            'market_data': transformed_market_data
                        })
                    except Exception as e:
                        logger.error(f"Error inserting run for entry {entry['id']}: {str(e)}")
                        continue
                else:
                    logger.info(f"No listings found for entry {entry['id']}")
                    processed_entries.append({
                        'modo_rapido_id': entry['id'],
                        'success': False,
                        'error': 'Search returned no results'
                    })
                    
            except Exception as e:
                logger.error(f"Error processing modo_rapido entry {entry['id']}: {str(e)}")
                processed_entries.append({
                    'modo_rapido_id': entry['id'],
                    'success': False,
                    'error': str(e)
                })
        
        return {
            "message": "Modo rapido processing completed",
            "entries_processed": len(processed_entries),
            "successful_entries": successful_entries,
            "results": processed_entries
        }
            
    except Exception as e:
        logger.error(f"Error in process_modo_rapido: {str(e)}")
        return {"error": str(e)} 