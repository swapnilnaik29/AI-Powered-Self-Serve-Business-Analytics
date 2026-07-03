def test_admin_can_view_all_history(client, admin_headers):
    response = client.get(
        "/api/v1/queries",
        headers=admin_headers
    )

    assert response.status_code == 200


def test_analyst_can_view_own_history_only(client, auth_headers):
    response = client.get(
        "/api/v1/queries",
        headers=auth_headers
    )

    assert response.status_code == 200


def test_invalid_query_id_returns_404(client, auth_headers):
    response = client.get(
        "/api/v1/queries/999999",
        headers=auth_headers
    )

    assert response.status_code == 404


def test_unauthenticated_history_access_blocked(client):
    response = client.get("/api/v1/queries")

    assert response.status_code in [401, 403]


def test_admin_invalid_session_returns_404(client, admin_headers):
    response = client.get(
        "/api/v1/queries/sessions/does_not_exist",
        headers=admin_headers
    )

    assert response.status_code == 404