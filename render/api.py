from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import wallapop_api_cars
import wallapop_endpoint_search
from process_modo_rapido import process_modo_rapido_entries
import logging
import os
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client
from process_alerts import process_alerts

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging to file
log_file = "wallapop_search.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class EngineType(str, Enum):
    GASOLINE = "gasoline"
    GASOIL = "gasoil"
    ELECTRIC = "electric"
    HYBRID = "hybrid"

class GearboxType(str, Enum):
    MANUAL = "manual"
    AUTOMATIC = "automatic"

class OrderBy(str, Enum):
    PRICE_LOW_TO_HIGH = "price_low_to_high"
    PRICE_HIGH_TO_LOW = "price_high_to_low"
    NEWEST = "newest"
    CLOSEST = "closest"

class CarSearchParams(BaseModel):
    # Basic car info
    brand: Optional[str] = None
    model: Optional[str] = None
    
    # Location
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance: Optional[int] = 200  # Default to 200km
    
    # Year and mileage
    min_year: Optional[int] = None
    max_year: Optional[int] = None
    max_kilometers: Optional[int] = 240000  # Default max km
    
    # Price - these will be used for market analysis only
    min_sale_price: Optional[int] = 3000  # Default min price
    max_sale_price: Optional[int] = None
    
    # Technical specifications
    engine: Optional[EngineType] = None
    min_horse_power: Optional[int] = None
    gearbox: Optional[GearboxType] = None
    
    # Sorting
    order_by: Optional[OrderBy] = OrderBy.PRICE_LOW_TO_HIGH  # Default sorting

    class Config:
        json_schema_extra = {
            "example": {
                "brand": "Audi",
                "model": "A4",
                "latitude": 41.3851,
                "longitude": 2.1734,
                "distance": 200,
                "min_year": 2015,
                "max_year": 2020,
                "max_kilometers": 200000,
                "min_sale_price": 3000,
                "engine": "gasoline",
                "min_horse_power": 150,
                "gearbox": "manual",
                "order_by": "price_low_to_high"
            }
        }

def run_car_search():
    """Background task to run car search"""
    try:
        wallapop_api_cars.main()
    except Exception as e:
        logger.error(f"Error in car search: {str(e)}", exc_info=True)

@app.get("/api/search-cars")
async def search_cars(background_tasks: BackgroundTasks):
    """Endpoint to trigger car search"""
    background_tasks.add_task(run_car_search)
    return {"message": "Car search started"}

@app.post("/api/search-single-car")
async def search_single_car(params: CarSearchParams):
    """Endpoint to search for a single car with given parameters"""
    try:
        # Convert params to dict and prepare search parameters
        params_dict = params.dict(exclude_none=True)  # Exclude None values
        
        # Convert Enum values to their string values
        if 'engine' in params_dict:
            params_dict['engine'] = params_dict['engine'].value
        if 'gearbox' in params_dict:
            params_dict['gearbox'] = params_dict['gearbox'].value
        if 'order_by' in params_dict:
            params_dict['order_by'] = params_dict['order_by'].value
        
        # Perform search using the new endpoint search function
        result = wallapop_endpoint_search.search_wallapop_endpoint(params_dict)
        if not result:
            return {"error": "Search failed", "search_params": params_dict}
        
        if 'error' in result:
            return result
            
        if not result.get('listings', []):
            return {
                "success": False,
                "error": "No listings found",
                "search_parameters": result.get('search_parameters', params_dict),
                "listings": [],
                "total_results": 0,
                "filtered_results": 0,
                "search_url": result.get('search_url', ''),
                "market_data": result.get('market_data', {}),
                "suggested_listings": result.get('suggested_listings', [])
            }
        
        market_data = result.get('market_data', {})
        logger.info(f"API Response market data: {market_data}")
        
        response = {
            "success": True,
            "listings": result['listings'],
            "total_results": result['total_results'],
            "filtered_results": result['filtered_results'],
            "search_parameters": result['search_parameters'],
            "search_url": result['search_url'],
            "market_data": {
                "market_price": market_data.get('market_price', 0),
                "median_price": market_data.get('median_price', 0),
                "average_price": market_data.get('average_price', 0),
                "min_price": market_data.get('min_price', 0),
                "max_price": market_data.get('max_price', 0),
                "total_listings": market_data.get('total_listings', 0),
                "valid_listings": market_data.get('valid_listings', 0),
                "sample_size": market_data.get('sample_size', 0),
                "search_url": market_data.get('search_url', '')
            },
            "market_search_url": result.get('market_search_url', '')
        }
        
        logger.info(f"Final API Response market data: {response['market_data']}")
        return response
            
    except Exception as e:
        logger.error(f"Error in single car search: {str(e)}", exc_info=True)
        return {"error": str(e)}

@app.get("/api/logs")
async def get_logs():
    """Endpoint to retrieve logs"""
    try:
        with open(log_file, 'r') as f:
            logs = f.read()
        return {"logs": logs}
    except FileNotFoundError:
        return {"logs": "No logs found"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/api/test-search")
async def test_search():
    """Test endpoint to search for 5 predefined cars"""
    test_cars = [
        {
            "marca": "BMW",
            "modelo": "Serie 3",
            "min_year": 2015,
            "max_year": 2017,
            "engine": "gasoline",
            "distance": 200,
            "min_horse_power": 150,
            "max_horse_power": 250  # Common range for BMW 3 series
        },
        {
            "marca": "Audi",
            "modelo": "A4",
            "min_year": 2016,
            "max_year": 2018,
            "engine": "gasoil",
            "distance": 200,
            "min_horse_power": 150,
            "max_horse_power": 240  # Common range for Audi A4
        },
        {
            "marca": "Mercedes-Benz",
            "modelo": "Clase C",
            "min_year": 2015,
            "max_year": 2017,
            "engine": "gasoline",
            "distance": 200,
            "min_horse_power": 156,
            "max_horse_power": 245  # Common range for C-Class
        },
        {
            "marca": "Volkswagen",
            "modelo": "Golf",
            "min_year": 2017,
            "max_year": 2019,
            "engine": "gasoline",
            "distance": 200,
            "min_horse_power": 110,
            "max_horse_power": 200  # Common range for Golf
        },
        {
            "marca": "Toyota",
            "modelo": "Corolla",
            "min_year": 2018,
            "max_year": 2020,
            "engine": "hybrid",
            "distance": 200,
            "min_horse_power": 122,
            "max_horse_power": 180  # Common range for Corolla Hybrid
        }
    ]
    
    results = []
    for car in test_cars:
        try:
            logger.info(f"Testing search for {car['marca']} {car['modelo']}")
            result = wallapop_endpoint_search.search_wallapop_endpoint(car)
            
            if result:
                results.append({
                    "car": car,
                    "success": True,
                    "market_price": result['search_parameters']['market_price'],
                    "num_listings": len(result['listings']),
                    "min_price": result['search_parameters']['min_price'],
                    "max_price": result['search_parameters']['max_price']
                })
            else:
                results.append({
                    "car": car,
                    "success": False,
                    "error": "No results found"
                })
                
        except Exception as e:
            logger.error(f"Error searching for {car['marca']} {car['modelo']}: {str(e)}")
            results.append({
                "car": car,
                "success": False,
                "error": str(e)
            })
    
    return {
        "total_cars_tested": len(test_cars),
        "successful_searches": len([r for r in results if r['success']]),
        "failed_searches": len([r for r in results if not r['success']]),
        "results": results
    }

def init_supabase() -> Client:
    """Initialize Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise Exception("Missing Supabase credentials in .env file")
        
    return create_client(supabase_url, supabase_key)

def format_price_text(price: float) -> str:
    """Format price as text with euro symbol"""
    return f"{price:,.0f} €".replace(",", ".")

def transform_listing(listing, market_price: float):
    """Transform a Wallapop API listing to our desired format"""
    content = listing['content']
    price = float(content.get('price', 0))
    price_difference = market_price - price
    price_difference_percentage = (price_difference / market_price * 100) if market_price > 0 else 0
    
    # Transform images to simple URLs with W800 size
    # The image URLs come directly from the API, just need to add the size parameter
    listing_images = []
    for img in content.get('images', []):
        if isinstance(img, str):  # Make sure we have a string URL
            listing_images.append({
                "image_url": img + "?pictureSize=W800" if "?" not in img else img
            })
    
    return {
        "id": content['id'],
        "url": f"https://es.wallapop.com/item/{content['web_slug']}",
        "year": int(content.get('year', 0)),
        "price": price,
        "title": content.get('title', ''),
        "distance": float(content.get('distance', 0)),
        "location": f"{content['location']['city']}, {content['location']['postal_code']}",
        "fuel_type": content.get('engine', ''),
        "horsepower": float(content.get('horsepower', 0)),
        "kilometers": int(content.get('km', 0)),
        "price_text": format_price_text(price),
        "market_price": market_price,
        "transmission": content.get('gearbox', ''),
        "listing_images": listing_images,
        "price_difference": round(price_difference, 2),
        "market_price_text": format_price_text(market_price),
        "price_difference_percentage": f"{abs(price_difference_percentage):.1f}%"
    }

def calculate_market_data(listings, result):
    """Calculate market data with proper formatting"""
    if not listings:
        return None
        
    prices = [float(listing['content']['price']) for listing in listings]
    prices.sort()
    
    total_listings = len(listings)
    valid_listings = len(prices)
    
    if valid_listings == 0:
        return None
        
    # Calculate statistics
    min_price = min(prices)
    max_price = max(prices)
    average_price = sum(prices) / valid_listings
    median_price = prices[valid_listings // 2] if valid_listings % 2 != 0 else (prices[valid_listings // 2 - 1] + prices[valid_listings // 2]) / 2
    
    return {
        "max_price": max_price,
        "min_price": min_price,
        "sample_size": valid_listings,
        "median_price": median_price,
        "average_price": average_price,
        "max_price_text": format_price_text(max_price),
        "min_price_text": format_price_text(min_price),
        "total_listings": total_listings,
        "valid_listings": valid_listings,
        "median_price_text": format_price_text(median_price),
        "average_price_text": format_price_text(average_price)
    }

@app.get("/api/process-alerts")
async def process_alerts_endpoint():
    """Process all alerts and run searches for those that haven't been run in 23 hours"""
    try:
        supabase = init_supabase()
        return process_alerts(supabase)
            
    except Exception as e:
        logger.error(f"Error in process_alerts: {str(e)}")
        return {"error": str(e)}

def cleanup_old_modo_rapido_data(supabase: Client):
    """Clean up old modo rapido data, keeping only the last 24 hours"""
    try:
        # Calculate the cutoff time (24 hours ago)
        cutoff_time = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        
        # First delete old listings as they reference runs
        logger.info(f"Deleting modo_rapido_listings older than {cutoff_time}")
        supabase.table('modo_rapido_listings')\
            .delete()\
            .lt('created_at', cutoff_time)\
            .execute()
            
        # Then delete old runs as they reference market data
        logger.info(f"Deleting modo_rapido_runs older than {cutoff_time}")
        supabase.table('modo_rapido_runs')\
            .delete()\
            .lt('created_at', cutoff_time)\
            .execute()
            
        # Finally delete old market data
        logger.info(f"Deleting market_data older than {cutoff_time}")
        supabase.table('market_data')\
            .delete()\
            .lt('created_at', cutoff_time)\
            .execute()
            
        logger.info("Successfully cleaned up old modo rapido data")
        
    except Exception as e:
        logger.error(f"Error cleaning up old modo rapido data: {str(e)}", exc_info=True)

def run_modo_rapido():
    """Background task to run modo rapido processing"""
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            logger.error("Missing Supabase credentials in environment variables")
            return
            
        supabase = create_client(supabase_url, supabase_key)
        
        # First process new entries
        logger.info("Starting modo rapido processing")
        result = process_modo_rapido_entries(supabase)
        logger.info(f"Modo rapido processing completed: {result}")
        
        # Then clean up old data
        logger.info("Starting cleanup of old modo rapido data")
        cleanup_old_modo_rapido_data(supabase)
        
    except Exception as e:
        logger.error(f"Error in modo rapido background task: {str(e)}", exc_info=True)

@app.get("/api/process-modo-rapido")
async def process_modo_rapido_endpoint(background_tasks: BackgroundTasks):
    """Process all modo_rapido entries in the background"""
    try:
        background_tasks.add_task(run_modo_rapido)
        return {"message": "Modo rapido processing started in background"}
    except Exception as e:
        logger.error(f"Error starting modo rapido process: {str(e)}")
        return {"error": str(e)} 