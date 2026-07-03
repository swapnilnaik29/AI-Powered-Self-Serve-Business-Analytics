from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_analyst_or_admin
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.repositories.query_log_repository import QueryLogRepository
from app.services.export_service import ExportService

router = APIRouter()


@router.get("/queries/{query_id}/export")
def export_query(
    query_id: int,
    format: str = Query(pattern=r"^(pdf|excel|html)$"),
    current_user: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
):
    repo = QueryLogRepository(db)
    log = repo.get_by_id(query_id)
    if log is None or log.user_id != current_user.id:
        raise NotFoundException("Query not found")

    service = ExportService()

    if format == "pdf":
        content, media_type, filename = service.export_pdf(log)
    elif format == "excel":
        content, media_type, filename = service.export_excel(log)
    else:
        content, media_type, filename = service.export_html(log)

    return StreamingResponse(
        content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
