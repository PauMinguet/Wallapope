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
                    # First, insert market data
                    market_data = result.get('market_data', {})
                    market_data_insert = {
                        'average_price': market_data.get('average_price', 0),
                        'median_price': market_data.get('median_price', 0),
                        'min_price': market_data.get('min_price', 0),
                        'max_price': market_data.get('max_price', 0),
                        'total_listings': market_data.get('total_listings', 0),
                        'valid_listings': market_data.get('valid_listings', 0),
                        'created_at': datetime.now(timezone.utc).isoformat()
                    }
                    
                    logger.info(f"Inserting market data for entry {entry['id']}")
                    market_data_response = supabase.table('market_data').insert(market_data_insert).execute()
                    if hasattr(market_data_response, 'error') and market_data_response.error:
                        logger.error(f"Error inserting market data for entry {entry['id']}: {market_data_response.error}")
                        continue
                    
                    market_data_id = market_data_response.data[0]['id']
                    
                    # Then, create modo_rapido_run
                    run_data = {
                        'modo_rapido_id': entry['id'],
                        'market_data_id': market_data_id,
                        'created_at': datetime.now(timezone.utc).isoformat()
                    }
                    
                    logger.info(f"Creating modo_rapido_run for entry {entry['id']}")
                    run_response = supabase.table('modo_rapido_runs').insert(run_data).execute()
                    if hasattr(run_response, 'error') and run_response.error:
                        logger.error(f"Error inserting run for entry {entry['id']}: {run_response.error}")
                        continue
                    
                    run_id = run_response.data[0]['id']
                    
                    # Transform and insert listings
                    listings_to_insert = []
                    for listing in result['listings']:
                        price = float(listing['price'])
                        market_price = market_data.get('median_price', 0)
                        price_difference = market_price - price
                        price_difference_percentage = (price_difference / market_price * 100) if market_price > 0 else 0
                        
                        try:
                            distance_km = round(float(listing.get('distance', 0)))
                        except Exception as e:
                            distance_km = 0
                        
                        listing_data = {
                            'modo_rapido_run_id': run_id,
                            'listing_id': listing['listing_id'],
                            'title': listing['title'],
                            'price': price,
                            'price_text': listing['price_text'],
                            'market_price': market_price,
                            'market_price_text': format_price_text(market_price),
                            'price_difference': round(price_difference, 2),
                            'price_difference_percentage': f"{abs(price_difference_percentage):.1f}%",
                            'location': listing['location'],
                            'year': listing['year'],
                            'kilometers': listing['kilometers'],
                            'fuel_type': listing['fuel_type'],
                            'transmission': listing['transmission'],
                            'url': listing['url'],
                            'horsepower': listing['horsepower'],
                            'distance': distance_km,
                            'listing_images': listing['listing_images'],
                            'created_at': datetime.now(timezone.utc).isoformat()
                        }
                        listings_to_insert.append(listing_data)
                    
                    if listings_to_insert:
                        logger.info(f"Inserting {len(listings_to_insert)} listings for run {run_id}")
                        listing_response = supabase.table('modo_rapido_listings').insert(listings_to_insert).execute()
                        if hasattr(listing_response, 'error') and listing_response.error:
                            logger.error(f"Error inserting listings for run {run_id}: {listing_response.error}")
                            continue
                    
                    successful_entries += 1
                    logger.info(f"Successfully processed entry {entry['id']} with {len(listings_to_insert)} listings")
                    
                    processed_entries.append({
                        'modo_rapido_id': entry['id'],
                        'success': True,
                        'listings_found': len(listings_to_insert),
                        'market_data': market_data
                    })
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