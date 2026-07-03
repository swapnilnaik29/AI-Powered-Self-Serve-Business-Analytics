def test_list_glossary_unauthenticated(client):
    response = client.get("/api/v1/glossary")
    assert response.status_code == 401


def test_create_glossary_admin(client, admin_headers):
    response = client.post(
        "/api/v1/glossary",
        json={
            "term": "Test Revenue",
            "definition": "Sum of amounts for successful txns",
            "sql_expression": "SUM(amount) WHERE status='SUCCESS'",
            "category": "Financial",
        },
        headers=admin_headers,
    )
    assert response.status_code == 201
    assert response.json()["term"] == "Test Revenue"


def test_create_glossary_non_admin_forbidden(client, auth_headers):
    response = client.post(
        "/api/v1/glossary",
        json={
            "term": "Forbidden Term",
            "definition": "Should not be created",
            "sql_expression": "COUNT(*)",
        },
        headers=auth_headers,
    )
    assert response.status_code == 403


def test_list_glossary_authenticated(client, auth_headers):
    response = client.get("/api/v1/glossary", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
