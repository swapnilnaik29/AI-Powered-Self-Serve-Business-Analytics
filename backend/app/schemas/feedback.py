from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class FeedbackRequest(BaseModel):
    rating: str = Field(pattern=r"^(up|down)$")
    corrected_sql: Optional[str] = None
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: int
    query_log_id: int
    user_id: int
    rating: str
    corrected_sql: Optional[str] = None
    comment: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class FeedbackExportItem(BaseModel):
    query: str
    generated_sql: str
    corrected_sql: Optional[str] = None
    rating: str
    comment: Optional[str] = None
