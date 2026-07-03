import json
import logging

from app.integrations.llm_client import LLMClient

logger = logging.getLogger(__name__)

DEFAULT_PARSED = {
    "complexity": "simple",
    "metric": "revenue",
    "time_filter": "none",
    "comparison": "no",
    "query_type": "scalar",
    "group_by": "none",
    "time_granularity": "none",
    "limit": 0,
}


class QueryUnderstandingService:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    def parse(self, query: str) -> dict:
        prompt = (
            "You are a query understanding engine for a payments analytics system.\n"
            "Extract structured information from the user's natural language query.\n\n"
            "Return ONLY valid JSON with these fields:\n"
            '{\n'
            '  "complexity": "simple" or "complex",\n'
            '  "metric": "revenue" | "transactions" | "avg_value" | "failures" | "success_rate",\n'
            '  "time_filter": "7d" | "30d" | "monthly" | "quarterly" | "yearly" | "none",\n'
            '  "comparison": "yes" or "no",\n'
            '  "entities": ["list", "of", "key", "entities"],\n'
            '  "query_type": "scalar" | "grouped" | "ranking" | "comparison" | "trend" | "distribution",\n'
            '  "group_by": "day" | "week" | "month" | "quarter" | "year" | "country" | "payment_method" | "status" | "subscription_tier" | "industry" | "none",\n'
            '  "time_granularity": "day" | "week" | "month" | "quarter" | "year" | "none",\n'
            '  "limit": 0\n'
            '}\n\n'
            'CLASSIFICATION RULES:\n'
            '- query_type="trend": user asks for trend, "over time", daily/weekly/monthly pattern, growth, "each day", "daily", "by day"\n'
            '- query_type="grouped": user asks for breakdown, "by X", "for each", "per", distribution\n'
            '- query_type="ranking": user asks for "top N", "bottom N", "highest", "lowest", "most", "least"\n'
            '- query_type="comparison": user asks to "compare", "versus", "vs", "difference between"\n'
            '- query_type="distribution": user asks for share, proportion, percentage breakdown across categories\n'
            '- query_type="scalar": user asks for a single total, count, or aggregate with no grouping\n'
            '- group_by: the dimension to group by. Use "day"/"week"/"month" for time grouping, or a column name for categorical grouping\n'
            '- time_granularity: the time granularity if time-based. Should match group_by when group_by is a time unit\n'
            '- limit: set to N for "top N" or "bottom N" queries, otherwise 0\n'
            '- comparison="yes": if comparing two time periods or two categories\n\n'
            f"Query: {query}"
        )

        try:
            content = self.llm.chat(prompt, json_mode=True, max_tokens=300)
            parsed = json.loads(content)

            if "why" in query.lower() or "reason" in query.lower():
                parsed["complexity"] = "complex"

            # Ensure all expected fields exist with defaults
            for key, default in DEFAULT_PARSED.items():
                if key not in parsed:
                    parsed[key] = default

            # Deterministic overrides for intelligence rules
            query_lower = query.lower()
            if any(k in query_lower for k in ["each day", "daily", "by day"]):
                parsed["query_type"] = "trend"
                parsed["group_by"] = "day"
                parsed["time_granularity"] = "day"
            elif any(k in query_lower for k in ["trend", "over time"]):
                parsed["query_type"] = "trend"
            
            if any(k in query_lower for k in ["compare", "vs"]):
                parsed["query_type"] = "comparison"
                parsed["comparison"] = "yes"
            elif any(k in query_lower for k in ["top", "bottom"]):
                parsed["query_type"] = "ranking"
            elif any(k in query_lower for k in ["distribution", "share"]):
                parsed["query_type"] = "distribution"

            return parsed
        except (json.JSONDecodeError, Exception) as e:
            logger.warning("Query understanding fallback triggered: %s", e)
            return {**DEFAULT_PARSED}
