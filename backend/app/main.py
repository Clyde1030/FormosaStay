from fastapi import FastAPI
from app.routers import rooms, health, leases


app = FastAPI(
    title="FormosaStay API",
    version="0.1.0",
    description="RESTful API for FormosaStay rental management system",
)

# Include routers
app.include_router(health.router)
app.include_router(rooms.router)
app.include_router(leases.router)


@app.get("/", tags=["System"])
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to FormosaStay API",
        "version": "0.1.0",
        "docs": "/docs"
    }