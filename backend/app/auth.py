from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, Request, status
from jwt import PyJWKClient

from .config import get_settings


@dataclass(frozen=True)
class CurrentUser:
    id: str
    claims: dict


@lru_cache
def get_jwks_client() -> PyJWKClient:
    return PyJWKClient(get_settings().clerk_jwks_url, cache_keys=True)


def get_current_user(request: Request) -> CurrentUser:
    settings = get_settings()
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to continue")
    if not settings.clerk_issuer:
        raise HTTPException(status_code=503, detail="Server Clerk issuer is not configured")
    token = auth_header.removeprefix("Bearer ").strip()
    try:
        signing_key = get_jwks_client().get_signing_key_from_jwt(token).key
        claims = jwt.decode(token, signing_key, algorithms=["RS256"], issuer=settings.clerk_issuer.rstrip("/"))
    except (jwt.PyJWTError, Exception) as exc:
        # A verification failure must never fall back to trusting frontend-supplied identity.
        raise HTTPException(status_code=401, detail="Invalid or expired Clerk session") from exc

    # Browser requests must come from an allowed web origin. Native mobile
    # requests generally omit Origin, so validate those by Clerk's JWT
    # signature, issuer, expiry, and subject instead.
    authorized_party = claims.get("azp")
    origin = request.headers.get("origin")
    if origin and settings.allowed_origins and (
        not authorized_party
        or authorized_party.rstrip("/") not in settings.allowed_origins
        or origin.rstrip("/") not in settings.allowed_origins
    ):
        raise HTTPException(status_code=401, detail="Clerk session came from an untrusted origin")
    subject = claims.get("sub")
    if not subject:
        raise HTTPException(status_code=401, detail="Clerk session has no user identity")
    return CurrentUser(id=subject, claims=claims)


CurrentUserDep = Depends(get_current_user)

