from supabase import create_client
import os
from dotenv import load_dotenv
import pandas as pd
import json
from datetime import datetime
from get_listings import get_listings_for_requests
from get_details import process_search_results

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not supabase_url or not supabase_key:
    raise ValueError("Missing Supabase credentials in environment variables")

supabase = create_client(supabase_url, supabase_key)

def fetch_unhandled_requests():
    """Fetch unhandled requests from Supabase"""
    try:
        response = supabase.table('car_requests').select("*").eq('handled', False).execute()
        
        if not response.data:
            print("No unhandled requests found")
            return None
            
        # Convert to DataFrame and save to CSV for get_listings.py to use
        df = pd.DataFrame(response.data)
        df.to_csv('car_requests.csv', index=False)
        print(f"Found {len(df)} unhandled requests")
        return df
        
    except Exception as e:
        print(f"Error fetching unhandled requests: {str(e)}")
        return None

def mark_requests_as_handled(request_ids):
    """Mark requests as handled in the database"""
    try:
        for request_id in request_ids:
            supabase.table('car_requests').update(
                {'handled': True}
            ).eq('id', request_id).execute()
        print(f"Marked {len(request_ids)} requests as handled")
    except Exception as e:
        print(f"Error marking requests as handled: {str(e)}")

def save_search_results(results):
    """Save search results to JSON file"""
    try:
        with open('search_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print("Search results saved to search_results.json")
    except Exception as e:
        print(f"Error saving search results: {str(e)}")

def save_detailed_results(results, request_id):
    """Save detailed results to JSON file with request ID"""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f'detailed_{request_id}_{timestamp}.json'
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"Detailed results saved to {filename}")
    except Exception as e:
        print(f"Error saving detailed results: {str(e)}")

def process_requests(latitude: float, longitude: float, distance: int):
    """Main function to process all unhandled requests"""
    print("Starting request processing...")
    
    # Fetch unhandled requests
    requests_df = fetch_unhandled_requests()
    if requests_df is None or requests_df.empty:
        return
    
    try:
        # Process each request separately
        for _, request in requests_df.iterrows():
            request_id = request['id']
            print(f"\nProcessing request {request_id}")
            
            # Step 1: Get listings for this request
            print("\nStep 1: Getting listings...")
            search_results = get_listings_for_requests(
                csv_path='car_requests.csv',
                latitude=latitude,
                longitude=longitude,
                distance=distance,
                single_request_id=request_id
            )
            
            if not search_results:
                print(f"No search results were returned for request {request_id}")
                continue
                
            # Save search results for this request
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            search_filename = f'search_results_{request_id}_{timestamp}.json'
            with open(search_filename, 'w', encoding='utf-8') as f:
                json.dump(search_results, f, indent=2, ensure_ascii=False)
            
            # Step 2: Get detailed information for this request's listings
            print("\nStep 2: Getting detailed information...")
            detailed_results = process_search_results(search_filename)
            
            if detailed_results:
                # Save detailed results for this request
                save_detailed_results(detailed_results, request_id)
                
                # Mark this request as handled
                mark_requests_as_handled([request_id])
                
                print(f"\nRequest {request_id} processing complete!")
                print("Summary:")
                for req_id, data in detailed_results.items():
                    print(f"Car: {data['request']['marca']} {data['request']['modelo']}")
                    print(f"Listings found: {len(data['listings'])}")
            else:
                print(f"Error getting detailed results for request {request_id}")
            
    except Exception as e:
        print(f"Error in process_requests: {str(e)}") 