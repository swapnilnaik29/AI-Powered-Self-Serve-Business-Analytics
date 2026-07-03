from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class GovernanceRuleCreateRequest(BaseModel):
    rule_type: str = Field(pattern=r"^(rbac|pii_mask|row_filter)$")
    role: Optional[str] = None
    table_name: str = Field(min_length=1, max_length=255)
    column_name: Optional[str] = None
    condition: Optional[str] = None


class GovernanceRuleUpdateRequest(BaseModel):
    rule_type: Optional[str] = None
    role: Optional[str] = None
    table_name: Optional[str] = None
    column_name: Optional[str] = None
    condition: Optional[str] = None
    is_active: Optional[bool] = None


class GovernanceRuleResponse(BaseModel):
    id: int
    rule_type: str
    role: Optional[str] = None
    table_name: str
    column_name: Optional[str] = None
    condition: Optional[str] = None
    is_active: bool
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
