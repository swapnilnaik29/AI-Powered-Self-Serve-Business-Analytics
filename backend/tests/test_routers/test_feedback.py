def create_query_for_feedback(client, auth_headers):
    response = client.post(
        "/api/v1/queries",
        headers=auth_headers,
        json={
            "query": "What is total revenue?",
            "session_id": "feedback_session"
        }
    )

    assert response.status_code == 200
    return response.json()["id"]


def test_submit_feedback_success(client, auth_headers):
    query_id = create_query_for_feedback(client, auth_headers)

    response = client.post(
        f"/api/v1/queries/{query_id}/feedback",
        headers=auth_headers,
        json={
            "rating": "up",
            "corrected_sql": "SELECT SUM(amount) FROM df",
            "comment": "Looks correct"
        }
    )

    assert response.status_code == 201

    data = response.json()

    assert data["rating"] == "up"


def test_duplicate_feedback_rejected(client, auth_headers):
    query_id = create_query_for_feedback(client, auth_headers)

    payload = {
        "rating": "down",
        "corrected_sql": "SELECT amount FROM df",
        "comment": "Good"
    }

    first = client.post(
        f"/api/v1/queries/{query_id}/feedback",
        headers=auth_headers,
        json=payload
    )

    assert first.status_code == 201

    second = client.post(
        f"/api/v1/queries/{query_id}/feedback",
        headers=auth_headers,
        json=payload
    )

    assert second.status_code in [400, 409]


def test_feedback_invalid_query(client, auth_headers):
    response = client.post(
        "/api/v1/queries/999999/feedback",
        headers=auth_headers,
        json={
            "rating": "up",
            "comment": "Invalid query"
        }
    )

    assert response.status_code == 404


def test_feedback_requires_auth(client):
    response = client.post(
        "/api/v1/queries/1/feedback",
        json={
            "rating": "up",
            "comment": "No auth"
        }
    )

    assert response.status_code in [401, 403]


def test_admin_feedback_export(client, admin_headers):
    response = client.get(
        "/api/v1/feedback/export",
        headers=admin_headers
    )

    assert response.status_code == 200
    assert "application/jsonl" in response.headers["content-type"]


def test_non_admin_feedback_export_blocked(client, auth_headers):
    response = client.get(
        "/api/v1/feedback/export",
        headers=auth_headers
    )

    assert response.status_code in [401, 403]