import logging
from contextlib import asynccontextmanager

import os
import ssl

os.environ["CURL_CA_BUNDLE"] = ""
os.environ["REQUESTS_CA_BUNDLE"] = ""
os.environ["HF_HUB_DISABLE_SSL_VERIFICATION"] = "1"

ssl._create_default_https_context = ssl._create_unverified_context

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging_config import setup_logging
from app.core.exceptions import AppException, app_exception_handler, unhandled_exception_handler
from app.core.database import engine
from app.models import Base

from app.routers import auth, queries, feedback, glossary, catalog, governance, export, health
from app.middleware.audit import AuditMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified")

    yield

    logger.info("Shutting down")


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(AuditMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

API_PREFIX = "/api/v1"
app.include_router(health.router, prefix=API_PREFIX, tags=["Health"])
app.include_router(auth.router, prefix=f"{API_PREFIX}/auth", tags=["Authentication"])
app.include_router(queries.router, prefix=f"{API_PREFIX}/queries", tags=["Queries"])
app.include_router(feedback.router, prefix=f"{API_PREFIX}", tags=["Feedback"])
app.include_router(glossary.router, prefix=f"{API_PREFIX}/glossary", tags=["Business Glossary"])
app.include_router(catalog.router, prefix=f"{API_PREFIX}/catalog", tags=["Data Catalog"])
app.include_router(governance.router, prefix=f"{API_PREFIX}/governance", tags=["Governance"])
app.include_router(export.router, prefix=f"{API_PREFIX}", tags=["Export"])