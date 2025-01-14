from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import wallapop_api_cars
import logging
import os

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