const DEFAULT_MCP_CONFIG = {
	orchestra_mcp: {
		transport: "sse",
		url: "https://mcp.mifune.dev/sse",
		headers: { "x-mcp-key": "your_api_key" },
	},
};

const DEFAULT_A2A_CONFIG = {
	orchestra_a2a: {
		base_url: "https://a2a.mifune.dev",
		agent_card_path: "/.well-known/agent.json",
	},
};

class ToolConfig {
	static DEFAULT_MCP_CONFIG = DEFAULT_MCP_CONFIG;
	static DEFAULT_A2A_CONFIG = DEFAULT_A2A_CONFIG;
}

export default ToolConfig;
