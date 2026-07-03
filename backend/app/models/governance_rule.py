from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, Boolean, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class GovernanceRule(Base):
    __tablename__ = "governance_rules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    rule_type: Mapped[str] = mapped_column(String(50), nullable=False)  # rbac | pii_mask | row_filter
    role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    table_name: Mapped[str] = mapped_column(String(255), nullable=False)
    column_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    condition: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
