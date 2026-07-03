import json
import logging
from typing import List, Optional

from app.integrations.llm_client import LLMClient

logger = logging.getLogger(__name__)


class FollowupService:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    def suggest(
        self, query: str, answer: str, available_columns: Optional[List[str]] = None
    ) -> List[str]:
        columns_section = ""
        if available_columns:
            columns_section = (
                "Available dimensions/columns in the data:\n"
                f"  {', '.join(available_columns)}\n\n"
                "IMPORTANT: ONLY suggest follow-up questions that reference "
                "dimensions available in the list above. Do NOT invent or "
                "assume columns that are not listed.\n\n"
            )

        prompt = (
            "You are a business analytics assistant.\n\n"
            f"{columns_section}"
            "Based on the user's question and the answer they received, suggest "
            "3-5 specific, actionable follow-up questions they might want to "
            "explore next. Each question should be concrete enough to directly "
            "translate into a data query.\n\n"
            "Return ONLY a JSON array of strings.\n\n"
            f"Original question: {query}\n"
            f"Answer summary: {answer[:300]}"
        )

        try:
            content = self.llm.chat(prompt, json_mode=True, max_tokens=300)
            parsed = json.loads(content)
            if isinstance(parsed, list):
                return [str(s) for s in parsed[:5]]
            if isinstance(parsed, dict):
                for v in parsed.values():
                    if isinstance(v, list):
                        return [str(s) for s in v[:5]]
            return []
        except Exception as e:
            logger.warning("Follow-up suggestion failed: %s", e)
            return []
