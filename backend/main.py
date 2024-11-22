from get_listings import get_listings_for_requests
from get_details import process_search_results
from handle_requests import process_requests

# Default search parameters
LATITUDE = 41.224151
LONGITUDE = 1.7255678
DISTANCE = 200000

def main(latitude: float, longitude: float, distance: int):
    """
    Main function to coordinate the car listing scraping process
    
    Args:
        latitude (float): Search center latitude
        longitude (float): Search center longitude 
        distance (int): Search radius in meters
    """
    print(f"Starting car listing scraper...")
    print(f"Search location: {latitude}, {longitude}")
    print(f"Search radius: {distance}m")
    
    process_requests(latitude, longitude, distance)

if __name__ == "__main__":
    main(LATITUDE, LONGITUDE, DISTANCE) 