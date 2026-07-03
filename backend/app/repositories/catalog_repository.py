from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.data_catalog import DataCatalog
from app.repositories.base import BaseRepository


class CatalogRepository(BaseRepository[DataCatalog]):
    def __init__(self, db: Session):
        super().__init__(DataCatalog, db)

    def get_active(self) -> List[DataCatalog]:
        stmt = select(DataCatalog).where(DataCatalog.is_active == True)
        return list(self.db.scalars(stmt).all())

    def get_by_table(self, table_name: str) -> List[DataCatalog]:
        stmt = select(DataCatalog).where(
            DataCatalog.table_name == table_name,
            DataCatalog.is_active == True,
        )
        return list(self.db.scalars(stmt).all())

    def get_pii_columns(self) -> List[DataCatalog]:
        stmt = select(DataCatalog).where(
            DataCatalog.is_pii == True,
            DataCatalog.is_active == True,
        )
        return list(self.db.scalars(stmt).all())
