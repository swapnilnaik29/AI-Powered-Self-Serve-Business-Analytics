from unittest.mock import patch


def followup_response_1():
    return {
        "id": 1,
        "answer": "Last month revenue was $194,607",
        "sql": "SELECT SUM(amount) FROM df WHERE created_at >= ...",
        "data": [{"total_revenue": 194607}],
        "hypotheses": [],
        "best_hypothesis": None,
        "confidence": 0.8,
        "confidence_reason": "Good confidence",
        "chart": None,
        "follow_up_suggestions": [
            "Compare with this month",
            "Show failed transactions"
        ],
        "provenance": {
            "source_tables": ["payments"],
            "row_count": 1,
            "timestamp": "2026-01-01T00:00:00"
        },
        "latency_ms": 900,
        "created_at": "2026-01-01T00:00:00"
    }


def followup_response_2():
    return {
        "id": 2,
        "answer": "Current vs last month comparison generated",
        "sql": """
            SELECT
            SUM(CASE WHEN created_at >= current_date THEN amount END) current_month,
            SUM(CASE WHEN created_at < current_date THEN amount END) last_month
            FROM df
        """,
        "data": [{"current_month": 210000, "last_month": 194607}],
        "hypotheses": [],
        "best_hypothesis": None,
        "confidence": 0.85,
        "confidence_reason": "Context understood",
        "chart": None,
        "follow_up_suggestions": [
            "Only failed transactions"
        ],
        "provenance": {
            "source_tables": ["payments"],
            "row_count": 2,
            "timestamp": "2026-01-01T00:00:00"
        },
        "latency_ms": 1000,
        "created_at": "2026-01-01T00:00:00"
    }


def followup_response_3():
    return {
        "id": 3,
        "answer": "Comparison for failed transactions only",
        "sql": """
            SELECT *
            FROM df
            WHERE status = 'FAILED'
        """,
        "data": [{"failed": 23}],
        "hypotheses": [],
        "best_hypothesis": None,
        "confidence": 0.82,
        "confidence_reason": "Follow-up context preserved",
        "chart": None,
        "follow_up_suggestions": [],
        "provenance": {
            "source_tables": ["payments"],
            "row_count": 1,
            "timestamp": "2026-01-01T00:00:00"
        },
        "latency_ms": 950,
        "created_at": "2026-01-01T00:00:00"
    }


@patch("app.services.pipeline_service.PipelineService.run")
def test_followup_same_session_context(mock_run, client, auth_headers):
    mock_run.side_effect = [
        followup_response_1(),
        followup_response_2(),
        followup_response_3()
    ]

    session_id = "conversation_123"

    q1 = client.post(
        "/api/v1/queries",
        headers=auth_headers,
        json={
            "query": "What is total revenue last month?",
            "session_id": session_id
        }
    )

    assert q1.status_code == 200
    assert "revenue" in q1.json()["answer"].lower()

    q2 = client.post(
        "/api/v1/queries",
        headers=auth_headers,
        json={
            "query": "Compare with this month",
            "session_id": session_id
        }
    )

    assert q2.status_code == 200
    assert "current_month" in q2.json()["sql"]

    q3 = client.post(
        "/api/v1/queries",
        headers=auth_headers,
        json={
            "query": "Only failed transactions",
            "session_id": session_id
        }
    )

    assert q3.status_code == 200
    assert "FAILED" in q3.json()["sql"]


@patch("app.services.pipeline_service.PipelineService.run")
def test_new_session_independent_context(mock_run, client, auth_headers):
    mock_run.return_value = followup_response_1()

    response = client.post(
        "/api/v1/queries",
        headers=auth_headers,
        json={
            "query": "What is revenue?",
            "session_id": "fresh_session"
        }
    )

    assert response.status_code == 200
    assert "answer" in response.json()


@patch("app.services.pipeline_service.PipelineService.run")
def test_followup_suggestions_exist(mock_run, client, auth_headers):
    mock_run.return_value = followup_response_1()

    response = client.post(
        "/api/v1/queries",
        headers=auth_headers,
        json={
            "query": "Revenue analysis",
            "session_id": "followup_suggestions"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert "follow_up_suggestions" in data
    assert isinstance(data["follow_up_suggestions"], list)