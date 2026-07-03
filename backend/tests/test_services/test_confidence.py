from app.services.confidence_service import ConfidenceService


def test_failed_execution_low_confidence():
    service = ConfidenceService()
    score, reason = service.compute(False, 0, None, "What is revenue?")
    assert score == 0.3
    assert "failure" in reason.lower()


def test_success_with_data_moderate_confidence():
    service = ConfidenceService()
    score, reason = service.compute(True, 100, None, "What is total revenue?")
    assert 0.5 < score < 0.9
    assert "sufficient data" in reason.lower()


def test_success_with_supported_hypothesis_high_confidence():
    service = ConfidenceService()
    hypothesis_results = [{"supported": True, "change_pct": 15.0}]
    score, reason = service.compute(True, 100, hypothesis_results, "Show revenue trend")
    assert score >= 0.7


def test_why_query_reduces_confidence():
    service = ConfidenceService()
    score_normal, _ = service.compute(True, 100, None, "What is total revenue?")
    score_why, _ = service.compute(True, 100, None, "Why did revenue decrease?")
    assert score_why < score_normal


def test_confidence_clamped():
    service = ConfidenceService()
    score, _ = service.compute(True, 0, [], "Why did revenue drop?")
    assert 0.1 <= score <= 0.95
