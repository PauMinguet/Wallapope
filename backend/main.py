from get_listings import get_listings_for_requests
from get_details import process_search_results
from handle_requests import process_requests
from supabase import create_client, Client

# Default search parameters
LATITUDE = 41.224151
LONGITUDE = 1.7255678
DISTANCE = 200000

def process_car_listings(latitude: float, longitude: float, distance: int, supabase: Client):
    """
    Main function to coordinate the car listing scraping process
    
    Args:
        latitude (float): Search center latitude
        longitude (float): Search center longitude 
        distance (int): Search radius in meters
        supabase (Client): Supabase client instance
    """
    print(f"Starting car listing scraper...")
    print(f"Search location: {latitude}, {longitude}")
    print(f"Search radius: {distance}m")
    
    process_requests(latitude, longitude, distance, supabase)

if __name__ == "__main__":
    # When run as a script, use default parameters
    process_car_listings(LATITUDE, LONGITUDE, DISTANCE) 