from fastapi import FastAPI
from app.routers import rooms


app = FastAPI(
    title="FormosaStay API",
    version="0.1.0",
)

app.include_router(rooms.router, prefix="/rooms")

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok"}