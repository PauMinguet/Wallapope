import os
from datetime import datetime
import csv
from dotenv import load_dotenv
from supabase import create_client, Client
import logging
import re
import asyncio

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def init_supabase() -> Client:
    """Initialize Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise Exception("Missing Supabase credentials in .env file")
    
    return create_client(supabase_url, supabase_key)

def fetch_listings(supabase: Client, vehicle_type: str):
    """Fetch listings from Supabase for a specific vehicle type"""
    try:
        # Get listings with their searches data using a join
        response = supabase.rpc(
            'get_listings_with_models',
            {'vehicle_type': vehicle_type}
        ).execute()
        
        data = response.data if response else []
        
        # Debug: Print first listing's data structure
        if data:
            logger.info(f"\nFirst listing data structure:")
            logger.info(f"Data: {data[0]}")
            
        # Transform data to match frontend structure
        transformed_data = []
        for listing in data:
            transformed_listing = {
                'title': listing.get('title'),
                'model': listing.get('model')  # Should come directly from the join
            }
            transformed_data.append(transformed_listing)
            
        return transformed_data
    except Exception as e:
        logger.error(f"Error fetching {vehicle_type} listings: {str(e)}")
        logger.error(f"Full error: {str(e)}")
        return []

def clean_title(title, searches=None):
    """Clean the title to match frontend display"""
    if not title:
        return ''
        
    # Get first line of title
    title = title.split('\n')[0]
    
    # Remove "Reserved" if present
    if title.lower().startswith('reservado'):
        title = re.sub(r'^reservado\s+', '', title, flags=re.IGNORECASE)
    
    # Remove price pattern
    title = re.sub(r'^\d+[\d.,]*\s*€\s*', '', title)
    
    # Remove "Slide X of Y" pattern
    title = re.sub(r'^Slide \d+ of \d+\s*', '', title)
    
    # Remove everything after hyphen (if exists)
    title = title.split(' - ')[0]
    
    # Remove kilometer pattern
    title = re.sub(r'\d{5,}|\s+km', '', title)
    
    # Remove fuel type
    title = re.sub(r'Gasolina|Diesel|Diésel', '', title)
    
    # Remove year at the end
    title = re.sub(r'\s+\d{4}\s*$', '', title)
    
    return title.strip()

def get_model_display(model):
    """Get model display text matching frontend"""
    if not model:
        return 'N/A'
    return model

def export_to_csv(listings, vehicle_type):
    """Export listings to a CSV file"""
    if not listings:
        logger.warning(f"No listings to export for {vehicle_type}")
        return

    # Create data directory if it doesn't exist
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(data_dir, exist_ok=True)

    # Use fixed filename
    filename = os.path.join(data_dir, f'{vehicle_type}_listings.csv')

    try:
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=['Title', 'Model'])
            writer.writeheader()

            for listing in listings:
                row = {
                    'Title': clean_title(listing.get('title')),
                    'Model': get_model_display(listing.get('model'))
                }
                writer.writerow(row)

        logger.info(f"Successfully exported {len(listings)} {vehicle_type} listings to {filename}")
        return filename

    except Exception as e:
        logger.error(f"Error exporting {vehicle_type} listings to CSV: {str(e)}")
        return None

def main():
    try:
        supabase = init_supabase()
        vehicle_types = ['coches', 'motos', 'furgos', 'scooters']

        for vehicle_type in vehicle_types:
            logger.info(f"\nProcessing {vehicle_type}...")
            
            # Fetch listings
            listings = fetch_listings(supabase, vehicle_type)
            
            if listings:
                # Sort listings by price difference, handling None values
                try:
                    listings.sort(
                        key=lambda x: float(x.get('price_difference', 0) or 0),
                        reverse=vehicle_type != 'furgos'
                    )
                except Exception as sort_error:
                    logger.error(f"Error sorting {vehicle_type} listings: {str(sort_error)}")
                
                # Export to CSV
                export_to_csv(listings, vehicle_type)
            else:
                logger.warning(f"No listings found for {vehicle_type}")

    except Exception as e:
        logger.error(f"Error in main process: {str(e)}")

if __name__ == "__main__":
    main() 