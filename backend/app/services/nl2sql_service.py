from __future__ import annotations

import logging
import re
from typing import List, Optional
from datetime import datetime

from app.integrations.llm_client import LLMClient
from app.core.exceptions import UnsafeSQLException
from app.core.prompts import NL2SQL_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)

UNSAFE_KEYWORDS = {"delete", "update", "insert", "drop", "alter", "truncate", "create", "grant", "revoke"}


class NL2SQLService:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    def generate(
        self,
        query: str,
        schema_context: str,
        glossary_definitions: List[str] | None = None,
        context_block: str = "",
        parsed_intent: Optional[dict] = None,
    ) -> tuple[str, str]:

        glossary_block = ""
        if glossary_definitions:
            glossary_block = (
                "\nBusiness Glossary:\n"
                + "\n".join(f"- {d}" for d in glossary_definitions)
                + "\n"
            )

        query_intent = self._format_intent(parsed_intent)

        prompt = NL2SQL_PROMPT_TEMPLATE.format(
            schema_context=schema_context,
            glossary_block=glossary_block,
            query=query,
            current_date=datetime.now().strftime("%Y-%m-%d"),
            context_block=context_block,
            query_intent=query_intent,
        )

        raw_response = self.llm.chat(prompt, max_tokens=500, temperature=0)
        sql, explanation = self._parse_json_response(raw_response)
        self._validate_safety(sql)

        return sql, explanation

    def _format_intent(self, parsed_intent: Optional[dict]) -> str:
        """Format the parsed query intent as a structured hint block for the NL2SQL prompt."""
        if not parsed_intent:
            return ""

        query_type = parsed_intent.get("query_type", "scalar")
        group_by = parsed_intent.get("group_by", "none")
        time_granularity = parsed_intent.get("time_granularity", "none")
        limit = parsed_intent.get("limit", 0)
        comparison = parsed_intent.get("comparison", "no")

        lines = [
            "\nQUERY INTENT (use these hints to guide your SQL structure):",
            f"- Query Type: {query_type}",
        ]

        if query_type == "grouped" or query_type == "distribution":
            lines.append(f"- Group By: {group_by}")
            lines.append("- IMPORTANT: You MUST use GROUP BY in the SQL. Do NOT return a single scalar value.")
        elif query_type == "trend":
            granularity = time_granularity if time_granularity != "none" else "day"
            lines.append(f"- Time Granularity: {granularity}")
            lines.append("- IMPORTANT: You MUST use GROUP BY with DATE_TRUNC and ORDER BY time ASC. Return multiple rows.")
        elif query_type == "ranking":
            lines.append(f"- Limit: {limit if limit > 0 else 10}")
            lines.append("- IMPORTANT: You MUST use ORDER BY and LIMIT. Return ranked rows.")
        elif query_type == "comparison":
            lines.append("- IMPORTANT: Compare two periods or categories. Return data for both sides of the comparison.")

        if time_granularity != "none" and query_type not in ("trend",):
            lines.append(f"- Time Granularity: {time_granularity}")

        if comparison == "yes" and query_type != "comparison":
            lines.append("- Note: User is asking for a comparison. Include comparative data.")

        lines.append("")
        return "\n".join(lines)

    def _parse_json_response(self, raw_text: str) -> tuple[str, str]:
        import json
        text = raw_text.replace("```json", "").replace("```", "").strip()
        try:
            data = json.loads(text)
            return data.get("sql", ""), data.get("explanation", "No explanation provided.")
        except Exception as e:
            logger.warning(f"Failed to parse LLM JSON response: {e}. Falling back to raw text.")
            return raw_text, "Failed to generate an explanation."

    def _validate_safety(self, sql: str) -> None:
        sql_upper = sql.upper().strip()
        
        # Enforce SELECT-only queries
        if not (sql_upper.startswith("SELECT") or sql_upper.startswith("WITH")):
            raise UnsafeSQLException("Security Alert: Only read-only (SELECT) queries are permitted. Modifying the database is blocked.")
            
        # Block multi-statement queries
        if ";" in sql and len([s for s in sql.split(";") if s.strip()]) > 1:
            raise UnsafeSQLException("Security Alert: Multiple SQL statements are not permitted to prevent injection attacks.")

        tokens = set(re.findall(r'\b\w+\b', sql.lower()))
        violations = tokens & UNSAFE_KEYWORDS
        if violations:
            violation_list = ", ".join(v.upper() for v in violations)
            raise UnsafeSQLException(f"Security Alert: The generated query contained forbidden destructive keywords ({violation_list}).")