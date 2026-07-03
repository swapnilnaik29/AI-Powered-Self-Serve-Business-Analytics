import pytest
from app.services.nl2sql_service import NL2SQLService
from app.core.exceptions import UnsafeSQLException


class FakeLLM:
    total_tokens_used = 0

    def chat(self, prompt, **kwargs):
        return (
            '{"sql": "SELECT SUM(amount) as revenue FROM df WHERE '
            'status=\'SUCCESS\'", "explanation": "test"}'
        )


class UnsafeFakeLLM:
    total_tokens_used = 0

    def chat(self, prompt, **kwargs):
        return '{"sql": "DROP TABLE df; SELECT 1", "explanation": "test"}'


def test_generate_sql_clean():
    service = NL2SQLService(FakeLLM())
    sql, _ = service.generate("What is total revenue?", "amount: transaction amount")
    assert "SELECT" in sql
    assert "SUM(amount)" in sql


def test_generate_sql_blocks_unsafe():
    service = NL2SQLService(UnsafeFakeLLM())
    with pytest.raises(UnsafeSQLException):
        service.generate("Drop the table", "some schema")


def test_parse_json_response_removes_markdown():
    service = NL2SQLService(FakeLLM())
    raw = '```json\n{"sql": "SELECT 1", "explanation": "foo"}\n```'
    sql, explanation = service._parse_json_response(raw)
    assert "SELECT 1" in sql
    assert explanation == "foo"
