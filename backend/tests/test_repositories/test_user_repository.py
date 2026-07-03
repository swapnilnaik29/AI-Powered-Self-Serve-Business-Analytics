from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.core.security import hash_password


def test_create_and_get_user(db_session):
    repo = UserRepository(db_session)

    user = User(
        email="repo_test@example.com",
        hashed_password=hash_password("pass123"),
        full_name="Repo Test",
        role="analyst",
    )
    created = repo.create(user)
    assert created.id is not None

    found = repo.get_by_email("repo_test@example.com")
    assert found is not None
    assert found.full_name == "Repo Test"


def test_get_nonexistent_user(db_session):
    repo = UserRepository(db_session)
    found = repo.get_by_email("nonexistent@example.com")
    assert found is None
