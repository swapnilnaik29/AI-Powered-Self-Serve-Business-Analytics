import logging
import sqlite3
from typing import List

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.data_catalog import DataCatalog
from app.repositories.catalog_repository import CatalogRepository
from app.services.schema_retrieval_service import SchemaRetrievalService

logger = logging.getLogger(__name__)


class CatalogService:
    def __init__(self, db: Session):
        self.db = db

    def sync_from_database(self) -> int:
        """Auto-discover schema from the payments SQLite database and sync to catalog."""
        settings = get_settings()
        repo = CatalogRepository(self.db)

        try:
            conn = sqlite3.connect(settings.payments_db_path)
            cursor = conn.cursor()

            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall()]

            count = 0
            for table in tables:
                cursor.execute(f"PRAGMA table_info({table});")
                columns = cursor.fetchall()

                for col in columns:
                    col_name = col[1]
                    col_type = col[2] or "TEXT"

                    existing = [
                        e for e in repo.get_by_table(table)
                        if e.column_name == col_name
                    ]

                    if not existing:
                        entry = DataCatalog(
                            table_name=table,
                            column_name=col_name,
                            data_type=col_type,
                            description=f"Column '{col_name}' in table '{table}' (auto-discovered)",
                        )
                        repo.create(entry)
                        count += 1

            conn.close()

            SchemaRetrievalService.invalidate_cache()
            logger.info("Synced %d new columns from database", count)
            return count

        except Exception as e:
            logger.error("Database sync failed: %s", e)
            raise
