import os
import tomllib

from enum import Enum
from pathlib import Path

from src.config.branding import BRANDING

# Server
HOST = str(os.getenv("HOST", "0.0.0.0"))
PORT = int(os.getenv("PORT", 8000))
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")

# OAuth2
OAUTH_GITHUB_CLIENT_ID = os.getenv("OAUTH_GITHUB_CLIENT_ID")
OAUTH_GITHUB_CLIENT_SECRET = os.getenv("OAUTH_GITHUB_CLIENT_SECRET")
OAUTH_GITHUB_REDIRECT_URI = os.getenv("OAUTH_GITHUB_REDIRECT_URI")

# JWT Settings
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "this-is-a-secret-key")
JWT_ALGORITHM = "HS256"
JWT_TOKEN_EXPIRE_MINUTES = 60 * 24

# App
APP_TITLE = os.getenv("APP_TITLE", BRANDING.brand.title)
APP_ENV = os.getenv("APP_ENV", "development")
APP_VERSION = os.getenv("APP_VERSION") or tomllib.loads(
    (Path(__file__).resolve().parents[2] / "pyproject.toml").read_text()
)["project"]["version"]
APP_SECRET_KEY = os.getenv("APP_SECRET_KEY", "this-is-a-secret-key")
APP_LOG_LEVEL = os.getenv("APP_LOG_LEVEL", "INFO").upper()
DOCS_BASE_URL = os.getenv("DOCS_BASE_URL", BRANDING.urls.docs)


# Database
def get_db_uri():
    uri = os.getenv("POSTGRES_CONNECTION_STRING")
    if not uri:
        raise ValueError("POSTGRES_CONNECTION_STRING is not set in the environment variables")
    return uri


DB_URI = get_db_uri()

# Database Connection Pool Settings
# NOTE: these configure the psycopg pool used by the LangGraph store (see
# services/db.py get_store_db). The SQLAlchemy engine has its own DB_SQLA_*
# settings below — the two pools have different min/max semantics, so keep
# the names distinct or tuning one will silently retune the other.
DB_POOL_MIN_SIZE = int(os.getenv("DB_POOL_MIN_SIZE", "5"))
DB_POOL_MAX_SIZE = int(os.getenv("DB_POOL_MAX_SIZE", "20"))
DB_POOL_MAX_IDLE_TIME = int(os.getenv("DB_POOL_MAX_IDLE_TIME", "300"))  # 5 minutes
DB_POOL_MAX_LIFETIME = int(os.getenv("DB_POOL_MAX_LIFETIME", "3600"))  # 1 hour

# SQLAlchemy async engine pool settings (per process — dev runs one uvicorn plus
# two taskiq workers, each with its own pool, against a single Postgres).
# pool_timeout is deliberately short: queueing silently for 30s is what turns a
# burst into a cascade of 500s, because callers keep piling up behind the queue.
DB_SQLA_POOL_SIZE = int(os.getenv("DB_SQLA_POOL_SIZE", "10"))
DB_SQLA_POOL_MAX_OVERFLOW = int(os.getenv("DB_SQLA_POOL_MAX_OVERFLOW", "10"))
DB_SQLA_POOL_TIMEOUT = int(os.getenv("DB_SQLA_POOL_TIMEOUT", "5"))  # seconds
DB_SQLA_POOL_RECYCLE = int(os.getenv("DB_SQLA_POOL_RECYCLE", "1800"))  # 30 minutes


# Checkpoint Database Configuration
# Use session-mode connection (port 5432) for checkpointing stability with Supavisor
def get_db_uri_session():
    """Get session-mode connection string for checkpointing.

    Falls back to main DB_URI if not explicitly set.
    Session mode (port 5432) is required for LangGraph checkpointing
    due to pipeline mode requirements with Supabase Supavisor.
    """
    uri = os.getenv("POSTGRES_CONNECTION_STRING_SESSION")
    return uri if uri else DB_URI


DB_URI_SESSION = get_db_uri_session()

# TCP Keepalive Settings for long-running checkpoint connections
DB_KEEPALIVE_IDLE = int(os.getenv("DB_KEEPALIVE_IDLE", "60"))  # seconds before first probe
DB_KEEPALIVE_INTERVAL = int(os.getenv("DB_KEEPALIVE_INTERVAL", "15"))  # seconds between probes
DB_KEEPALIVE_COUNT = int(os.getenv("DB_KEEPALIVE_COUNT", "4"))  # failed probes before dead

# Checkpoint Resilience Settings
CHECKPOINT_MAX_RETRIES = int(os.getenv("CHECKPOINT_MAX_RETRIES", "3"))
CHECKPOINT_RETRY_DELAY = float(os.getenv("CHECKPOINT_RETRY_DELAY", "1.0"))  # seconds
CHECKPOINT_MAX_DELAY = float(os.getenv("CHECKPOINT_MAX_DELAY", "30.0"))  # max backoff cap
CHECKPOINT_JITTER = float(os.getenv("CHECKPOINT_JITTER", "0.1"))  # randomization factor
CHECKPOINT_HEALTH_CHECK_INTERVAL = int(os.getenv("CHECKPOINT_HEALTH_CHECK_INTERVAL", "30"))  # seconds

# Feature Flags for checkpoint resilience
CHECKPOINT_USE_RESILIENT = os.getenv("CHECKPOINT_USE_RESILIENT", "false").lower() == "true"
CHECKPOINT_ENABLE_FALLBACK = os.getenv("CHECKPOINT_ENABLE_FALLBACK", "false").lower() == "true"


class UserTokenKey(Enum):
    ANTHROPIC_API_KEY = "ANTHROPIC_API_KEY"
    OPENAI_API_KEY = "OPENAI_API_KEY"
    GROQ_API_KEY = "GROQ_API_KEY"
    GEMINI_API_KEY = "GEMINI_API_KEY"
    GOOGLE_API_KEY = "GOOGLE_API_KEY"
    XAI_API_KEY = "XAI_API_KEY"
    OLLAMA_BASE_URL = "OLLAMA_BASE_URL"
    AWS_BEARER_TOKEN_BEDROCK = "AWS_BEARER_TOKEN_BEDROCK"
    ## TOOLS
    SHELL_EXEC_SERVER_URL = "SHELL_EXEC_SERVER_URL"
    SEARX_SEARCH_HOST_URL = "SEARX_SEARCH_HOST_URL"
    TAVILY_API_KEY = "TAVILY_API_KEY"
    EXA_API_KEY = "EXA_API_KEY"
    ARCADE_API_KEY = "ARCADE_API_KEY"
    LANGCONNECT_SERVER_URL = "LANGCONNECT_SERVER_URL"
    DAYTONA_API_KEY = "DAYTONA_API_KEY"
    MCP_SANDBOX_API_KEY = "MCP_SANDBOX_API_KEY"

    @classmethod
    def values(cls) -> list[str]:
        return [key.value for key in cls]


# LLM API Keys
ANTHROPIC_API_KEY = os.getenv(UserTokenKey.ANTHROPIC_API_KEY.value)
OPENAI_API_KEY = os.getenv(UserTokenKey.OPENAI_API_KEY.value)
OLLAMA_BASE_URL = os.getenv(UserTokenKey.OLLAMA_BASE_URL.value)
GROQ_API_KEY = os.getenv(UserTokenKey.GROQ_API_KEY.value)
GEMINI_API_KEY = os.getenv(UserTokenKey.GEMINI_API_KEY.value)
GOOGLE_API_KEY = os.getenv(UserTokenKey.GOOGLE_API_KEY.value)
XAI_API_KEY = os.getenv(UserTokenKey.XAI_API_KEY.value)
AWS_BEARER_TOKEN_BEDROCK = os.getenv(UserTokenKey.AWS_BEARER_TOKEN_BEDROCK.value)
ARCADE_API_KEY = os.getenv(UserTokenKey.ARCADE_API_KEY.value)
# Tools
SHELL_EXEC_SERVER_URL = os.getenv(UserTokenKey.SHELL_EXEC_SERVER_URL.value, "http://localhost:3005/exec")
SEARX_SEARCH_HOST_URL = os.getenv(UserTokenKey.SEARX_SEARCH_HOST_URL.value, "http://localhost:8080")
TAVILY_API_KEY = os.getenv(UserTokenKey.TAVILY_API_KEY.value)
EXA_API_KEY = os.getenv(UserTokenKey.EXA_API_KEY.value)
LANGCONNECT_SERVER_URL = os.getenv(UserTokenKey.LANGCONNECT_SERVER_URL.value)
DAYTONA_API_KEY = os.getenv(UserTokenKey.DAYTONA_API_KEY.value)
MCP_SANDBOX_API_KEY = os.getenv(UserTokenKey.MCP_SANDBOX_API_KEY.value)

# Storage
MINIO_HOST = os.getenv("MINIO_HOST")
S3_REGION = os.getenv("S3_REGION", "us-east-2")
ACCESS_KEY_ID = os.getenv("ACCESS_KEY_ID")
ACCESS_SECRET_KEY = os.getenv("ACCESS_SECRET_KEY")
BUCKET = os.getenv("BUCKET", "lg_template_dev")
TEST_USER_ID = os.getenv("TEST_USER_ID", "00000000-0000-0000-0000-000000000000")

# GridSite
MICROSOFT_TEAMS_WEBHOOK_URL = os.getenv("MICROSOFT_TEAMS_WEBHOOK_URL")

# Distributed Workers
DISTRIBUTED_WORKERS = os.getenv("DISTRIBUTED_WORKERS", "false").lower() == "true"

# Thread Search
# Number of recent messages to store per thread snapshot for semantic search
THREAD_SNAPSHOT_MESSAGE_COUNT = 20
