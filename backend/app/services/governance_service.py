import logging
import re
from typing import List

from sqlalchemy.orm import Session

from app.repositories.governance_repository import GovernanceRepository
from app.repositories.catalog_repository import CatalogRepository

logger = logging.getLogger(__name__)


class GovernanceService:
    def __init__(self, db: Session):
        self.db = db

    def mask_pii_in_context(self, schema_context: str, user_role: str) -> str:
        """Remove PII column references from schema context for non-admin users."""
        if user_role == "admin":
            return schema_context

        pii_columns = self._get_pii_column_names()
        if not pii_columns:
            return schema_context

        lines = schema_context.split("\n")
        filtered = []
        for line in lines:
            line_lower = line.lower()
            if any(col.lower() in line_lower for col in pii_columns):
                continue
            filtered.append(line)

        return "\n".join(filtered)

    def check_table_access(self, table_name: str, user_role: str) -> bool:
        """Check if a given role has access to a table based on RBAC rules."""
        repo = GovernanceRepository(self.db)
        rules = repo.get_rules_for_role(user_role)

        deny_rules = [
            r for r in rules
            if r.rule_type == "rbac" and r.table_name == table_name
        ]

        return len(deny_rules) == 0

    def get_row_filters(self, table_name: str, user_role: str) -> List[str]:
        """Get row-level filter conditions for a given table and role."""
        repo = GovernanceRepository(self.db)
        rules = repo.get_rules_for_role(user_role)

        filters = []
        for r in rules:
            if r.rule_type == "row_filter" and r.table_name == table_name and r.condition:
                filters.append(r.condition)

        return filters

    def get_masked_columns(self, table_name: str, user_role: str) -> List[str]:
        """Get columns that should be masked for a given role."""
        if user_role == "admin":
            return []

        repo = GovernanceRepository(self.db)
        rules = repo.get_pii_rules()

        masked = []
        for r in rules:
            if r.table_name == table_name and r.column_name:
                masked.append(r.column_name)

        return masked

    def _get_pii_column_names(self) -> List[str]:
        repo = CatalogRepository(self.db)
        pii_entries = repo.get_pii_columns()
        return [e.column_name for e in pii_entries]
