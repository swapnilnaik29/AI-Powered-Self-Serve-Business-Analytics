import io
import logging
from typing import Tuple, Optional
import base64

import pandas as pd
from jinja2 import Template

from app.models.query_log import QueryLog

logger = logging.getLogger(__name__)

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analytics Export - Query #{{ query_id }}</title>
    <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
    <script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>
    <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
    <style>
        :root {
            --bg-color: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --primary: #2563eb;
            --border: #e2e8f0;
            --success: #10b981;
            --warning: #f59e0b;
        }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background-color: var(--bg-color);
            color: var(--text-main);
            max-width: 1000px; 
            margin: 0 auto; 
            padding: 40px 20px;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        h1 { 
            color: var(--text-main);
            font-size: 2rem;
            font-weight: 700;
            margin: 0 0 8px 0;
            letter-spacing: -0.02em;
        }
        .subtitle {
            color: var(--text-muted);
            font-size: 1rem;
            margin: 0;
        }
        .card {
            background: var(--card-bg);
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            padding: 32px;
            margin-bottom: 24px;
            border: 1px solid var(--border);
        }
        .section-title { 
            font-weight: 600; 
            color: var(--text-muted); 
            text-transform: uppercase;
            font-size: 0.85rem;
            letter-spacing: 0.05em;
            margin: 0 0 12px 0;
            border-bottom: 1px solid var(--border);
            padding-bottom: 8px;
        }
        .content {
            font-size: 1.1rem;
            margin: 0;
        }
        pre { 
            background: #f1f5f9; 
            padding: 20px; 
            border-radius: 8px; 
            overflow-x: auto;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 0.9rem;
            border: 1px solid var(--border);
            color: #334155;
            margin: 0;
        }
        .table-container {
            overflow-x: auto;
            border-radius: 8px;
            border: 1px solid var(--border);
        }
        table { 
            border-collapse: collapse; 
            width: 100%;
            background: white;
            font-size: 0.95rem;
        }
        th, td { 
            padding: 12px 16px; 
            text-align: left; 
            border-bottom: 1px solid var(--border);
        }
        th { 
            background: #f8fafc; 
            color: var(--text-muted);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 0.05em;
        }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background-color: #f8fafc; }
        .confidence-badge { 
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #f0fdf4;
            color: var(--success);
            padding: 6px 12px;
            border-radius: 9999px;
            font-weight: 600;
            font-size: 0.95rem;
            border: 1px solid #bbf7d0;
        }
        .confidence-badge.low {
            background: #fffbeb;
            color: var(--warning);
            border-color: #fde68a;
        }
        #vis {
            width: 100%;
            display: flex;
            justify-content: center;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Analytics Report</h1>
        <p class="subtitle">Query #{{ query_id }} • Generated automatically</p>
    </div>

    <div class="card">
        <h2 class="section-title">Question</h2>
        <p class="content" style="font-weight: 500; font-size: 1.25rem;">{{ question }}</p>
    </div>

    <div class="card">
        <h2 class="section-title">AI Synthesis</h2>
        <p class="content">{{ answer }}</p>
        
        <div style="margin-top: 24px;">
            <h2 class="section-title">Confidence</h2>
            <div class="confidence-badge {% if confidence < 65 %}low{% endif %}">
                {{ confidence }}% - {{ confidence_reason }}
            </div>
        </div>
    </div>

    {% if chart_base64 %}
    <div class="card">
        <h2 class="section-title">Visualization</h2>
        <div id="vis" style="display: flex; justify-content: center; align-items: center;">
            <img src="{{ chart_base64 }}" alt="Chart" style="max-width: 100%; height: auto; border-radius: 8px;" />
        </div>
    </div>
    {% elif chart %}
    <div class="card">
        <h2 class="section-title">Visualization</h2>
        <div id="vis"></div>
        <script>
            var spec = {{ chart | safe }};
            // Dynamically adjust width to container
            spec.width = "container";
            vegaEmbed('#vis', spec, {actions: false}).catch(console.error);
        </script>
    </div>
    {% endif %}

    {% if data_html %}
    <div class="card">
        <h2 class="section-title">Data Snapshot</h2>
        <div class="table-container">
            {{ data_html }}
        </div>
    </div>
    {% endif %}

    <div class="card">
        <h2 class="section-title">Execution Provenance</h2>
        <pre><code>{{ sql }}</code></pre>
    </div>

</body>
</html>"""


class ExportService:

    def _render_chart_to_png(self, chart_spec) -> Optional[bytes]:
        if not chart_spec:
            return None
        try:
            import json
            import vl_convert as vlc
            if isinstance(chart_spec, dict):
                spec = chart_spec
            else:
                if str(chart_spec).startswith("data:image"):
                    return base64.b64decode(chart_spec.split(",")[1])
                spec = json.loads(chart_spec)
            
            if not isinstance(spec, dict) or "$schema" not in spec:
                return None
                
            return vlc.vegalite_to_png(spec)
        except Exception as e:
            logger.error("Failed to render Vega-Lite spec to PNG: %s", e)
            return None

    # =========================
    # PDF EXPORT (WITH CHART)
    # =========================
    def export_pdf(self, log: QueryLog) -> Tuple[io.BytesIO, str, str]:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
        from reportlab.lib.styles import getSampleStyleSheet

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []

        # Title
        story.append(Paragraph(f"Query #{log.id}", styles["Title"]))
        story.append(Spacer(1, 12))

        # Question
        story.append(Paragraph("Question:", styles["Heading2"]))
        story.append(Paragraph(log.natural_language_query, styles["Normal"]))
        story.append(Spacer(1, 12))

        # Answer
        story.append(Paragraph("Answer:", styles["Heading2"]))
        story.append(Paragraph(log.answer_text or "N/A", styles["Normal"]))
        story.append(Spacer(1, 12))

        # Confidence
        confidence_pct = round((log.confidence_score or 0) * 100, 1)
        story.append(Paragraph("Confidence:", styles["Heading2"]))
        story.append(Paragraph(
            f"{confidence_pct}% - {log.confidence_reason or 'N/A'}",
            styles["Normal"]
        ))
        story.append(Spacer(1, 12))

        # SQL
        story.append(Paragraph("Generated SQL:", styles["Heading2"]))
        story.append(Paragraph(
            f"<pre>{log.generated_sql or 'N/A'}</pre>",
            styles["Code"]
        ))
        story.append(Spacer(1, 12))

        # 🔥 CHART ADDITION
        if log.chart_spec:
            png_data = self._render_chart_to_png(log.chart_spec)
            if png_data:
                try:
                    img_buffer = io.BytesIO(png_data)
                    story.append(Paragraph("Chart:", styles["Heading2"]))
                    story.append(Image(img_buffer, width=450, height=250))
                    story.append(Spacer(1, 12))
                except Exception as e:
                    logger.error("Failed to add chart image to PDF: %s", e)

        # Data Summary Table
        data = log.result_summary.get("data", []) if log.result_summary else []
        if data:
            try:
                from reportlab.platypus import Table, TableStyle
                from reportlab.lib import colors
                
                story.append(Paragraph("Data Summary (Top 20 rows):", styles["Heading2"]))
                
                df = pd.DataFrame(data).head(20)
                columns = list(df.columns)
                table_data = [columns] + df.values.tolist()
                
                table_data = [[str(cell)[:50] for cell in row] for row in table_data]
                
                t = Table(table_data)
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16213e')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9f9f9')),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd'))
                ]))
                story.append(t)
                story.append(Spacer(1, 12))
            except Exception as e:
                logger.error("Failed to add data table to PDF: %s", e)

        doc.build(story)
        buf.seek(0)

        return buf, "application/pdf", f"query_{log.id}.pdf"

    # =========================
    # EXCEL EXPORT
    # =========================
    def export_excel(self, log: QueryLog) -> Tuple[io.BytesIO, str, str]:
        buf = io.BytesIO()

        data = log.result_summary.get("data", []) if log.result_summary else []
        df = pd.DataFrame(data) if data else pd.DataFrame()

        summary = pd.DataFrame([{
            "Query": log.natural_language_query,
            "Answer": log.answer_text or "",
            "SQL": log.generated_sql or "",
            "Confidence": log.confidence_score or 0,
            "Confidence Reason": log.confidence_reason or "",
        }])

        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            summary.to_excel(writer, sheet_name="Summary", index=False)
            if not df.empty:
                df.to_excel(writer, sheet_name="Data", index=False)

            if log.chart_spec:
                png_data = self._render_chart_to_png(log.chart_spec)
                if png_data:
                    try:
                        from openpyxl.drawing.image import Image as OpenpyxlImage
                        img_file = io.BytesIO(png_data)
                        img = OpenpyxlImage(img_file)
                        summary_sheet = writer.book["Summary"]
                        summary_sheet.add_image(img, "A5")
                    except Exception as e:
                        logger.error("Failed to add image to Excel: %s", e)

        buf.seek(0)
        return buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f"query_{log.id}.xlsx"

    # =========================
    # HTML EXPORT (WITH CHART)
    # =========================
    def export_html(self, log: QueryLog) -> Tuple[io.BytesIO, str, str]:
        data = log.result_summary.get("data", []) if log.result_summary else []
        df = pd.DataFrame(data) if data else pd.DataFrame()

        data_html = df.to_html(index=False, classes="data-table") if not df.empty else ""

        import json
        chart_str = json.dumps(log.chart_spec) if isinstance(log.chart_spec, dict) else log.chart_spec

        png_data = self._render_chart_to_png(log.chart_spec)
        chart_base64 = None
        if png_data:
            chart_base64 = f"data:image/png;base64,{base64.b64encode(png_data).decode('utf-8')}"

        template = Template(HTML_TEMPLATE)

        html_content = template.render(
            query_id=log.id,
            question=log.natural_language_query,
            answer=log.answer_text or "N/A",
            confidence=round((log.confidence_score or 0) * 100, 1),
            confidence_reason=log.confidence_reason or "N/A",
            sql=log.generated_sql or "N/A",
            data_html=data_html,
            chart=chart_str,
            chart_base64=chart_base64
        )

        buf = io.BytesIO(html_content.encode("utf-8"))

        return buf, "text/html", f"query_{log.id}.html"