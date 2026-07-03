import logging
from typing import Optional
from datetime import datetime

import pandas as pd

from app.integrations.llm_client import LLMClient
from app.core.prompts import (
    ANSWER_SYNTHESIS_SCALAR_PROMPT,
    ANSWER_SYNTHESIS_COMPARISON_PROMPT,
    ANSWER_SYNTHESIS_GROUPED_PROMPT,
    ANSWER_SYNTHESIS_NO_DATA_PROMPT
)

logger = logging.getLogger(__name__)


class AnswerSynthesisService:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    def synthesize(
        self,
        query: str,
        result_df: Optional[pd.DataFrame],
        insight_data: Optional[dict] = None,
        query_intent: Optional[dict] = None,
    ) -> str:
        anomaly_text = self.detect_anomalies(result_df)

        if result_df is None or result_df.empty:
            prompt = ANSWER_SYNTHESIS_NO_DATA_PROMPT.format(query=query)
        elif len(result_df) == 1 and pd.isna(result_df.iloc[0, 0]):
            prompt = ANSWER_SYNTHESIS_NO_DATA_PROMPT.format(query=query)
        else:
            query_type = query_intent.get("query_type", "scalar") if query_intent else "scalar"
            
            # If the user intent indicates trend/grouped/distribution/ranking, or we have multiple rows
            # and a date/group breakdown column, route to grouped synthesis prompt.
            if query_type in ("trend", "grouped", "distribution", "ranking") or len(result_df) > 1:
                stats_summary = self._compute_stats_summary(result_df)
                data_str = result_df.head(50).to_string(index=False)
                prompt = ANSWER_SYNTHESIS_GROUPED_PROMPT.format(
                    query=query,
                    stats_summary=stats_summary,
                    data_str=data_str,
                    current_date=datetime.now().strftime("%Y-%m-%d")
                )
            elif query_type == "comparison" or (insight_data and len(result_df) > 1):
                # Ensure we format the values with $ if they are currency
                is_currency = False
                val_col = result_df.columns[-1]
                for col in result_df.columns:
                    if col.lower() in ("revenue", "value", "amount", "price"):
                        is_currency = True
                        break
                
                curr_val = insight_data.get('current', 0) if insight_data else 0
                prev_val = insight_data.get('previous', 0) if insight_data else 0
                change_pct = insight_data.get('change_pct', 0) if insight_data else 0
                
                curr_str = f"${curr_val:,.2f}" if is_currency else f"{curr_val}"
                prev_str = f"${prev_val:,.2f}" if is_currency else f"{prev_val}"
                
                prompt = ANSWER_SYNTHESIS_COMPARISON_PROMPT.format(
                    query=query,
                    current_value=curr_str,
                    previous_value=prev_str,
                    change_pct=change_pct,
                    current_date=datetime.now().strftime("%Y-%m-%d")
                )
            else:
                # Single scalar value
                val = result_df.iloc[0, 0]
                val_col = result_df.columns[0]
                is_currency = any(kw in val_col.lower() for kw in ("revenue", "amount", "value", "price"))
                
                if isinstance(val, (int, float)):
                    val_str = f"${val:,.2f}" if is_currency else f"{val:,.2f}" if isinstance(val, float) else f"{val:,}"
                else:
                    val_str = str(val)
                    
                prompt = ANSWER_SYNTHESIS_SCALAR_PROMPT.format(
                    query=query,
                    value_str=val_str,
                    current_date=datetime.now().strftime("%Y-%m-%d")
                )
            
        if anomaly_text:
            prompt += f"\n\nAlso include this important note in your response: {anomaly_text}"

        try:
            return self.llm.chat(prompt, max_tokens=250)
        except Exception as e:
            logger.warning("Answer synthesis failed: %s", e)
            return "Unable to generate a natural language answer at this time."

    def _compute_stats_summary(self, df: pd.DataFrame) -> str:
        if df.empty or len(df.columns) < 2:
            return "No metrics to summarize."
        
        # Identify group and metric columns
        group_col = df.columns[0]
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        if not numeric_cols:
            return "No numeric columns found for statistics."
            
        # Prefer a metric-like column name
        val_col = None
        for col in numeric_cols:
            if col.lower() in ("revenue", "value", "total", "amount", "count", "transactions"):
                val_col = col
                break
        if not val_col:
            val_col = numeric_cols[0]
            
        try:
            # Drop NaN rows for stats computation
            clean_df = df.dropna(subset=[val_col]).copy()
            if clean_df.empty:
                return "No valid numeric data to summarize."
                
            mean_val = clean_df[val_col].mean()
            max_idx = clean_df[val_col].idxmax()
            min_idx = clean_df[val_col].idxmin()
            
            peak_val = clean_df.loc[max_idx, val_col]
            peak_group = clean_df.loc[max_idx, group_col]
            if pd.api.types.is_datetime64_any_dtype(df[group_col]) or isinstance(peak_group, pd.Timestamp):
                peak_group = peak_group.strftime("%B %d, %Y")
            else:
                peak_group = str(peak_group)
                
            trough_val = clean_df.loc[min_idx, val_col]
            trough_group = clean_df.loc[min_idx, group_col]
            if pd.api.types.is_datetime64_any_dtype(df[group_col]) or isinstance(trough_group, pd.Timestamp):
                trough_group = trough_group.strftime("%B %d, %Y")
            else:
                trough_group = str(trough_group)
                
            # Formatting helpers
            is_currency = any(kw in val_col.lower() for kw in ("revenue", "amount", "value", "price"))
            fmt = lambda v: f"${v:,.2f}" if is_currency else f"{v:,.2f}" if isinstance(v, float) else f"{v:,}"
            
            summary = [
                f"- Average {val_col}: {fmt(mean_val)}",
                f"- Peak (Highest): {fmt(peak_val)} on {peak_group}",
                f"- Trough (Lowest): {fmt(trough_val)} on {trough_group}",
                f"- Count of intervals/groups: {len(clean_df)}"
            ]
            
            # Simple trend slope check for time series
            if len(clean_df) >= 2:
                try:
                    df_sorted = clean_df.sort_values(by=group_col)
                    first_val = df_sorted.iloc[0][val_col]
                    last_val = df_sorted.iloc[-1][val_col]
                    diff_pct = ((last_val - first_val) / first_val * 100) if first_val != 0 else 0
                    direction = "increase" if diff_pct > 0 else "decrease"
                    summary.append(f"- Overall Trend: {fmt(first_val)} at start vs {fmt(last_val)} at end ({direction} of {abs(diff_pct):.1f}%)")
                except Exception:
                    pass
                    
            return "\n".join(summary)
        except Exception as e:
            logger.warning(f"Error computing stats summary: {e}")
            return "Unable to compute detailed summary statistics."

    @staticmethod
    def detect_anomalies(df: Optional[pd.DataFrame]) -> str:
        if df is None or df.empty:
            return ""
        
        anomalies = []
        for col in df.columns:
            null_count = df[col].isnull().sum()
            if null_count > 0:
                null_pct = null_count / len(df)
                if null_pct > 0.2:
                    anomalies.append(f"Column '{col}' has {null_pct*100:.0f}% missing values.")

        for col in df.select_dtypes(include=['number']).columns:
            if not df[col].isnull().all() and len(df) > 2:
                mean = df[col].mean()
                std = df[col].std()
                if std > 0:
                    z_scores = (df[col] - mean) / std
                    outliers = df[z_scores.abs() > 3]
                    if not outliers.empty:
                        anomalies.append(f"Column '{col}' contains {len(outliers)} unusual outlier(s).")
                        
        if anomalies:
            return " ".join(anomalies)
        return ""

    @staticmethod
    def compute_insight(df: Optional[pd.DataFrame]) -> Optional[dict]:
        if df is None or len(df) < 2:
            return None

        cols = df.columns.tolist()
        value_col = None
        for col in cols:
            if col.lower() in ("revenue", "value", "total", "amount", "count"):
                value_col = col
                break
        if value_col is None:
            value_col = cols[-1]

        try:
            current = float(df.iloc[0][value_col])
            previous = float(df.iloc[1][value_col])
            change_pct = ((current - previous) / previous * 100) if previous != 0 else 0
            return {
                "current": current,
                "previous": previous,
                "change_pct": round(change_pct, 2),
            }
        except (ValueError, TypeError, KeyError):
            return None
