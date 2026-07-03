from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json
import io

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.user import User
from app.models.feedback import Feedback
from app.repositories.feedback_repository import FeedbackRepository
from app.repositories.query_log_repository import QueryLogRepository
from app.schemas.feedback import FeedbackRequest, FeedbackResponse

router = APIRouter()


@router.post("/queries/{query_id}/feedback", response_model=FeedbackResponse, status_code=201)
def submit_feedback(
    query_id: int,
    body: FeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    qlog_repo = QueryLogRepository(db)
    log = qlog_repo.get_by_id(query_id)
    if log is None or log.user_id != current_user.id:
        raise NotFoundException("Query not found")

    fb_repo = FeedbackRepository(db)
    existing = fb_repo.get_by_query_log(query_id)
    if existing:
        raise BadRequestException("Feedback already submitted for this query")

    fb = Feedback(
        query_log_id=query_id,
        user_id=current_user.id,
        rating=body.rating,
        corrected_sql=body.corrected_sql,
        comment=body.comment,
    )
    return fb_repo.create(fb)


@router.get("/feedback/export")
def export_feedback(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    fb_repo = FeedbackRepository(db)
    qlog_repo = QueryLogRepository(db)
    all_fb = fb_repo.get_all_with_details()

    lines = []
    for fb in all_fb:
        log = qlog_repo.get_by_id(fb.query_log_id)
        record = {
            "query": log.natural_language_query if log else "",
            "generated_sql": log.generated_sql if log else "",
            "corrected_sql": fb.corrected_sql,
            "rating": fb.rating,
            "comment": fb.comment,
        }
        lines.append(json.dumps(record))

    content = "\n".join(lines)
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/jsonl",
        headers={"Content-Disposition": "attachment; filename=feedback_export.jsonl"},
    )
