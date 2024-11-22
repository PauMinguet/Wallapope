import os
import traceback
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from supabase import create_client, Client
from pydantic import BaseModel
from main import process_car_listings
from fastapi.middleware.cors import CORSMiddleware

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase configuration
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

# Initialize Supabase client
supabase: Client = create_client(url, key)

class SearchParameters(BaseModel):
    latitude: float = 41.224151
    longitude: float = 1.7255678
    distance: int = 200000

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        import selenium
        import pandas
        import ray
        
        # Test Supabase connection
        response = supabase.table('car_requests').select("count").execute()
        
        return {
            "status": "healthy",
            "dependencies": {
                "selenium": selenium.__version__,
                "pandas": pandas.__version__,
                "ray": ray.__version__
            },
            "supabase": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@app.post("/scrape-listings")
async def scrape_listings(params: SearchParameters):
    """Trigger car listing scraping process"""
    try:
        logger.info(f"Starting scraping process with parameters: {params.dict()}")
        
        process_car_listings(
            latitude=params.latitude,
            longitude=params.longitude,
            distance=params.distance,
            supabase=supabase
        )
        
        return {
            "status": "success",
            "message": "Scraping process completed",
            "parameters": params.dict()
        }
    except Exception as e:
        logger.error(f"Error during scraping process: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error during scraping process: {str(e)}")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    logger.error(traceback.format_exc())
    return {"detail": "An unexpected error occurred. Please try again later."} 