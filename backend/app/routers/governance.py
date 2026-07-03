from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.models.governance_rule import GovernanceRule
from app.repositories.governance_repository import GovernanceRepository
from app.schemas.governance import (
    GovernanceRuleCreateRequest,
    GovernanceRuleUpdateRequest,
    GovernanceRuleResponse,
)

router = APIRouter()


@router.get("/rules", response_model=List[GovernanceRuleResponse])
def list_rules(
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = GovernanceRepository(db)
    return repo.get_active_rules()


@router.post("/rules", response_model=GovernanceRuleResponse, status_code=201)
def create_rule(
    body: GovernanceRuleCreateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    repo = GovernanceRepository(db)
    rule = GovernanceRule(
        rule_type=body.rule_type,
        role=body.role,
        table_name=body.table_name,
        column_name=body.column_name,
        condition=body.condition,
        created_by=admin.id,
    )
    return repo.create(rule)


@router.put("/rules/{rule_id}", response_model=GovernanceRuleResponse)
def update_rule(
    rule_id: int,
    body: GovernanceRuleUpdateRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    repo = GovernanceRepository(db)
    rule = repo.get_by_id(rule_id)
    if rule is None:
        raise NotFoundException("Governance rule not found")

    return repo.update(rule, body.model_dump(exclude_unset=True))


@router.delete("/rules/{rule_id}", status_code=204)
def delete_rule(
    rule_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    repo = GovernanceRepository(db)
    rule = repo.get_by_id(rule_id)
    if rule is None:
        raise NotFoundException("Governance rule not found")
    repo.delete(rule)
