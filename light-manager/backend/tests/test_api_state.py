from fastapi.testclient import TestClient

from app.main import app


def test_get_state_returns_all_users_with_three_bulbs_each():
    with TestClient(app) as client:
        response = client.get("/api/state")

    assert response.status_code == 200
    state = response.json()
    assert len(state) >= 40

    p01 = next(s for s in state if s["login"] == "participant-01")
    assert len(p01["bulbs"]) == 3
    assert sorted(b["slot"] for b in p01["bulbs"]) == [1, 2, 3]
    for bulb in p01["bulbs"]:
        for key in ("slot", "r", "g", "b", "updated_at"):
            assert key in bulb


def test_get_state_reflects_a_put_mutation():
    with TestClient(app) as client:
        put = client.put(
            "/api/bulbs/3",
            params={"user": "participant-10"},
            json={"r": 12, "g": 200, "b": 64},
        )
        assert put.status_code == 200

        response = client.get("/api/state")
        assert response.status_code == 200

    entry = next(s for s in response.json() if s["login"] == "participant-10")
    slot3 = next(b for b in entry["bulbs"] if b["slot"] == 3)
    assert (slot3["r"], slot3["g"], slot3["b"]) == (12, 200, 64)
