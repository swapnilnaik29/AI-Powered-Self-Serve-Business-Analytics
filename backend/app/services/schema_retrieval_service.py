from __future__ import annotations

import logging
from typing import List

from sqlalchemy.orm import Session

from app.integrations.vector_store import VectorStore
from app.repositories.catalog_repository import CatalogRepository

logger = logging.getLogger(__name__)

_store: VectorStore | None = None


class SchemaRetrievalService:
    """Builds a vector index from the data catalog and retrieves relevant schema context."""

    def __init__(self, db: Session):
        self.db = db
        self._ensure_index()

    def _ensure_index(self) -> None:
        global _store
        if _store is not None and _store.index is not None:
            self.store = _store
            return

        repo = CatalogRepository(self.db)
        entries = repo.get_active()

        if not entries:
            logger.warning("No active catalog entries for RAG index")
            _store = VectorStore()
            self.store = _store
            return

        documents = []
        for entry in entries:
            doc = (
                f"Table: {entry.table_name}, Column: {entry.column_name} "
                f"({entry.data_type}): {entry.description}"
            )
            if entry.sample_values:
                doc += f" | Sample values: {entry.sample_values}"
            documents.append(doc)

        _store = VectorStore()
        _store.build_index(documents)
        self.store = _store

    def retrieve(self, query: str, k: int = 10) -> str:
        # BYPASS VECTOR SEARCH: Inject full schema to ensure LLM has complete join context
        repo = CatalogRepository(self.db)
        entries = repo.get_active()
        
        if not entries:
            return "No schema context available."
            
        documents = []
        for entry in entries:
            doc = (
                f"Table: {entry.table_name}, Column: {entry.column_name} "
                f"({entry.data_type}): {entry.description}"
            )
            if entry.sample_values:
                doc += f" | Sample values: {entry.sample_values}"
            documents.append(doc)
            
        context = "\n".join(documents)
        return context

    @staticmethod
    def invalidate_cache() -> None:
        """Called when catalog is updated to force re-indexing."""
        global _store
        _store = None

    def get_column_names(self) -> List[str]:
        """Return a list of 'table.column' strings for all active catalog entries."""
        repo = CatalogRepository(self.db)
        entries = repo.get_active()
        return [f"{e.table_name}.{e.column_name}" for e in entries]

