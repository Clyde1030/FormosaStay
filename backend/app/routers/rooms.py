from fastapi import APIRouter

router = APIRouter()

@router.get("/rooms")
async def list_rooms():
    return []
