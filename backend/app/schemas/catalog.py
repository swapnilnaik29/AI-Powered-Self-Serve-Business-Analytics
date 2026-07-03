from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class CatalogCreateRequest(BaseModel):
    table_name: str = Field(min_length=1, max_length=255)
    column_name: str = Field(min_length=1, max_length=255)
    data_type: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1)
    sample_values: Optional[List[Any]] = None
    is_pii: bool = False


class CatalogUpdateRequest(BaseModel):
    description: Optional[str] = None
    sample_values: Optional[List[Any]] = None
    is_pii: Optional[bool] = None
    is_active: Optional[bool] = None


class CatalogResponse(BaseModel):
    id: int
    table_name: str
    column_name: str
    data_type: str
    description: str
    sample_values: Optional[List[Any]] = None
    is_pii: bool
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
