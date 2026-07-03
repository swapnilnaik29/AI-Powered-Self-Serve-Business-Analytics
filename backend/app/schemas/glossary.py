from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class GlossaryCreateRequest(BaseModel):
    term: str = Field(min_length=1, max_length=255)
    definition: str = Field(min_length=1)
    sql_expression: str = Field(min_length=1)
    category: Optional[str] = None


class GlossaryUpdateRequest(BaseModel):
    term: Optional[str] = None
    definition: Optional[str] = None
    sql_expression: Optional[str] = None
    category: Optional[str] = None


class GlossaryResponse(BaseModel):
    id: int
    term: str
    definition: str
    sql_expression: str
    category: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
