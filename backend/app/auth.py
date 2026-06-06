from __future__ import annotations

from typing import Optional
from uuid import UUID

import httpx
from fastapi import Depends, Header, HTTPException, status

from .config import Settings, get_settings
from .models import UserProfile


class AuthenticatedUser(UserProfile):
    access_token: str


def _bearer_token(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header",
        )
    return token


async def current_user(
    authorization: Optional[str] = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    token = _bearer_token(authorization)
    url = f"{str(settings.supabase_url).rstrip('/')}/auth/v1/user"
    headers = {
        "apikey": settings.supabase_publishable_key,
        "Authorization": f"Bearer {token}",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    data = response.json()
    return AuthenticatedUser(
        id=UUID(data["id"]),
        email=data.get("email"),
        access_token=token,
    )
