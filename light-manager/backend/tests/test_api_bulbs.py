from fastapi.testclient import TestClient

from app.main import app


def test_get_bulbs_returns_three_for_known_user():
    with TestClient(app) as client:
        response = client.get("/api/bulbs", params={"user": "p01"})

    assert response.status_code == 200
    bulbs = response.json()
    assert len(bulbs) == 3
    assert sorted(b["slot"] for b in bulbs) == [1, 2, 3]
    for bulb in bulbs:
        assert bulb["r"] == 0 and bulb["g"] == 0 and bulb["b"] == 0
        assert "updated_at" in bulb


def test_get_bulbs_404_for_unknown_user():
    with TestClient(app) as client:
        response = client.get("/api/bulbs", params={"user": "ghost"})

    assert response.status_code == 404
    assert "ghost" in response.json()["detail"]


def test_get_bulbs_400_when_user_missing():
    with TestClient(app) as client:
        response = client.get("/api/bulbs")

    assert response.status_code == 400


def test_put_bulb_updates_color_and_get_reflects_it():
    payload = {"r": 255, "g": 0, "b": 128}
    with TestClient(app) as client:
        put_response = client.put(
            "/api/bulbs/1",
            params={"user": "p02"},
            json=payload,
        )
        assert put_response.status_code == 200
        body = put_response.json()
        assert body["slot"] == 1
        assert body["r"] == 255
        assert body["g"] == 0
        assert body["b"] == 128

        get_response = client.get("/api/bulbs", params={"user": "p02"})
        assert get_response.status_code == 200
        slot1 = next(b for b in get_response.json() if b["slot"] == 1)
        assert (slot1["r"], slot1["g"], slot1["b"]) == (255, 0, 128)


def test_put_bulb_404_for_unknown_user():
    with TestClient(app) as client:
        response = client.put(
            "/api/bulbs/1",
            params={"user": "ghost"},
            json={"r": 1, "g": 1, "b": 1},
        )

    assert response.status_code == 404


def test_put_bulb_404_for_invalid_slot():
    with TestClient(app) as client:
        for invalid_slot in (0, 4, 99):
            response = client.put(
                f"/api/bulbs/{invalid_slot}",
                params={"user": "p03"},
                json={"r": 1, "g": 1, "b": 1},
            )
            assert response.status_code == 404, f"slot={invalid_slot}"


def test_put_bulb_400_for_invalid_rgb():
    with TestClient(app) as client:
        too_high = client.put(
            "/api/bulbs/1",
            params={"user": "p04"},
            json={"r": 999, "g": 0, "b": 0},
        )
        assert too_high.status_code == 400

        negative = client.put(
            "/api/bulbs/1",
            params={"user": "p04"},
            json={"r": -1, "g": 0, "b": 0},
        )
        assert negative.status_code == 400

        missing_field = client.put(
            "/api/bulbs/1",
            params={"user": "p04"},
            json={"r": 0, "g": 0},
        )
        assert missing_field.status_code == 400
