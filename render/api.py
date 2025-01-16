from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import wallapop_api_cars
import wallapop_endpoint_search
import logging
import os
from pydantic import BaseModel
from typing import Optional
from enum import Enum

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
    keywords: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    
    # Location
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance: Optional[int] = None
    
    # Category
    category_ids: Optional[str] = None
    
    # Year and mileage
    min_year: Optional[int] = None
    max_year: Optional[int] = None
    max_kilometers: Optional[int] = None
    
    # Price
    min_sale_price: Optional[int] = None
    max_sale_price: Optional[int] = None
    
    # Technical specifications
    engine: Optional[EngineType] = None
    min_horse_power: Optional[int] = None
    gearbox: Optional[GearboxType] = None
    
    # Sorting
    order_by: Optional[OrderBy] = None

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
        
        if not result['listings']:
            return {"error": "No listings found", "search_params": params_dict}
        
        market_data = result.get('market_data', {})
        logger.info(f"API Response market data: {market_data}")
        
        response = {
            "success": True,
            "listings": result['listings'],
            "total_results": result['total_results'],
            "filtered_results": result['filtered_results'],
            "search_parameters": result['search_parameters'],
            "search_url": result['url'],
            "market_data": {
                "market_price": market_data.get('market_price', 0),
                "median_price": market_data.get('median_price', 0),
                "average_price": market_data.get('average_price', 0),
                "min_price": market_data.get('min_price', 0),
                "max_price": market_data.get('max_price', 0),
                "total_listings": market_data.get('total_listings', 0),
                "valid_listings": market_data.get('valid_listings', 0),
                "sample_size": market_data.get('sample_size', 0)
            }
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