from pydantic import BaseModel, Field


class ExportRequest(BaseModel):
    format: str = Field(pattern=r"^(pdf|excel|html)$")
