from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import rooms, health, leases, buildings, tenants, dashboard


app = FastAPI(
    title="FormosaStay API",
    version="0.1.0",
    description="RESTful API for FormosaStay rental management system",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(buildings.router)
app.include_router(rooms.router)
app.include_router(tenants.router)
app.include_router(leases.router)
app.include_router(dashboard.router)


@app.get("/", tags=["System"])
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to FormosaStay API",
        "version": "0.1.0",
        "docs": "/docs"
    }