from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, desc

from app.models.query_log import QueryLog
from app.repositories.base import BaseRepository


class QueryLogRepository(BaseRepository[QueryLog]):
    def __init__(self, db: Session):
        super().__init__(QueryLog, db)

    def get_by_user(self, user_id: int, skip: int = 0, limit: int = 20) -> List[QueryLog]:
        stmt = (
            select(QueryLog)
            .options(joinedload(QueryLog.user))
            .where(QueryLog.user_id == user_id)
            .order_by(desc(QueryLog.created_at))
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_all_paginated(self, skip: int = 0, limit: int = 20) -> List[QueryLog]:
        stmt = (
            select(QueryLog)
            .options(joinedload(QueryLog.user))
            .order_by(desc(QueryLog.created_at))
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_by_user(self, user_id: int) -> int:
        from sqlalchemy import func

        stmt = select(func.count()).select_from(QueryLog).where(QueryLog.user_id == user_id)
        return self.db.scalar(stmt) or 0

    def count_all(self) -> int:
        from sqlalchemy import func

        stmt = select(func.count()).select_from(QueryLog)
        return self.db.scalar(stmt) or 0

    def get_by_session(self, session_id: str, limit: int = 10) -> List[QueryLog]:
        stmt = (
            select(QueryLog)
            .where(QueryLog.session_id == session_id)
            .order_by(desc(QueryLog.created_at))
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_sessions_by_user(self, user_id: int) -> List[dict]:
        from sqlalchemy import func
        # Group by session_id to retrieve session metadata (count, last activity).
        # We use a database-agnostic approach to support SQLite without complex window functions.
        stmt = (
            select(
                QueryLog.session_id,
                func.count(QueryLog.id).label('query_count'),
                func.max(QueryLog.created_at).label('last_activity')
            )
            .where(QueryLog.user_id == user_id)
            .where(QueryLog.session_id.isnot(None))
            .group_by(QueryLog.session_id)
            .order_by(desc('last_activity'))
            .limit(50)
        )
        results = self.db.execute(stmt).all()
        
        sessions = []
        for r in results:
            session_id = r.session_id
            # Fetch the first query (oldest) for this session to use as a title
            first_q_stmt = (
                select(QueryLog.natural_language_query)
                .where(QueryLog.session_id == session_id)
                .order_by(QueryLog.created_at)
                .limit(1)
            )
            first_query = self.db.scalar(first_q_stmt) or "New Chat"
            
            sessions.append({
                "session_id": session_id,
                "query_count": r.query_count,
                "first_query": first_query,
                "last_activity": r.last_activity
            })
            
        return sessions

    def get_by_session_full(self, session_id: str, user_id: int) -> List[QueryLog]:
        stmt = (
            select(QueryLog)
            .where(QueryLog.session_id == session_id)
            .where(QueryLog.user_id == user_id)
            .order_by(QueryLog.created_at) # Oldest first, like a chat log
        )
        return list(self.db.scalars(stmt).all())

    def get_by_session_full_admin(self, session_id: str) -> List[QueryLog]:
        """Admin-only: fetch all messages in a session regardless of user_id."""
        stmt = (
            select(QueryLog)
            .where(QueryLog.session_id == session_id)
            .order_by(QueryLog.created_at)
        )
        return list(self.db.scalars(stmt).all())

    def delete_session(self, session_id: str, user_id: Optional[int] = None) -> bool:
        """Delete all QueryLog rows for a session. Pass user_id=None for admin (no ownership check)."""
        from sqlalchemy import delete as sql_delete
        from app.models.feedback import Feedback

        stmt = select(QueryLog).where(QueryLog.session_id == session_id)
        if user_id is not None:
            stmt = stmt.where(QueryLog.user_id == user_id)
        logs = list(self.db.scalars(stmt).all())
        if not logs:
            return False
        # Delete related feedback first to avoid FK constraint errors
        log_ids = [log.id for log in logs]
        self.db.execute(sql_delete(Feedback).where(Feedback.query_log_id.in_(log_ids)))
        for log in logs:
            self.db.delete(log)
        self.db.commit()
        return True
