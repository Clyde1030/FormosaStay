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
    try:
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
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching buildings: {str(e)}"
        )


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


@router.get("/by-number/{building_no}", response_model=dict)
async def get_building_by_number(building_no: int, db: AsyncSession = Depends(get_db)):
    """Get a building by building number"""
    result = await db.execute(select(Building).where(Building.building_no == building_no))
    building = result.scalar_one_or_none()
    
    if not building:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Building with number {building_no} not found"
        )
    
    return {
        "id": building.id,
        "building_no": building.building_no,
        "address": building.address,
        "name": f"Building {building.building_no}",
        "landlord_name": building.landlord_name,
        "landlord_address": building.landlord_address,
    }

