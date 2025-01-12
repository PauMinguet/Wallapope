import uvicorn
from main import app

if __name__ == "__main__":
    # Configure uvicorn to run the FastAPI app
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Allows external access
        port=8000,       # Port to run the server on
        reload=True,     # Enable auto-reload on code changes
        workers=1        # Number of worker processes
    ) 