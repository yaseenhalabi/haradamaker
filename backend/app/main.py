from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from uuid import UUID

import httpx
from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware

from .auth import AuthenticatedUser, current_user
from .config import get_settings
from .models import (
    Board,
    BoardPatch,
    BoardPayload,
    GenerateBoardPayload,
    ShareLink,
    UserProfile,
)

app = FastAPI(title="HaradaMaker API")
settings = get_settings()
SUPABASE_REST_URL = f"{str(settings.supabase_url).rstrip('/')}/rest/v1"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _title_for(payload: BoardPayload) -> str:
    title = (payload.title or payload.cells.get("4-4") or "").strip()
    return title[:120] or "Untitled board"


def _board_from_json(data: dict) -> Board:
    return Board.model_validate(data)


def _clean_text(value: object, fallback: str, limit: int = 80) -> str:
    if not isinstance(value, str):
        return fallback
    cleaned = " ".join(value.split()).strip()
    return cleaned[:limit] or fallback


def _chart_cells_from_ai(data: dict, requested_goal: str) -> tuple[str, dict[str, str]]:
    goal = _clean_text(data.get("goal"), requested_goal, 120)
    cells: dict[str, str] = {"4-4": goal}
    pillars = data.get("pillars")
    if not isinstance(pillars, list):
        pillars = []

    outer_blocks = [0, 1, 2, 3, 5, 6, 7, 8]
    action_cells = [0, 1, 2, 3, 5, 6, 7, 8]
    for index, block in enumerate(outer_blocks):
        pillar = pillars[index] if index < len(pillars) and isinstance(pillars[index], dict) else {}
        name = _clean_text(pillar.get("name"), f"Theme {index + 1}", 42)
        cells[f"4-{block}"] = name
        cells[f"{block}-4"] = name

        actions = pillar.get("actions")
        if not isinstance(actions, list):
            actions = []
        for action_index, cell in enumerate(action_cells):
            fallback = f"Action {action_index + 1}"
            action = actions[action_index] if action_index < len(actions) else fallback
            cells[f"{block}-{cell}"] = _clean_text(action, fallback, 64)

    return goal, cells


async def _generate_chart(goal: str) -> tuple[str, dict[str, str]]:
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI generation is not configured",
        )

    prompt = f"""
Create a Harada Method Mandal chart for this user goal:
{goal}

Return only JSON with this exact shape:
{{
  "goal": "short central goal",
  "pillars": [
    {{"name": "theme name", "actions": ["specific action", "specific action", "specific action", "specific action", "specific action", "specific action", "specific action", "specific action"]}}
  ]
}}

Requirements:
- Exactly 8 pillars.
- Exactly 8 actions per pillar.
- Keep every item concise enough to fit in a small grid cell.
- Make actions concrete, practical, and measurable when possible.
"""
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json"},
    }
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            url,
            params={"key": settings.gemini_api_key},
            json=payload,
        )
    if response.status_code >= 400:
        detail = "AI generation failed"
        try:
            error = response.json().get("error", {})
            detail = error.get("message") or detail
        except ValueError:
            pass
        if response.status_code == 429:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
        )

    try:
        text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        data = json.loads(text)
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned an invalid chart",
        ) from exc

    return _chart_cells_from_ai(data, goal)


def _headers(access_token: str | None = None, prefer: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": settings.supabase_publishable_key,
        "Content-Type": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    if prefer:
        headers["Prefer"] = prefer
    return headers


async def _request(
    method: str,
    path: str,
    *,
    access_token: str | None = None,
    json: object | None = None,
    params: dict[str, str] | None = None,
    prefer: str | None = None,
    not_found: str = "Not found",
) -> httpx.Response:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.request(
            method,
            f"{SUPABASE_REST_URL}{path}",
            headers=_headers(access_token, prefer),
            json=json,
            params=params,
        )
    if response.status_code == 404:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found)
    if response.status_code >= 400:
        detail = response.text
        try:
            detail = response.json().get("message") or detail
        except ValueError:
            pass
        raise HTTPException(status_code=response.status_code, detail=detail)
    return response


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/me", response_model=UserProfile)
async def me(user: AuthenticatedUser = Depends(current_user)) -> UserProfile:
    return UserProfile(id=user.id, email=user.email)


@app.get("/api/boards", response_model=list[Board])
async def list_boards(
    user: AuthenticatedUser = Depends(current_user),
) -> list[Board]:
    response = await _request(
        "GET",
        "/boards",
        access_token=user.access_token,
        params={
            "select": "id,owner_id,title,cells,done,created_at,updated_at",
            "order": "updated_at.desc",
        },
    )
    return [_board_from_json(board) for board in response.json()]


@app.post("/api/boards", response_model=Board, status_code=status.HTTP_201_CREATED)
async def create_board(
    payload: BoardPayload,
    user: AuthenticatedUser = Depends(current_user),
) -> Board:
    response = await _request(
        "POST",
        "/boards",
        access_token=user.access_token,
        json={
            "owner_id": str(user.id),
            "title": _title_for(payload),
            "cells": payload.cells,
            "done": payload.done,
        },
        params={"select": "id,owner_id,title,cells,done,created_at,updated_at"},
        prefer="return=representation",
    )
    return _board_from_json(response.json()[0])


@app.post("/api/boards/generate", response_model=Board, status_code=status.HTTP_201_CREATED)
async def generate_board(
    payload: GenerateBoardPayload,
    user: AuthenticatedUser = Depends(current_user),
) -> Board:
    title, cells = await _generate_chart(payload.goal)
    response = await _request(
        "POST",
        "/boards",
        access_token=user.access_token,
        json={
            "owner_id": str(user.id),
            "title": title,
            "cells": cells,
            "done": {},
        },
        params={"select": "id,owner_id,title,cells,done,created_at,updated_at"},
        prefer="return=representation",
    )
    return _board_from_json(response.json()[0])


@app.get("/api/boards/{board_id}", response_model=Board)
async def get_board(
    board_id: UUID,
    user: AuthenticatedUser = Depends(current_user),
) -> Board:
    response = await _request(
        "GET",
        "/boards",
        access_token=user.access_token,
        params={
            "select": "id,owner_id,title,cells,done,created_at,updated_at",
            "id": f"eq.{board_id}",
            "limit": "1",
        },
        not_found="Board not found",
    )
    data = response.json()
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return _board_from_json(data[0])


@app.patch("/api/boards/{board_id}", response_model=Board)
async def update_board(
    board_id: UUID,
    payload: BoardPatch,
    user: AuthenticatedUser = Depends(current_user),
) -> Board:
    patch: dict[str, object] = {}
    if payload.title is not None:
        patch["title"] = payload.title.strip()[:120] or "Untitled board"
    if payload.cells is not None:
        patch["cells"] = payload.cells
    if payload.done is not None:
        patch["done"] = payload.done
    if not patch:
        return await get_board(board_id, user)

    response = await _request(
        "PATCH",
        "/boards",
        access_token=user.access_token,
        json=patch,
        params={
            "id": f"eq.{board_id}",
            "select": "id,owner_id,title,cells,done,created_at,updated_at",
        },
        prefer="return=representation",
        not_found="Board not found",
    )
    data = response.json()
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return _board_from_json(data[0])


@app.delete("/api/boards/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    board_id: UUID,
    user: AuthenticatedUser = Depends(current_user),
) -> Response:
    await _request(
        "DELETE",
        "/boards",
        access_token=user.access_token,
        params={"id": f"eq.{board_id}"},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/api/boards/{board_id}/share", response_model=ShareLink)
async def create_share(
    board_id: UUID,
    user: AuthenticatedUser = Depends(current_user),
) -> ShareLink:
    await get_board(board_id, user)

    existing_response = await _request(
        "GET",
        "/board_shares",
        access_token=user.access_token,
        params={
            "select": "token",
            "board_id": f"eq.{board_id}",
            "revoked_at": "is.null",
            "order": "created_at.desc",
            "limit": "1",
        },
    )
    existing = existing_response.json()
    token = existing[0]["token"] if existing else secrets.token_urlsafe(32)

    if not existing:
        await _request(
            "POST",
            "/board_shares",
            access_token=user.access_token,
            json={
                "board_id": str(board_id),
                "token": token,
                "created_by": str(user.id),
            },
            prefer="return=minimal",
        )

    return ShareLink(token=token, url=f"/share/{token}")


@app.delete("/api/boards/{board_id}/share", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_share(
    board_id: UUID,
    user: AuthenticatedUser = Depends(current_user),
) -> Response:
    await get_board(board_id, user)
    await _request(
        "PATCH",
        "/board_shares",
        access_token=user.access_token,
        json={"revoked_at": datetime.now(timezone.utc).isoformat()},
        params={"board_id": f"eq.{board_id}", "revoked_at": "is.null"},
        prefer="return=minimal",
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/share/{token}", response_model=Board)
async def get_shared_board(token: str) -> Board:
    response = await _request(
        "POST",
        "/rpc/get_shared_board",
        json={"share_token": token},
        not_found="Shared board not found",
    )
    data = response.json()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared board not found",
        )
    return _board_from_json(data[0])
