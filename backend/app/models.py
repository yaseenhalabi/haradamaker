from __future__ import annotations

from datetime import datetime
from typing import Annotated, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

BoardCells = Annotated[dict[str, str], Field(default_factory=dict)]
BoardDone = Annotated[dict[str, bool], Field(default_factory=dict)]


def _valid_cell_key(key: str) -> bool:
    parts = key.split("-")
    if len(parts) != 2:
        return False
    try:
        block, cell = (int(part) for part in parts)
    except ValueError:
        return False
    return 0 <= block <= 8 and 0 <= cell <= 8


class BoardPayload(BaseModel):
    title: Optional[str] = Field(default=None, max_length=120)
    cells: BoardCells
    done: BoardDone

    @field_validator("cells", "done")
    @classmethod
    def valid_board_keys(cls, value):
        invalid = [key for key in value if not _valid_cell_key(key)]
        if invalid:
            raise ValueError(f"Invalid board cell keys: {', '.join(invalid[:5])}")
        return value


class BoardPatch(BaseModel):
    title: Optional[str] = Field(default=None, max_length=120)
    cells: Optional[dict[str, str]] = None
    done: Optional[dict[str, bool]] = None

    @field_validator("cells", "done")
    @classmethod
    def valid_patch_keys(cls, value):
        if value is None:
            return value
        invalid = [key for key in value if not _valid_cell_key(key)]
        if invalid:
            raise ValueError(f"Invalid board cell keys: {', '.join(invalid[:5])}")
        return value


class GenerateBoardPayload(BaseModel):
    goal: str = Field(min_length=12, max_length=1200)


class Board(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID
    title: str
    cells: dict[str, str]
    done: dict[str, bool]
    created_at: datetime
    updated_at: datetime


class ShareLink(BaseModel):
    token: str
    url: str


class UserProfile(BaseModel):
    id: UUID
    email: Optional[str] = None
