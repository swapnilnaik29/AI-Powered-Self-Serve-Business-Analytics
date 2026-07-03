import pandas as pd

from app.services.chart_service import ChartService


class DummyLLM:
    def chat(self, *args, **kwargs):
        return "bar"


def test_generate_bar_chart():
    service = ChartService(DummyLLM())

    df = pd.DataFrame({
        "country": ["India", "USA", "UK"],
        "revenue": [1000, 2000, 1500]
    })

    chart_type = service.decide_chart_type(
        "Show revenue by country",
        df
    )

    chart = service.generate_chart(df, chart_type)

    assert chart is not None
    assert "mark" in chart


class DummyLLMLine:
    def chat(self, *args, **kwargs):
        return "line"


def test_generate_line_chart():
    service = ChartService(DummyLLMLine())

    df = pd.DataFrame({
        "created_at": ["2026-01-01", "2026-01-02", "2026-01-03"],
        "revenue": [100, 200, 300]
    })

    chart_type = service.decide_chart_type(
        "Revenue trend over time",
        df
    )

    chart = service.generate_chart(df, chart_type)

    assert chart is not None
    assert "mark" in chart


class DummyLLMNone:
    def chat(self, *args, **kwargs):
        return "none"


def test_single_value_returns_no_chart():
    service = ChartService(DummyLLMNone())

    df = pd.DataFrame({
        "revenue": [1000]
    })

    chart_type = service.decide_chart_type(
        "Total revenue",
        df
    )

    chart = service.generate_chart(df, chart_type)

    assert chart is None


def test_empty_dataframe_returns_none():
    service = ChartService(DummyLLM())

    df = pd.DataFrame()

    chart_type = service.decide_chart_type(
        "Anything",
        df
    )

    chart = service.generate_chart(df, chart_type)

    assert chart is None


def test_invalid_dataframe_structure():
    service = ChartService(DummyLLM())

    df = pd.DataFrame({
        "only_one_column": ["test"]
    })

    chart = service.generate_chart(df, "bar")

    assert chart is None