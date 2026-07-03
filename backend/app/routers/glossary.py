from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.user import User
from app.models.business_glossary import BusinessGlossary
from app.repositories.glossary_repository import GlossaryRepository
from app.schemas.glossary import GlossaryCreateRequest, GlossaryUpdateRequest, GlossaryResponse

router = APIRouter()


@router.get("", response_model=List[GlossaryResponse])
def list_glossary(
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = GlossaryRepository(db)
    return repo.get_all()


@router.post("", response_model=GlossaryResponse, status_code=201)
def create_glossary(
    body: GlossaryCreateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    repo = GlossaryRepository(db)
    if repo.get_by_term(body.term):
        raise BadRequestException(f"Term '{body.term}' already exists")

    entry = BusinessGlossary(
        term=body.term,
        definition=body.definition,
        sql_expression=body.sql_expression,
        category=body.category,
        created_by=admin.id,
    )
    return repo.create(entry)


@router.put("/{entry_id}", response_model=GlossaryResponse)
def update_glossary(
    entry_id: int,
    body: GlossaryUpdateRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    repo = GlossaryRepository(db)
    entry = repo.get_by_id(entry_id)
    if entry is None:
        raise NotFoundException("Glossary entry not found")

    return repo.update(entry, body.model_dump(exclude_unset=True))


@router.delete("/{entry_id}", status_code=204)
def delete_glossary(
    entry_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    repo = GlossaryRepository(db)
    entry = repo.get_by_id(entry_id)
    if entry is None:
        raise NotFoundException("Glossary entry not found")
    repo.delete(entry)
