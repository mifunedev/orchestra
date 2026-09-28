from typing import Optional, Mapping, Callable
from datetime import datetime, timedelta, timezone
import secrets
import hashlib
from fastapi import Request, status, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWTError
from src.constants.llm import get_free_models
from src.repos.user_repo import UserRepo
from src.repos.api_token_repo import ApiTokenRepo
from src.constants import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_TOKEN_EXPIRE_MINUTES
from src.schemas.entities import LLMRequest
from src.schemas.models import User
from src.schemas.models.auth import ProtectedUser
from sqlalchemy.ext.asyncio import AsyncSession
from src.services.db import AsyncSessionLocal
from src.services.assistant import AssistantService
from src.utils.logger import logger

security = HTTPBearer(auto_error=False)


def generate_api_key_str() -> str:
    return f"otk_{secrets.token_urlsafe(32)}"


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(user: User, expires_delta: timedelta | None = None):
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_TOKEN_EXPIRE_MINUTES)

    # Create JWT payload with user data
    to_encode = {
        "user": {
            "sub": user.email,
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "name": user.name,
        },
        "exp": expire,
    }

    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def is_authorized_model(model: str) -> bool:
    return model in get_free_models()


async def get_optional_user_from_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[User]:
    """
    Get optional user from Bearer token or API key.
    Use for GET endpoints that don't have a request body.
    Returns None if no valid credentials provided.
    """
    if credentials is None:
        # Check for API Key if no Bearer token
        api_key = request.headers.get("x-api-key")
        if api_key:
            try:
                return await verify_credentials(request, credentials)
            except HTTPException:
                pass
        return None

    try:
        return await verify_credentials(request, credentials)
    except HTTPException:
        return None


async def get_optional_user(
    request: Request,
    params: LLMRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[User]:
    if credentials is None:
        # Check for API Key if no Bearer token
        api_key = request.headers.get("x-api-key")
        if api_key:
            try:
                return await verify_credentials(request, credentials)
            except HTTPException:
                pass

        # Allow unauthenticated access for public assistants
        if params.metadata and params.metadata.assistant_id:
            store = getattr(request.app.state, "store", None)
            if store:
                assistant_service = AssistantService(user_id=None, store=store)
                public_assistant = await assistant_service.get_public(params.metadata.assistant_id)
                if public_assistant:
                    logger.info(f"Allowing unauthenticated access for public assistant: {params.metadata.assistant_id}")
                    return None

        # Empty model is allowed — the controller resolves it to DEFAULT_CHAT_MODEL
        if params.model and not is_authorized_model(params.model):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=(f"Unauthorized [{params.model}]\nPlease sign in for higher limits and better models!"),
                headers={"WWW-Authenticate": "Bearer"},
            )
        return None

    try:
        return await verify_credentials(request, credentials)
    except HTTPException:
        return None


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def resolve_identity(
    headers: Mapping[str, str],
    bearer_token: str | None,
    store: object,
    session_factory: Callable[[], AsyncSession],
) -> ProtectedUser:
    api_key = headers.get("x-api-key")
    if api_key:
        if store is None:
            raise _unauthorized("Invalid API Key")
        try:
            token = await ApiTokenRepo("system", store).get_by_hash_global(hash_token(api_key))
        except Exception:
            logger.warning("API key lookup failed")
            raise _unauthorized("Invalid API Key") from None
        if token is None:
            raise _unauthorized("Invalid API Key")
        async with session_factory() as db:
            user = await UserRepo(db, user_id=token.user_id).get_by_id()
            if user is None:
                raise _unauthorized("User not found")
            protected_user = user.protected()
        if protected_user.id != token.user_id:
            raise _unauthorized("Invalid API Key")
        try:
            await ApiTokenRepo(token.user_id, store).update_last_used(token.id)
        except Exception:
            logger.warning("API key usage update failed")
            raise _unauthorized("Invalid API Key") from None
        return protected_user

    if not bearer_token:
        raise _unauthorized("No credentials provided")
    try:
        payload = jwt.decode(bearer_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except PyJWTError:
        logger.warning("Could not validate credentials")
        raise _unauthorized("Could not validate credentials") from None

    if payload.get("exp") is None:
        raise _unauthorized("Token is missing expiration")
    user_data = payload.get("user")
    if not isinstance(user_data, dict):
        raise _unauthorized("Invalid token payload")
    email = user_data.get("email")
    user_id = user_data.get("id")
    if not isinstance(email, str) or not email or not isinstance(user_id, str) or not user_id:
        raise _unauthorized("Invalid token payload")
    if user_data.get("sub") != email:
        raise _unauthorized("Invalid token payload")

    async with session_factory() as db:
        user = await UserRepo(db).get_by_email(email)
        if user is None:
            raise _unauthorized("User not found")
        protected_user = user.protected()
    if protected_user.id != user_id or protected_user.email != email:
        raise _unauthorized("Invalid token payload")
    return protected_user


async def verify_credentials(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> ProtectedUser:
    api_key = request.headers.get("x-api-key")
    bearer_token = credentials.credentials if credentials else None
    user = await resolve_identity(
        request.headers,
        bearer_token,
        getattr(request.app.state, "store", None),
        AsyncSessionLocal,
    )
    request.state.user = user
    request.state.token = api_key if api_key else bearer_token
    return user
