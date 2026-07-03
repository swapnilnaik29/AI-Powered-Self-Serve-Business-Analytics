import logging
from typing import Optional

import altair as alt
import pandas as pd

from app.integrations.llm_client import LLMClient

logger = logging.getLogger(__name__)

# Vega-Lite v5 schema URL, injected into specs if missing
_VEGA_LITE_SCHEMA = "https://vega.github.io/schema/vega-lite/v5.json"

# Mapping from explicit query_type values to chart types
_QUERY_TYPE_MAP = {
    "trend": "line",
    "time_series": "line",
    "ranking": "bar",
    "distribution": "bar",
    "grouped": "bar",
    "comparison": "bar",
    "scalar": "none",
}


class ChartService:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    # ------------------------------------------------------------------
    # Internal helpers for deterministic dtype-based chart selection
    # ------------------------------------------------------------------

    @staticmethod
    def _is_datetime_column(series: pd.Series) -> bool:
        """Return True if *series* already has a datetime dtype or can be
        parsed as datetime without raising."""
        if pd.api.types.is_datetime64_any_dtype(series):
            return True
        try:
            pd.to_datetime(series, infer_datetime_format=True)
            return True
        except (ValueError, TypeError):
            return False

    @staticmethod
    def _is_categorical_column(series: pd.Series) -> bool:
        """Return True if *series* holds string / object / categorical data."""
        return pd.api.types.is_string_dtype(series) or pd.api.types.is_categorical_dtype(series)

    @staticmethod
    def _is_numeric_column(series: pd.Series) -> bool:
        """Return True if *series* is numeric."""
        return pd.api.types.is_numeric_dtype(series)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def decide_chart_type(
        self,
        query: str,
        df: Optional[pd.DataFrame],
        query_type: Optional[str] = None,
    ) -> str:
        """Choose the best chart type for *df*.

        Resolution order
        ----------------
        1. If *query_type* is provided and recognised, return immediately.
        2. Deterministic heuristics based on column dtypes.
        3. LLM fallback for ambiguous cases (e.g. both columns numeric).
        """
        if df is None or df.empty:
            return "none"

        if len(df.columns) < 2:
            return "none"

        # --- 1. Explicit query_type override ----------------------------
        if query_type is not None:
            mapped = _QUERY_TYPE_MAP.get(query_type.lower())
            if mapped is not None:
                return mapped

        # --- 2. Deterministic heuristics --------------------------------
        first_col = df.iloc[:, 0]
        second_col = df.iloc[:, 1]

        # Datetime first column → line chart
        if self._is_datetime_column(first_col):
            return "line"

        # Categorical first column + numeric second column → bar chart
        if self._is_categorical_column(first_col) and self._is_numeric_column(second_col):
            return "bar"

        # --- 3. LLM fallback for ambiguous cases -----------------------
        return self._llm_decide_chart_type(query, df)

    def _llm_decide_chart_type(self, query: str, df: pd.DataFrame) -> str:
        """Call the LLM to decide chart type — used only for ambiguous cases."""
        columns = list(df.columns)
        sample = df.head(5).to_string(index=False)

        prompt = (
            "Decide the best chart type for the given data.\n"
            "Return ONLY one of: line, bar, none\n\n"
            "Rules:\n"
            "- line: for time series / trends over dates\n"
            "- bar: for categorical comparisons\n"
            "- none: if only a single scalar value\n\n"
            f"Query: {query}\n"
            f"Columns: {columns}\n"
            f"Sample:\n{sample}"
        )

        try:
            result = self.llm.chat(prompt, max_tokens=10, temperature=0)
            chart_type = result.strip().lower()

            if chart_type not in ("line", "bar", "none"):
                return "bar"

            return chart_type

        except Exception:
            return "none"

    def generate_chart(
        self,
        df: Optional[pd.DataFrame],
        chart_type: str,
        query: Optional[str] = None,
    ) -> Optional[dict]:
        if df is None or df.empty or chart_type == "none":
            return None

        # A single-row result is a scalar — no chart is meaningful
        if len(df) == 1:
            return None

        df_plot = df.copy()
        df_plot.columns = [str(c).lower() for c in df_plot.columns]

        if len(df_plot.columns) < 2:
            return None

        x = df_plot.columns[0]
        color_col = None
        
        if len(df_plot.columns) >= 3:
            color_col = df_plot.columns[1]
            y = df_plot.columns[2]
            # Ensure y is numeric
            if not self._is_numeric_column(df_plot[y]):
                numeric_cols = [c for c in df_plot.columns if self._is_numeric_column(df_plot[c])]
                if numeric_cols:
                    y = numeric_cols[0]
                    remaining = [c for c in df_plot.columns if c != x and c != y]
                    if remaining:
                        color_col = remaining[0]
        else:
            y = df_plot.columns[1]

        is_time = False
        try:
            df_plot[x] = pd.to_datetime(df_plot[x])
            is_time = True
        except (ValueError, TypeError):
            pass

        is_currency = any(kw in y.lower() for kw in ("revenue", "amount", "value", "price"))

        # Build a readable chart title from axis labels or LLM if query is available
        chart_title = f"{y.replace('_', ' ').title()} by {x.replace('_', ' ').title()}"
        if query:
            try:
                prompt = (
                    f"Create a concise, professional chart title (max 6 words) for a chart generated from this user query: '{query}'.\n"
                    "Examples:\n"
                    "- 'Daily Revenue (Last 30 Days)'\n"
                    "- 'Payment Success Rate by Country'\n"
                    "- 'Revenue Comparison by Industry'\n"
                    "Do not use quotes or markdown in your output. Just return the raw title string."
                )
                suggested_title = self.llm.chat(prompt, max_tokens=15).strip().strip('"').strip("'")
                if suggested_title and len(suggested_title.split()) <= 12:
                    chart_title = suggested_title
            except Exception as e:
                logger.warning("Dynamic chart title generation failed: %s", e)

        tooltip_encoding = []
        if is_time:
            tooltip_encoding.append(alt.Tooltip(x, type="temporal", format="%b %d, %Y", title=x.replace('_', ' ').title()))
        else:
            tooltip_encoding.append(alt.Tooltip(x, type="nominal", title=x.replace('_', ' ').title()))
            
        if color_col:
            tooltip_encoding.append(alt.Tooltip(color_col, type="nominal", title=color_col.replace('_', ' ').title()))
            
        tooltip_encoding.append(alt.Tooltip(y, type="quantitative", format="$,.2f" if is_currency else None, title=y.replace('_', ' ').title()))

        try:
            if chart_type == "line":
                x_encoding = alt.X(x, type="temporal" if is_time else "nominal", axis=alt.Axis(format="%b %d, %Y" if is_time else None, labelAngle=-30, grid=True))
                y_encoding = alt.Y(y, type="quantitative", axis=alt.Axis(format="$,.2f" if is_currency else None))
                
                if color_col:
                    color_encoding = alt.Color(
                        color_col,
                        scale=alt.Scale(range=["#4F46E5", "#0D9488", "#64748B", "#F59E0B", "#EF4444", "#3B82F6"]),
                        legend=alt.Legend(title=color_col.replace('_', ' ').title(), orient="top-left")
                    )
                    chart = (
                        alt.Chart(df_plot)
                        .mark_line(interpolate="monotone", point=True)
                        .encode(
                            x=x_encoding,
                            y=y_encoding,
                            color=color_encoding,
                            tooltip=tooltip_encoding
                        )
                        .properties(width=700, height=400, title=chart_title)
                    )
                else:
                    chart = (
                        alt.Chart(df_plot)
                        .mark_line(interpolate="monotone", point=alt.OverlayMarkDef(color="#4F46E5"), color="#4F46E5")
                        .encode(
                            x=x_encoding,
                            y=y_encoding,
                            tooltip=tooltip_encoding
                        )
                        .properties(width=700, height=400, title=chart_title)
                    )
            else:
                x_encoding = alt.X(x, type="nominal", axis=alt.Axis(labelAngle=-30))
                y_encoding = alt.Y(y, type="quantitative", axis=alt.Axis(format="$,.2f" if is_currency else None))
                
                if color_col:
                    color_encoding = alt.Color(
                        color_col,
                        scale=alt.Scale(range=["#4F46E5", "#0D9488", "#64748B", "#F59E0B", "#EF4444", "#3B82F6"]),
                        legend=alt.Legend(title=color_col.replace('_', ' ').title(), orient="top-left")
                    )
                    chart = (
                        alt.Chart(df_plot)
                        .mark_bar()
                        .encode(
                            x=x_encoding,
                            y=y_encoding,
                            color=color_encoding,
                            tooltip=tooltip_encoding
                        )
                        .properties(width=700, height=400, title=chart_title)
                    )
                else:
                    chart = (
                        alt.Chart(df_plot)
                        .mark_bar(color="#4F46E5")
                        .encode(
                            x=x_encoding,
                            y=y_encoding,
                            tooltip=tooltip_encoding
                        )
                        .properties(width=700, height=400, title=chart_title)
                    )

            # Standard premium formatting configurations
            chart = chart.configure_view(
                strokeWidth=0
            ).configure_axis(
                grid=True,
                gridColor="#F1F5F9",
                domain=False,
                tickColor="#F1F5F9",
                labelColor="#64748B",
                titleColor="#475569"
            ).configure_title(
                fontSize=16,
                font="Inter",
                anchor="start",
                color="#1E293B",
                fontWeight="bold",
                dy=-10
            )

            spec = chart.to_dict()

            # Ensure Vega-Lite $schema is always present
            if "$schema" not in spec:
                spec["$schema"] = _VEGA_LITE_SCHEMA

            return spec

        except Exception as e:
            logger.warning("Chart generation failed: %s", e)
            return None