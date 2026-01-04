from datetime import date, timedelta

async def create_draft_lease(client, payload):
    resp = await client.post("/leases", json=payload)
    assert resp.status_code == 201
    return resp.json()

async def submit_lease(client, lease_id):
    resp = await client.post(f"/leases/{lease_id}/submit")
    assert resp.status_code in (200, 409)
    return resp.json()

async def terminate_lease(client, lease_id, termination_date):
    resp = await client.post(
        f"/leases/{lease_id}/terminate",
        json={
            "termination_date": termination_date,
            "reason": "test termination"
        }
    )
    assert resp.status_code == 200
    return resp.json()
