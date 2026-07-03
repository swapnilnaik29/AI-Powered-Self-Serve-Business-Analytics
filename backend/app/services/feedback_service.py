import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.models.feedback import Feedback
from app.repositories.feedback_repository import FeedbackRepository

logger = logging.getLogger(__name__)


class FeedbackService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_query(self, query_log_id: int) -> Optional[Feedback]:
        repo = FeedbackRepository(self.db)
        return repo.get_by_query_log(query_log_id)
