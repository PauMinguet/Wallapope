import uvicorn
import os

if __name__ == "__main__":
    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 10000))
    
    uvicorn.run(
        "api:app", 
        host="0.0.0.0",
        port=port,
        workers=1,  # Specify number of workers
        reload=False  # Disable reload in production
    )