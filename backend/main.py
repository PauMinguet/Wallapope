from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import search_wallapop
import search_wallapop_motos
import search_wallapop_furgos
import search_wallapop_scooters
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('search_logs.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store the last run time
last_run_time = None
search_in_progress = False

def run_all_searches():
    """Run all search scripts"""
    global search_in_progress, last_run_time
    
    try:
        search_in_progress = True
        logger.info("Starting all searches...")
        
        # Run each search script
        logger.info("Starting car search...")
        car_results = search_wallapop.process_all_cars()
        logger.info(f"Car search complete. Found {len(car_results)} results")
        
        logger.info("Starting motorcycle search...")
        moto_results = search_wallapop_motos.process_all_motos()
        logger.info(f"Motorcycle search complete. Found {len(moto_results)} results")
        
        logger.info("Starting van search...")
        furgo_results = search_wallapop_furgos.process_all_furgos()
        logger.info(f"Van search complete. Found {len(furgo_results)} results")
        
        logger.info("Starting scooter search...")
        scooter_result = search_wallapop_scooters.main()
        logger.info("Scooter search complete")
        
        last_run_time = datetime.now()
        logger.info("All searches completed successfully")
        
    except Exception as e:
        logger.error(f"Error during searches: {str(e)}")
        raise
        
    finally:
        search_in_progress = False

@app.get("/")
async def root():
    return {"message": "Wallapop Search API"}

@app.post("/run-searches")
async def run_searches(background_tasks: BackgroundTasks):
    """Endpoint to trigger all searches"""
    global search_in_progress
    
    if search_in_progress:
        return {
            "status": "error",
            "message": "A search is already in progress"
        }
    
    background_tasks.add_task(run_all_searches)
    
    return {
        "status": "success",
        "message": "Searches started in background"
    }

@app.get("/status")
async def get_status():
    """Get the status of the search process"""
    return {
        "search_in_progress": search_in_progress,
        "last_run": last_run_time.isoformat() if last_run_time else None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 