from unittest.mock import patch


def mock_pipeline_response():
    return {
        "id": 999,
        "answer": "Total revenue is $100,000",
        "sql": "SELECT SUM(amount) FROM df WHERE status='SUCCESS'",
        "data": [{"total_revenue": 100000}],
        "hypotheses": [],
        "best_hypothesis": None,
        "confidence": 0.9,
        "confidence_reason": "High confidence",
        "chart": None,
        "follow_up_suggestions": ["Compare with last month"],
        "provenance": {
            "source_tables": ["payments"],
            "row_count": 1,
            "timestamp": "2026-01-01T00:00:00"
        },
        "latency_ms": 1200,
        "created_at": "2026-01-01T00:00:00"
    }


@patch("app.services.pipeline_service.PipelineService.run")
def test_submit_query_success(mock_run, client, auth_headers):
    mock_run.return_value = mock_pipeline_response()

    response = client.post(
        "/api/v1/queries",
        headers=auth_headers,
        json={
            "query": "What is total revenue?",
            "session_id": "session_1"
        }
    )

    assert response.status_code == 200


def test_submit_query_unauthorized(client):
    response = client.post(
        "/api/v1/queries",
        json={"query": "What is revenue?"}
    )

    assert response.status_code in [401, 403]


def test_list_query_history(client, auth_headers):
    response = client.get(
        "/api/v1/queries",
        headers=auth_headers
    )

    assert response.status_code == 200


def test_list_sessions(client, auth_headers):
    response = client.get(
        "/api/v1/queries/sessions",
        headers=auth_headers
    )

    assert response.status_code == 200


def test_delete_nonexistent_session(client, auth_headers):
    response = client.delete(
        "/api/v1/queries/sessions/nonexistent",
        headers=auth_headers
    )

    assert response.status_code in [404]


def test_admin_can_view_history(client, admin_headers):
    response = client.get(
        "/api/v1/queries",
        headers=admin_headers
    )

    assert response.status_code == 200