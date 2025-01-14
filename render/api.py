from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import wallapop_api_cars
import logging

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def run_car_search():
    """Background task to run car search"""
    try:
        wallapop_api_cars.main()
    except Exception as e:
        logger.error(f"Error in car search: {str(e)}", exc_info=True)

@app.post("/api/search-cars")
async def search_cars(background_tasks: BackgroundTasks):
    """Endpoint to trigger car search"""
    background_tasks.add_task(run_car_search)
    return {"message": "Car search started"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"} 