from io import BytesIO
from datetime import datetime

from app.services.export_service import ExportService


class DummyQueryLog:
    id = 101
    natural_language_query = "What is total revenue?"
    answer_text = "Revenue is $100,000"
    generated_sql = "SELECT SUM(amount) FROM df"
    confidence_score = 0.9
    confidence_reason = "High confidence"
    chart_spec = None
    created_at = datetime.now()

    result_summary = {
        "data": [
            {"country": "India", "revenue": 10000},
            {"country": "USA", "revenue": 20000},
        ]
    }


def test_export_pdf():
    service = ExportService()
    log = DummyQueryLog()

    buf, media_type, filename = service.export_pdf(log)

    assert isinstance(buf, BytesIO)
    assert media_type == "application/pdf"
    assert filename.endswith(".pdf")
    assert len(buf.read()) > 0


def test_export_excel():
    service = ExportService()
    log = DummyQueryLog()

    buf, media_type, filename = service.export_excel(log)

    assert isinstance(buf, BytesIO)
    assert media_type == (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert filename.endswith(".xlsx")
    assert len(buf.read()) > 0


def test_export_html():
    service = ExportService()
    log = DummyQueryLog()

    buf, media_type, filename = service.export_html(log)

    assert isinstance(buf, BytesIO)
    assert media_type == "text/html"
    assert filename.endswith(".html")

    content = buf.read().decode("utf-8")

    assert "What is total revenue?" in content
    assert "Revenue is $100,000" in content
    assert "SELECT SUM(amount)" in content


def test_export_with_empty_data():
    class EmptyLog(DummyQueryLog):
        result_summary = {"data": []}

    service = ExportService()
    log = EmptyLog()

    pdf_buf, _, _ = service.export_pdf(log)
    excel_buf, _, _ = service.export_excel(log)
    html_buf, _, _ = service.export_html(log)

    assert len(pdf_buf.read()) > 0
    assert len(excel_buf.read()) > 0
    assert len(html_buf.read()) > 0 