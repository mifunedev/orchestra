#!/usr/bin/env bash
set -euo pipefail
backend_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec python3 - "$backend_root" <<'PY'
import json
import os
import re
import signal
import subprocess
import sys
import uuid
from pathlib import Path
from urllib.parse import quote

backend = Path(sys.argv[1])
name = "us001_aegra_" + uuid.uuid4().hex
created = False
child = None
password = ""
status = 1


def redact(value):
    if password:
        value = value.replace(password, "[REDACTED]")
    value = re.sub(r"postgres(?:ql)?(?:\+\w+)?://[^\s\"']+", "postgresql://[REDACTED]", value)
    value = re.sub(r"eyJ[\w-]+\.[\w-]+\.[\w-]+", "[REDACTED-JWT]", value)
    return re.sub(r"otk_[\w-]+", "[REDACTED-API-KEY]", value)


def sql(database, statement):
    result = subprocess.run(
        ["docker", "exec", "postgres", "psql", "-XAt", "-v", "ON_ERROR_STOP=1",
         "-U", user, "-d", database, "-c", statement],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode:
        raise RuntimeError(redact(result.stderr))
    return result.stdout.strip()


def interrupted(signum, frame):
    raise InterruptedError(f"Interrupted by signal {signum}")


signal.signal(signal.SIGINT, interrupted)
signal.signal(signal.SIGTERM, interrupted)
try:
    inspected = subprocess.run(
        ["docker", "inspect", "postgres"], capture_output=True, text=True, timeout=30, check=True,
    )
    info = json.loads(inspected.stdout)[0]
    if not info["State"]["Running"]:
        raise RuntimeError("The existing postgres container must already be running")
    configured = dict(item.split("=", 1) for item in info["Config"]["Env"] if "=" in item)
    user = configured["POSTGRES_USER"]
    password = configured["POSTGRES_PASSWORD"]
    host = next(net["IPAddress"] for net in info["NetworkSettings"]["Networks"].values() if net["IPAddress"])
    if sql("postgres", "SELECT rolsuper FROM pg_roles WHERE rolname = current_user") != "f":
        raise RuntimeError("This runner requires the configured non-superuser PostgreSQL account")
    if not re.fullmatch(r"us001_aegra_[a-f0-9]{32}", name):
        raise RuntimeError("Invalid disposable database name")
    if sql("postgres", f"SELECT count(*) FROM pg_database WHERE datname = '{name}'") != "0":
        raise RuntimeError("Refusing to use a pre-existing database")
    sql("postgres", f'CREATE DATABASE "{name}" TEMPLATE template0')
    created = True
    if sql(name, "SELECT current_database()") != name:
        raise RuntimeError("Unexpected database identity")
    if sql(name, "SELECT count(*) FROM pg_extension WHERE extname = 'vector'") != "0":
        raise RuntimeError("The disposable Aegra database must not have vector")
    print(f"CREATED {name}; vector absent", flush=True)
    uri = f"postgresql://{quote(user, safe='')}:{quote(password, safe='')}@{host}:5432/{name}?sslmode=disable"
    environment = os.environ.copy()
    for key in ("TEST_POSTGRES_CONNECTION_STRING", "POSTGRES_CONNECTION_STRING_SESSION"):
        environment.pop(key, None)
    environment.update(
        POSTGRES_CONNECTION_STRING="postgresql://localhost:1/orchestra_disabled_for_test",
        AEGRA_DATABASE_URL=uri,
        APP_ENV="test",
        OPENAI_API_KEY="us001-synthetic-key",
        LANGSMITH_TRACING="false",
        LANGCHAIN_TRACING_V2="false",
        OTEL_SDK_DISABLED="true",
    )
    command = [
        "uv", "run", "--locked", "python", "-m", "pytest",
        "--confcutdir=tests/integration", "--import-mode=importlib",
        "tests/integration/test_aegra_chat_stream.py", "-q", "--tb=short", "--show-capture=no",
    ]
    print("COMMAND " + " ".join(command), flush=True)
    child = subprocess.Popen(
        command, cwd=backend, env=environment, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, start_new_session=True,
    )
    output, _ = child.communicate(timeout=180)
    print(redact(output), flush=True)
    status = child.returncode
    print(f"TEST_EXIT {status}", flush=True)
except Exception as error:
    status = 1
    print(redact(str(error)), file=sys.stderr, flush=True)
finally:
    signal.signal(signal.SIGINT, signal.SIG_IGN)
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    if child is not None and child.poll() is None:
        os.killpg(child.pid, signal.SIGTERM)
        try:
            child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            os.killpg(child.pid, signal.SIGKILL)
            child.wait()
    if created:
        try:
            sql("postgres", f'DROP DATABASE "{name}" WITH (FORCE)')
            if sql("postgres", f"SELECT count(*) FROM pg_database WHERE datname = '{name}'") != "0":
                raise RuntimeError(f"Cleanup could not verify absence of {name}")
            print(f"DROPPED {name}; absence verified", flush=True)
        except Exception as error:
            print(redact(str(error)), file=sys.stderr, flush=True)
            status = 1
sys.exit(status)
PY
