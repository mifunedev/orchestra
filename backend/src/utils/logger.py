import sys
from loguru import logger

from src.constants import APP_LOG_LEVEL, APP_ENV
from src.utils.correlation import get_correlation_id

# Define a log format that is readable and user-friendly.
# ``{extra[correlation_id]}`` threads the bound run_id (see utils/correlation.py)
# through every log line so worker output is greppable by correlation/request ID.
LOG_FORMAT = (
    "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
    "<level>{level: <8}</level> | "
    "<magenta>cid={extra[correlation_id]}</magenta> | "
    "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
    "<level>{message}</level>"
    "<level>{exception}</level>"  # Add exception/stacktrace to format
)


def _inject_correlation_id(record):
    """Loguru patcher: stamp the active correlation ID onto every record.

    Reads the ContextVar bound by the worker task (or '-' when unbound) so the
    field is always present for the format string and any structured sink.
    """
    record["extra"].setdefault("correlation_id", get_correlation_id() or "-")


# Add a console handler for terminal logging
logger.remove()  # Remove the default handler
logger = logger.patch(_inject_correlation_id)
logger.add(
    sys.stdout,
    format=LOG_FORMAT,
    level=APP_LOG_LEVEL,  # Change to DEBUG for verbose output
    colorize=True,
    backtrace=True,  # Show error backtraces for easier debugging
    # diagnose=True,   # Show variable values in tracebacks
    # catch=True,      # Catch exceptions and show full traceback
)

# Add a file handler for logging to a file with rotation
# logger.add(
#     f"logs/log_{datetime.now().strftime('%Y%m%d')}.log",
#     format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}\n{exception}",
#     rotation="10 MB",  # Rotate log files when they reach 10 MB
#     retention="7 days",  # Keep logs for 7 days
#     compression="zip",  # Compress old logs
#     level="DEBUG",  # Capture all levels in the log file
#     backtrace=True,  # Show error backtraces in file logs too
#     diagnose=True,   # Show variable values in file logs
#     catch=True       # Catch exceptions in file logs
# )


def log_error(message: str, *args, **kwargs):
    """Log an error message. Uses exception() in dev/test for full traceback, error() in production."""
    if APP_ENV in ("development"):
        logger.exception(message, *args, **kwargs)
    else:
        logger.error(message, *args, **kwargs)


# Expose the logger for use in other files
__all__ = ["logger", "log_error"]
