import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.core.security import hash_password, verify_password

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = UserRepository(db)

    def get_user_by_email(self, email: str) -> Optional[User]:
        return self.repo.get_by_email(email)

    def authenticate(self, email: str, password: str) -> Optional[User]:
        user = self.repo.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            return None
        return user
