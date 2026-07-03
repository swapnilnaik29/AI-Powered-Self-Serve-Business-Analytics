import logging
from typing import List, Optional

from app.integrations.llm_client import LLMClient

logger = logging.getLogger(__name__)


class HypothesisService:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    def generate(
        self,
        query: str,
        complexity: str,
        schema_columns: Optional[List[str]] = None,
    ) -> List[str]:
        if complexity == "simple":
            return ["Direct computation from data"]

        columns_section = ""
        if schema_columns:
            columns_section = (
                "Available columns/dimensions in the data:\n"
                f"  {', '.join(schema_columns)}\n\n"
                "Ground every hypothesis in one or more of these columns so it "
                "can be directly tested with SQL.\n\n"
            )

        prompt = (
            "You are an analytical hypothesis generator for a banking and transactions analytics platform.\n\n"
            "Given the business question below, generate 3-5 *testable* hypotheses.\n\n"
            "Rules for each hypothesis:\n"
            "  1. Use the 'If X, then Y' format — an explanatory mechanism (X) paired\n"
            "     with a measurable, falsifiable prediction (Y).\n"
            "  2. X should propose a concrete cause or driver (e.g. branch performance,\n"
            "     credit score categories, loan type defaults, transaction category shifts).\n"
            "  3. Y should state an observable outcome that can be verified with a SQL\n"
            "     query on the database tables (e.g. 'the failure rate of transactions in\n"
            "     the current period should be ≥20% higher than the previous period').\n"
            "  4. Do NOT output vague claims or simple restatements of the question.\n\n"
            f"{columns_section}"
            "Return each hypothesis on a new line, prefixed with a dash (-).\n\n"
            f"Question: {query}"
        )

        try:
            content = self.llm.chat(prompt, max_tokens=300)
            hypotheses = [
                h.strip().lstrip("- ").lstrip("•").strip()
                for h in content.split("\n")
                if h.strip() and not h.strip().startswith("#")
            ]
            return hypotheses[:5] if hypotheses else ["Direct computation from data"]
        except Exception as e:
            logger.warning("Hypothesis generation failed: %s", e)
            return ["Direct computation from data"]
