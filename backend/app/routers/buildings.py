# app/routers/buildings.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.models.building import Building

router = APIRouter(prefix="/buildings", tags=["Buildings"])


@router.get("/", response_model=List[dict])
async def list_buildings(db: AsyncSession = Depends(get_db)):
    """List all buildings"""
    result = await db.execute(select(Building).order_by(Building.building_no))
    buildings = result.scalars().all()
    
    return [
        {
            "id": b.id,
            "building_no": b.building_no,
            "address": b.address,
            "name": f"Building {b.building_no}",
            "totalRooms": 0,  # Could be calculated if needed
        }
        for b in buildings
    ]


@router.get("/{building_id}", response_model=dict)
async def get_building(building_id: int, db: AsyncSession = Depends(get_db)):
    """Get a building by ID"""
    result = await db.execute(select(Building).where(Building.id == building_id))
    building = result.scalar_one_or_none()
    
    if not building:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Building with id {building_id} not found"
        )
    
    return {
        "id": building.id,
        "building_no": building.building_no,
        "address": building.address,
        "name": f"Building {building.building_no}",
    }

