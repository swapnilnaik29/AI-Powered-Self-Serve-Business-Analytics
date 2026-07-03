from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.business_glossary import BusinessGlossary
from app.repositories.base import BaseRepository


class GlossaryRepository(BaseRepository[BusinessGlossary]):
    def __init__(self, db: Session):
        super().__init__(BusinessGlossary, db)

    def get_by_term(self, term: str) -> Optional[BusinessGlossary]:
        stmt = select(BusinessGlossary).where(BusinessGlossary.term == term)
        return self.db.scalars(stmt).first()

    def search_by_terms(self, terms: List[str]) -> List[BusinessGlossary]:
        """Find glossary entries matching any of the given terms (case-insensitive)."""
        from sqlalchemy import func

        lower_terms = [t.lower() for t in terms]
        stmt = select(BusinessGlossary).where(
            func.lower(BusinessGlossary.term).in_(lower_terms)
        )
        return list(self.db.scalars(stmt).all())
