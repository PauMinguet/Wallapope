import uvicorn
import os

if __name__ == "__main__":
    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 8000))
    
    uvicorn.run(
        "api:app", 
        host="0.0.0.0",  # Listen on all available interfaces
        port=port,
        reload=True
    )