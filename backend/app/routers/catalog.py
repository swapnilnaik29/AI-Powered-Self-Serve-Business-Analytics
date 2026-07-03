from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.models.data_catalog import DataCatalog
from app.repositories.catalog_repository import CatalogRepository
from app.schemas.catalog import CatalogCreateRequest, CatalogUpdateRequest, CatalogResponse
from app.services.catalog_service import CatalogService

router = APIRouter()


@router.get("", response_model=List[CatalogResponse])
def list_catalog(
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = CatalogRepository(db)
    return repo.get_active()


@router.post("", response_model=CatalogResponse, status_code=201)
def create_catalog_entry(
    body: CatalogCreateRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    repo = CatalogRepository(db)
    entry = DataCatalog(
        table_name=body.table_name,
        column_name=body.column_name,
        data_type=body.data_type,
        description=body.description,
        sample_values=body.sample_values,
        is_pii=body.is_pii,
    )
    return repo.create(entry)


@router.put("/{entry_id}", response_model=CatalogResponse)
def update_catalog_entry(
    entry_id: int,
    body: CatalogUpdateRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    repo = CatalogRepository(db)
    entry = repo.get_by_id(entry_id)
    if entry is None:
        raise NotFoundException("Catalog entry not found")

    return repo.update(entry, body.model_dump(exclude_unset=True))


@router.post("/sync", status_code=200)
def sync_catalog(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = CatalogService(db)
    count = service.sync_from_database()
    return {"message": f"Synced {count} columns from database"}
