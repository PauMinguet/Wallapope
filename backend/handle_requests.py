import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client
import pandas as pd
from datetime import datetime
from get_listings import get_listings_for_requests
from get_details import process_search_results
import json
import traceback
from groq import Groq

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Groq client
groq_api_key = os.getenv('GROQ_API_KEY')
groq_client = Groq(api_key=groq_api_key)

def process_listing_info(info_list):
    """Use Groq to organize listing information into structured data"""
    prompt = f"""
    Convert this car listing information into a standardized JSON structure.
    
    Listing information:
    {info_list}
    
    Use EXACTLY this structure (fill with null if info not available):
    {{
        "location": "city name",
        "title": "full listing title",
        "seller": {{
            "name": "seller name",
            "rating": null,
            "sales": "X ventas"
        }},
        "price": {{
            "amount": 1234,
            "currency": "EUR",
            "financing_available": false
        }},
        "specs": {{
            "brand": "car brand",
            "model": "model name",
            "year": 2024,
            "kms": 1234,
            "fuel_type": "fuel type",
            "transmission": "transmission type",
            "power": 123,
            "doors": 5,
            "seats": 5
        }},
        "description": "full description"
    }}

    Rules:
    1. Use EXACTLY these field names
    2. Numbers must be integers without units or currency symbols
    3. Text fields must be clean strings
    4. Use null for missing values
    5. No additional fields allowed
    """

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a data standardizer. Return ONLY the exact JSON structure requested, no additional text."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="mixtral-8x7b-32768",
            temperature=0.1,
            max_tokens=1000
        )

        response_text = chat_completion.choices[0].message.content.strip()
        
        # Clean up the response
        if '```' in response_text:
            response_text = response_text.split('```')[1].replace('json', '').strip()
        
        # Remove any trailing commas that might cause JSON parsing errors
        response_text = response_text.replace(',}', '}').replace(',\n}', '}')
        
        # Parse JSON
        processed_info = json.loads(response_text)
        
        # Validate structure
        required_structure = {
            'location': str,
            'title': str,
            'seller': {
                'name': str,
                'rating': (str, type(None)),
                'sales': (str, type(None))
            },
            'price': {
                'amount': int,
                'currency': str,
                'financing_available': bool
            },
            'specs': {
                'brand': str,
                'model': str,
                'year': int,
                'kms': int,
                'fuel_type': str,
                'transmission': str,
                'power': (int, type(None)),
                'doors': (int, type(None)),
                'seats': (int, type(None))
            },
            'description': str
        }
        
        # Validate types
        def validate_structure(data, structure):
            for key, expected_type in structure.items():
                if key not in data:
                    print(f"Missing key: {key}")
                    return False
                if isinstance(expected_type, dict):
                    if not validate_structure(data[key], expected_type):
                        return False
                elif isinstance(expected_type, tuple):
                    if not isinstance(data[key], expected_type):
                        print(f"Invalid type for {key}: {type(data[key])}, expected {expected_type}")
                        return False
                elif not isinstance(data[key], expected_type):
                    print(f"Invalid type for {key}: {type(data[key])}, expected {expected_type}")
                    return False
            return True
        
        if validate_structure(processed_info, required_structure):
            return processed_info
        return None
        
    except Exception as e:
        print(f"Error processing listing info with Groq: {str(e)}")
        if 'chat_completion' in locals():
            print(f"Raw response: {chat_completion.choices[0].message.content}")
        return None

def fetch_unhandled_requests(supabase: Client):
    """Fetch unhandled requests from Supabase"""
    try:
        response = supabase.table('car_requests').select("*").eq('handled', False).execute()
        
        if not response.data:
            logger.info("No unhandled requests found")
            return None
            
        df = pd.DataFrame(response.data)
        logger.info("\nDatabase Requests Details:")
        logger.info("-------------------------")
        for _, row in df.iterrows():
            logger.info(f"\nRequest ID: {row['id']}")
            logger.info(f"Car: {row['marca']} {row['modelo']}")
            logger.info(f"Year: {row['año']}")
            logger.info(f"Color: {row['color']}")
            logger.info(f"Kilometers: {row['kilometraje']}")
            logger.info(f"Price: {row['precio']}€")
            logger.info(f"Contact: {row['email']}")
            logger.info("-------------------------")
            
        df.to_csv('car_requests.csv', index=False)
        logger.info(f"\nFound {len(df)} unhandled requests")
        return df
        
    except Exception as e:
        logger.error(f"Error fetching unhandled requests: {str(e)}")
        return None

def store_listings_in_db(detailed_results, request_id, supabase: Client):
    """Store listings in the database"""
    try:
        # Navigate through the nested structure to get to the listings array
        listings = detailed_results[request_id]['listings'][request_id]['listings']
        
        print(f"\nProcessing {len(listings)} listings")
        
        # Prepare listings for database insertion
        db_listings = []
        for listing in listings:
            try:
                print(f"\nProcessing listing: {listing['url']}")
                
                # Process listing info with Groq
                processed_info = process_listing_info(listing['info'])
                
                if processed_info:
                    # Format the data for database insertion
                    db_listing = {
                        'request_id': request_id,
                        'url': listing['url'],
                        'location': processed_info['location'],
                        'title': processed_info['title'],
                        'seller_name': processed_info['seller']['name'],
                        'seller_rating': processed_info['seller'].get('rating'),
                        'seller_sales': processed_info['seller'].get('sales'),
                        'price_amount': processed_info['price']['amount'],
                        'price_currency': processed_info['price']['currency'],
                        'price_financing': processed_info['price']['financing_available'],
                        'brand': processed_info['specs']['brand'],
                        'model': processed_info['specs']['model'],
                        'year': processed_info['specs']['year'],
                        'kms': processed_info['specs']['kms'],
                        'fuel_type': processed_info['specs']['fuel_type'],
                        'transmission': processed_info['specs']['transmission'],
                        'power': processed_info['specs']['power'],
                        'doors': processed_info['specs'].get('doors'),
                        'seats': processed_info['specs'].get('seats'),
                        'description': processed_info['description'],
                        'images': '{' + ','.join(f'"{img}"' for img in listing['images']) + '}'
                    }
                    
                    db_listings.append(db_listing)
                    print("Successfully processed listing")
                else:
                    print("Failed to process listing info")
                
            except Exception as e:
                print(f"Error processing individual listing: {str(e)}")
                continue
        
        # Insert listings into database
        if db_listings:
            print(f"\nAttempting to insert {len(db_listings)} listings")
            print("First listing example:", db_listings[0])
            response = supabase.table('car_listings').insert(db_listings).execute()
            logger.info(f"Stored {len(db_listings)} listings with full details in database")
            return True
        else:
            print("No valid listings to insert")
            return False
            
    except Exception as e:
        logger.error(f"Error storing listings in database: {str(e)}")
        print(f"Full error details: {traceback.format_exc()}")
        return False

def mark_requests_as_handled(request_ids, supabase: Client):
    """Mark requests as handled in the database"""
    try:
        for request_id in request_ids:
            supabase.table('car_requests').update(
                {'handled': True}
            ).eq('id', request_id).execute()
        logger.info(f"Marked {len(request_ids)} requests as handled")
    except Exception as e:
        logger.error(f"Error marking requests as handled: {str(e)}")

def process_requests(latitude: float, longitude: float, distance: int, supabase: Client):
    """Main function to process all unhandled requests"""
    print("Starting request processing...")
    
    # Fetch unhandled requests
    requests_df = fetch_unhandled_requests(supabase)
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
                
            print(f"Found {len(search_results)} listings")
            
            # Step 2: Get detailed information
            print("\nStep 2: Getting detailed information...")
            
            # Save search results temporarily to work with existing process_search_results
            temp_filename = f'search_results_{request_id}.json'
            with open(temp_filename, 'w') as f:
                json.dump(search_results, f)
            
            try:
                detailed_listings = process_search_results(temp_filename)
                
                if detailed_listings:
                    detailed_results = {
                        request_id: {
                            "request": {
                                "marca": request['marca'],
                                "modelo": request['modelo'],
                                "año": request['año'],
                                "color": request['color'],
                                "kilometraje": request['kilometraje'],
                                "precio": request['precio'],
                                "email": request['email']
                            },
                            "search_parameters": {
                                "latitude": latitude,
                                "longitude": longitude,
                                "distance": distance
                            },
                            "listings": detailed_listings
                        }
                    }
                    
                    # Step 3: Store in database
                    print("\nStep 3: Storing in database...")
                    if store_listings_in_db(detailed_results, request_id, supabase):
                        # Mark this request as handled only if storage was successful
                        mark_requests_as_handled([request_id], supabase)
                        
                        print(f"\nRequest {request_id} processing complete!")
                        print("Summary:")
                        print(f"Car: {request['marca']} {request['modelo']}")
                        print(f"Listings stored: {len(detailed_listings)}")
                    else:
                        print(f"Failed to store listings for request {request_id}")
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_filename):
                    os.remove(temp_filename)
            
    except Exception as e:
        print(f"Error in process_requests: {str(e)}") 