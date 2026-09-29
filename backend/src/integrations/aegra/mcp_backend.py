from src.agents.mcp_sandbox import McpSandboxBackend
from src.integrations.aegra import authority


class AuthenticatedMcpSandboxBackend(McpSandboxBackend):
    def __init__(self) -> None:
        self._owner = authority.current().identity
        super().__init__(base_url=f"{authority.api_url()}/api/sandbox")

    def _build_headers(self, *, include_session: bool = False) -> dict[str, str]:
        session = authority.current()
        if session.identity != self._owner:
            raise PermissionError("Orchestra identity mismatch")
        return {**super()._build_headers(include_session=include_session), **session.headers}
