from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.feedback import Feedback
from app.repositories.base import BaseRepository


class FeedbackRepository(BaseRepository[Feedback]):
    def __init__(self, db: Session):
        super().__init__(Feedback, db)

    def get_by_query_log(self, query_log_id: int) -> Optional[Feedback]:
        stmt = select(Feedback).where(Feedback.query_log_id == query_log_id)
        return self.db.scalars(stmt).first()

    def get_all_with_details(self, skip: int = 0, limit: int = 100) -> List[Feedback]:
        stmt = select(Feedback).order_by(Feedback.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())
