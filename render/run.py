import uvicorn
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=port,
        reload=False
    ) 