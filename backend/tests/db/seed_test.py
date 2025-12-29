########################################################
# Run this to seed the database with test data
# uv run python -m tests.db.seed_test
########################################################
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import async_session
from app.models import Building, Room, Tenant, Lease
from datetime import date
import pytest
import httpx

async def seed():
    async with async_session() as session:
        # Building
        building = Building(name="Formosa Stay", address="Tainan")
        session.add(building)
        await session.flush()

        # Rooms
        room1 = Room(
            building_id=building.id,
            room_number="101",
            is_available=True
        )
        session.add(room1)

        # Tenant
        tenant = Tenant(
            full_name="王小明",
            email="ming@example.com"
        )
        session.add(tenant)
        await session.flush()

        # Lease
        lease = Lease(
            tenant_id=tenant.id,
            room_id=room1.id,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            monthly_rent=18000
        )
        session.add(lease)

        await session.commit()

async def test_tenant_dashboard(client):
    resp = await client.get("/tenants/1/dashboard")
    assert resp.status_code == 200

    data = resp.json()
    assert data["tenant"]["full_name"] == "王小明"
    assert data["current_lease"]["room_number"] == "101"



if __name__ == "__main__":
    import asyncio
    asyncio.run(seed())
