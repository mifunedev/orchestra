import json
import os
import shlex
import socket
import subprocess
import time
from contextlib import contextmanager
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4

import conftest
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url


FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
ALICE = "Bearer probe-alice"
BOB = "Bearer probe-bob"


def request(base, method, path, credential=None, body=None, headers=None, timeout=8):
    request_headers = dict(headers or {})
    if credential:
        request_headers["Authorization"] = credential
    data = None if body is None else json.dumps(body).encode()
    if data is not None:
        request_headers["Content-Type"] = "application/json"
    req = Request(f"{base}{path}", data=data, headers=request_headers, method=method)
    try:
        return urlopen(req, timeout=timeout)
    except HTTPError as exc:
        return exc


def frames(response):
    result = []
    frame = {}
    with response:
        for raw in response:
            line = raw.decode().strip()
            if not line:
                if "event" in frame:
                    result.append(frame)
                    if frame["event"] == "end":
                        break
                frame = {}
            elif line.startswith(("event: ", "data: ", "id: ")):
                key, value = line.split(": ", 1)
                frame[key] = value
    return result


@contextmanager
def isolated_aegra():
    if conftest._test_postgres is None or os.environ.get("TEST_POSTGRES_CONNECTION_STRING"):
        pytest.fail("Aegra live probe requires the disposable pg17 container owned by backend/conftest.py")
    container = conftest._test_postgres._container
    container.reload()
    assert container.status == "running"
    assert container.image.tags == ["pgvector/pgvector:pg17"]
    admin_url = make_url(conftest._test_uri)
    database = f"aegra_probe_{uuid4().hex}"
    probe_url = admin_url.set(database=database).render_as_string(hide_password=False)
    session = f"aegra-probe-{uuid4().hex[:12]}"
    port_socket = socket.socket()
    port_socket.bind(("127.0.0.1", 0))
    port = port_socket.getsockname()[1]
    port_socket.close()
    admin = create_engine(admin_url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    started = False
    created = False
    try:
        with admin.connect() as connection:
            connection.execute(text(f'CREATE DATABASE "{database}"'))
        created = True
        command = [
            "env",
            f"DATABASE_URL={probe_url}",
            f"AEGRA_CONFIG={FIXTURES / 'aegra_probe.json'}",
            "REDIS_BROKER_ENABLED=false",
            "CRON_ENABLED=false",
            "LANGCHAIN_TRACING_V2=false",
            "uv",
            "run",
            "--no-project",
            "--with",
            "aegra-api==0.10.7",
            "uvicorn",
            "aegra_api.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
        ]
        subprocess.run(
            ["tmux", "new-session", "-d", "-s", session, "-c", str(FIXTURES), shlex.join(command)],
            check=True,
            capture_output=True,
            text=True,
        )
        started = True
        base = f"http://127.0.0.1:{port}"
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            try:
                with request(base, "GET", "/", timeout=1) as response:
                    if response.status == 200:
                        break
            except (URLError, TimeoutError):
                time.sleep(0.25)
        else:
            output = subprocess.run(
                ["tmux", "capture-pane", "-pt", session, "-S", "-50"], capture_output=True, text=True
            )
            pytest.fail(f"Disposable Aegra startup failed: {output.stdout[-2000:]}")
        yield base
    finally:
        try:
            if started:
                subprocess.run(["tmux", "kill-session", "-t", session], check=True)
        finally:
            try:
                if created:
                    with admin.connect() as connection:
                        connection.execute(
                            text(
                                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                                "WHERE datname = :db AND pid <> pg_backend_pid()"
                            ),
                            {"db": database},
                        )
                        connection.execute(text(f'DROP DATABASE "{database}"'))
            finally:
                admin.dispose()


@pytest.mark.skipif(os.environ.get("AEGRA_PROBE_LIVE") != "1", reason="Disposable live probe is opt-in")
def test_aegra_0107_agent_protocol_and_tenant_boundary():
    with isolated_aegra() as base:
        with request(base, "GET", "/") as response:
            assert response.status == 200
            assert response.headers["Content-Type"] == "application/json"
            assert json.load(response)["version"] == "0.10.7"

        thread = str(uuid4())
        run_path = f"/threads/{thread}/runs"
        payload = {"assistant_id": "probe", "input": {"message": "observed"}}
        for path, method, body in [("/assistants/search", "POST", {}), (run_path, "POST", payload)]:
            with request(base, method, path, body=body) as response:
                assert response.status == 401
            with request(base, method, path, ALICE, body) as response:
                assert response.status == 200
                if path == run_path:
                    run = json.load(response)
                    assert run["user_id"] == "alice"
                    run_id = run["run_id"]
            with request(base, method, path, BOB, body) as response:
                assert response.status == (404 if path == run_path else 200)

        v2_path = f"/threads/{thread}/stream/events"
        for credential, expected in [(None, 401), (BOB, 404), (ALICE, 200)]:
            with request(base, "POST", v2_path, credential, {"channels": ["values"]}) as response:
                assert response.status == expected
                if expected == 200:
                    assert response.headers["Content-Type"].startswith("text/event-stream")

        stream_path = f"{run_path}/{run_id}/stream"
        for credential, expected in [(None, 401), (BOB, 404)]:
            with request(base, "GET", stream_path, credential) as response:
                assert response.status == expected
        with request(base, "GET", stream_path, ALICE) as response:
            assert response.status == 200
            events = frames(response)
        assert events[-1]["event"] == "end"
        assert json.loads(events[-1]["data"])["status"] == "success"
        assert any(event["event"] == "values" for event in events)
        assert all("[DONE]" not in event["data"] for event in events)
        cursor = next(event["id"] for event in events if event["event"] == "values")
        with request(base, "POST", v2_path, ALICE, {"channels": ["values"], "since": cursor}) as response:
            assert response.status == 422
        with request(base, "GET", stream_path, ALICE, headers={"Last-Event-ID": cursor}) as response:
            assert response.status == 200
            replay = frames(response)
        assert replay and replay[-1]["event"] == "end"
        assert all(event.get("id") != cursor for event in replay)

        stream_thread = str(uuid4())
        streamed = f"/threads/{stream_thread}/runs/stream"
        for credential, expected in [(None, 401), (BOB, 200)]:
            with request(base, "POST", streamed, credential, payload) as response:
                assert response.status == expected
                if expected == 200:
                    assert response.headers["Location"].startswith(f"/threads/{stream_thread}/runs/")
                    assert frames(response)[-1]["event"] == "end"
        with request(base, "POST", streamed, ALICE, payload) as response:
            assert response.status == 404

        cancel_thread = str(uuid4())
        with request(
            base,
            "POST",
            f"/threads/{cancel_thread}/runs",
            ALICE,
            {"assistant_id": "probe", "input": {"message": "cancel", "delay": 15}},
        ) as response:
            assert response.status == 200
            cancel_run = json.load(response)["run_id"]
        cancel_path = f"/threads/{cancel_thread}/runs/{cancel_run}/cancel?wait=1"
        for credential, expected in [(None, 401), (BOB, 404), (ALICE, 200)]:
            with request(base, "POST", cancel_path, credential, timeout=15) as response:
                assert response.status == expected
                if expected == 200:
                    assert json.load(response)["status"] == "interrupted"
        with request(base, "GET", f"/threads/{cancel_thread}/runs/{cancel_run}/stream", ALICE) as response:
            assert frames(response)[-1] == {"event": "end", "data": '{"status":"interrupted"}'}
