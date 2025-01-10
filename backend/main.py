from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import search_wallapop
import search_wallapop_motos
import search_wallapop_furgos
import search_wallapop_scooters
import logging
import os
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
        logger.info("="*50)
        logger.info("STARTING NEW SEARCH SESSION")
        logger.info("="*50)
        
        # Run each search script
        logger.info("\n[1/4] Starting car search...")
        car_results = search_wallapop.process_all_cars()
        if car_results:
            last_car = car_results[-1]['search_parameters']
            logger.info(f"✓ Car search complete. Found {len(car_results)} results")
            logger.info(f"  Last searched: {last_car['marca']} {last_car['model']}")
        else:
            logger.info("✓ Car search complete. No results found")
        
        logger.info("\n[2/4] Starting motorcycle search...")
        moto_results = search_wallapop_motos.process_all_motos()
        if moto_results:
            last_moto = moto_results[-1]['search_parameters']
            logger.info(f"✓ Motorcycle search complete. Found {len(moto_results)} results")
            logger.info(f"  Last searched: {last_moto['marca']} {last_moto['model']}")
        else:
            logger.info("✓ Motorcycle search complete. No results found")
        
        logger.info("\n[3/4] Starting van search...")
        furgo_results = search_wallapop_furgos.process_all_furgos()
        if furgo_results and furgo_results[0]:
            last_furgo = furgo_results[0][-1]
            logger.info(f"✓ Van search complete. Found {len(furgo_results[0])} results")
            logger.info(f"  Last searched: {last_furgo['marca']} {last_furgo['model']}")
        else:
            logger.info("✓ Van search complete. No results found")
        
        logger.info("\n[4/4] Starting scooter search...")
        scooter_results = search_wallapop_scooters.process_all_scooters()
        if scooter_results:
            last_scooter = scooter_results[-1]['search_parameters']
            logger.info(f"✓ Scooter search complete. Found {len(scooter_results)} results")
            logger.info(f"  Last searched: {last_scooter['model']}")
        else:
            logger.info("✓ Scooter search complete. No results found")
        
        last_run_time = datetime.now()
        logger.info("\n" + "="*50)
        logger.info("ALL SEARCHES COMPLETED SUCCESSFULLY")
        logger.info(f"Total time: {(datetime.now() - last_run_time).total_seconds():.2f} seconds")
        logger.info("="*50 + "\n")
        
    except Exception as e:
        logger.error("\n" + "!"*50)
        logger.error("ERROR DURING SEARCHES")
        logger.error(str(e))
        logger.error("!"*50 + "\n")
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

@app.get("/logs")
async def get_logs():
    """Get the last 50 lines of logs"""
    try:
        with open('search_logs.log', 'r') as f:
            logs = f.readlines()
            # Filter out httpx logs unless there's an error
            filtered_logs = [
                log for log in logs[-50:] 
                if not log.startswith('2025-01-09') or 
                'ERROR' in log or 
                'Starting' in log or 
                'complete' in log or 
                'COMPLETED' in log or
                'Last searched:' in log
            ]
            return {
                "status": "success",
                "logs": filtered_logs
            }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@app.get("/stats")
async def get_stats():
    """Get statistics about the latest searches"""
    try:
        supabase = search_wallapop.init_supabase()
        
        # Get counts from each table
        cars = supabase.table('listings_coches').select('count', count='exact').execute()
        motos = supabase.table('listings_motos').select('count', count='exact').execute()
        furgos = supabase.table('listings_furgos').select('count', count='exact').execute()
        scooters = supabase.table('listings_scooters').select('count', count='exact').execute()
        
        # Get latest search times
        searches = supabase.table('searches').select('created_at', 'vehicle_type').order('created_at', desc=True).limit(4).execute()
        
        return {
            "status": "success",
            "counts": {
                "cars": cars.count,
                "motorcycles": motos.count,
                "vans": furgos.count,
                "scooters": scooters.count
            },
            "latest_searches": searches.data
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/reset")
async def reset_search():
    """Reset search state if it's stuck"""
    global search_in_progress, last_run_time
    search_in_progress = False
    return {
        "status": "success",
        "message": "Search state reset"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 