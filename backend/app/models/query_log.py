from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Float, Integer, Text, ForeignKey, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class QueryLog(Base):
    __tablename__ = "query_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)

    natural_language_query: Mapped[str] = mapped_column(Text, nullable=False)
    generated_sql: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parsed_intent: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    hypotheses: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    best_hypothesis: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    result_summary: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    chart_spec: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    answer_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    follow_up_suggestions: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    provenance: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    llm_tokens_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="query_logs")
    feedback = relationship("Feedback", back_populates="query_log", uselist=False)
