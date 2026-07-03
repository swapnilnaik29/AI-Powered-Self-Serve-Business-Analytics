from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.repositories.query_log_repository import QueryLogRepository
from app.schemas.query import QueryRequest, QueryResponse, QueryHistoryItem, SessionSummary, ChatMessage, HypothesisResult
from app.schemas.common import PaginatedResponse
from app.services.pipeline_service import PipelineService

router = APIRouter()


@router.post("", response_model=QueryResponse)
def submit_query(
    body: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = PipelineService(db, current_user)
    return service.run(body.query, session_id=body.session_id)


@router.get("/sessions", response_model=List[SessionSummary])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = QueryLogRepository(db)
    sessions = repo.get_sessions_by_user(current_user.id)
    return [SessionSummary(**s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=List[ChatMessage])
def get_session_chat(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = QueryLogRepository(db)
    # Admin can view any session; regular users only their own
    if current_user.role == "admin":
        logs = repo.get_by_session_full_admin(session_id)
    else:
        logs = repo.get_by_session_full(session_id, current_user.id)
    
    if not logs:
        raise NotFoundException("Session not found or access denied")
        
    return [
        ChatMessage(
            id=log.id,
            query=log.natural_language_query,
            answer=log.answer_text or "",
            created_at=log.created_at,
            chart=log.chart_spec,
            sql=log.generated_sql,
            confidence=log.confidence_score or 0.0,
            hypotheses=[
                HypothesisResult(**h) if isinstance(h, dict) else HypothesisResult(hypothesis=str(h))
                for h in (log.hypotheses or [])
            ],
            best_hypothesis=(
                HypothesisResult(**log.best_hypothesis)
                if isinstance(log.best_hypothesis, dict)
                else None
            ),
            follow_up_suggestions=log.follow_up_suggestions or [],
        ) for log in logs
    ]


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = QueryLogRepository(db)
    deleted = repo.delete_session(
        session_id,
        user_id=None if current_user.role == "admin" else current_user.id,
    )
    if not deleted:
        raise NotFoundException("Session not found or access denied")


@router.get("", response_model=PaginatedResponse[QueryHistoryItem])
def list_queries(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = QueryLogRepository(db)
    skip = (page - 1) * page_size
    
    if current_user.role == "admin":
        items = repo.get_all_paginated(skip=skip, limit=page_size)
        total = repo.count_all()
    else:
        items = repo.get_by_user(current_user.id, skip=skip, limit=page_size)
        total = repo.count_by_user(current_user.id)
        
    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=[QueryHistoryItem(
            id=i.id,
            natural_language_query=i.natural_language_query,
            answer_text=i.answer_text,
            confidence_score=i.confidence_score,
            created_at=i.created_at,
            user_email=i.user.email if i.user else None
        ) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{query_id}", response_model=QueryResponse)
def get_query(
    query_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = QueryLogRepository(db)
    log = repo.get_by_id(query_id)
    
    if log is None:
        raise NotFoundException("Query not found")
        
    if log.user_id != current_user.id and current_user.role != "admin":
        raise NotFoundException("Query not found")

    return QueryResponse(
        id=log.id,
        answer=log.answer_text or "",
        sql=log.generated_sql,
        data=log.result_summary.get("data", []) if log.result_summary else [],
        hypotheses=log.hypotheses or [],
        best_hypothesis=log.best_hypothesis,
        confidence=log.confidence_score or 0.0,
        confidence_reason=log.confidence_reason,
        chart=log.chart_spec,
        follow_up_suggestions=log.follow_up_suggestions or [],
        provenance=log.provenance,
        latency_ms=log.latency_ms,
        created_at=log.created_at,
    )
