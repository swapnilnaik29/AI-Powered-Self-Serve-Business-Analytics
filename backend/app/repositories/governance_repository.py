from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.governance_rule import GovernanceRule
from app.repositories.base import BaseRepository


class GovernanceRepository(BaseRepository[GovernanceRule]):
    def __init__(self, db: Session):
        super().__init__(GovernanceRule, db)

    def get_active_rules(self) -> List[GovernanceRule]:
        stmt = select(GovernanceRule).where(GovernanceRule.is_active == True)
        return list(self.db.scalars(stmt).all())

    def get_rules_for_role(self, role: str) -> List[GovernanceRule]:
        stmt = select(GovernanceRule).where(
            GovernanceRule.is_active == True,
            (GovernanceRule.role == role) | (GovernanceRule.role == None),
        )
        return list(self.db.scalars(stmt).all())

    def get_pii_rules(self) -> List[GovernanceRule]:
        stmt = select(GovernanceRule).where(
            GovernanceRule.rule_type == "pii_mask",
            GovernanceRule.is_active == True,
        )
        return list(self.db.scalars(stmt).all())
