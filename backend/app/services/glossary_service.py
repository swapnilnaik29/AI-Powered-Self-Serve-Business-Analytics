import logging
from typing import List

from sqlalchemy.orm import Session

from app.repositories.glossary_repository import GlossaryRepository

logger = logging.getLogger(__name__)


class GlossaryService:
    def __init__(self, db: Session):
        self.db = db

    def get_definitions_for_query(self, query_text: str) -> List[str]:
        """Extract potential metric terms from the query and return matching glossary definitions."""
        repo = GlossaryRepository(self.db)
        all_entries = repo.get_all()

        if not all_entries:
            return []

        query_lower = query_text.lower()
        matched = []
        for entry in all_entries:
            if entry.term.lower() in query_lower:
                matched.append(f"{entry.term}: {entry.sql_expression}")

        if not matched:
            return [f"{e.term}: {e.sql_expression}" for e in all_entries]

        return matched
