from fastapi.testclient import TestClient

from app.main import app


def test_list_users_returns_seeded_logins():
    with TestClient(app) as client:
        response = client.get("/api/users")
    assert response.status_code == 200
    logins = response.json()
    assert "p01" in logins
    assert "p40" in logins
    assert len(logins) >= 40


def test_create_user_returns_201_and_creates_three_bulbs():
    login = "alice-create"
    with TestClient(app) as client:
        post = client.post("/api/users", json={"login": login})
        assert post.status_code == 201
        body = post.json()
        assert body["login"] == login
        assert "created_at" in body

        bulbs_response = client.get("/api/bulbs", params={"user": login})
        assert bulbs_response.status_code == 200
        bulbs = bulbs_response.json()
        assert sorted(b["slot"] for b in bulbs) == [1, 2, 3]
        assert all(b["r"] == 0 and b["g"] == 0 and b["b"] == 0 for b in bulbs)


def test_create_user_409_when_login_already_exists():
    with TestClient(app) as client:
        response = client.post("/api/users", json={"login": "p01"})
    assert response.status_code == 409


def test_create_user_400_when_login_blank():
    with TestClient(app) as client:
        for invalid in ({"login": ""}, {"login": "   "}, {}):
            response = client.post("/api/users", json=invalid)
            assert response.status_code == 400, invalid


def test_delete_user_cascades_bulbs():
    login = "bob-delete"
    with TestClient(app) as client:
        create = client.post("/api/users", json={"login": login})
        assert create.status_code == 201
        assert client.get("/api/bulbs", params={"user": login}).status_code == 200

        delete = client.delete(f"/api/users/{login}")
        assert delete.status_code == 204
        assert delete.text == ""

        assert client.get("/api/bulbs", params={"user": login}).status_code == 404


def test_delete_user_404_when_unknown():
    with TestClient(app) as client:
        response = client.delete("/api/users/ghost")
    assert response.status_code == 404
