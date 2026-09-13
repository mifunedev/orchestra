import agentService, { Agent } from "@/lib/services/agentService";
import { useEffect, useState } from "react";
import ToolConfig from "@/lib/config/tool";
import { DropdownMenuCheckboxItemProps } from "@radix-ui/react-dropdown-menu";
import useModel from "./useModel";
import { useMountEffect } from "./useMountEffect";

type Checked = DropdownMenuCheckboxItemProps["checked"];

export type AgentState = {
	agent: Agent;
	agents: Agent[];
	publicAgents: Agent[];
};

export const INIT_AGENT_STATE: AgentState = {
	agent: {
		name: "",
		description: "",
		prompt: "",
		tools: [],
		model: "",
		mcp: {},
		a2a: {},
		subagents: [],
	},
	agents: [],
	publicAgents: [],
};

export function useAgent() {
	const { updateQueryStateModel } = useModel();

	const [agent, setAgent] = useState<Agent>(INIT_AGENT_STATE.agent);
	const [agents, setAgents] = useState<Agent[]>([]);
	const [publicAgents, setPublicAgents] = useState<Agent[]>([]);
	const [isLoadingAgents, setIsLoadingAgents] = useState(false);
	const [isLoadingPublicAgents, setIsLoadingPublicAgents] = useState(false);
	const [webSearchCheck, setWebSearchCheck] = useState<Checked>(() => {
		const saved = localStorage.getItem("orchestra:tool:search");
		return saved !== null ? JSON.parse(saved) : true;
	});

	const setAgentSystemMessage = (system: string) => {
		setAgent({ ...agent, prompt: system });
	};

	const addAgentToSubagents = (newAgent: Agent) => {
		setAgent({ ...agent, subagents: [...(agent.subagents || []), newAgent] });
	};

	const removeAgentFromSubagents = (agentId: string) => {
		setAgent({
			...agent,
			subagents: (agent.subagents || []).filter(
				(subagent) => subagent.id !== agentId,
			),
		});
	};

	const toggleSubagent = (targetAgent: Agent) => {
		const isSelected = (agent.subagents || []).some(
			(subagent) => subagent.id === targetAgent.id,
		);
		if (isSelected) {
			removeAgentFromSubagents(targetAgent.id!);
		} else {
			addAgentToSubagents(targetAgent);
		}
	};

	const isAgentSelected = (agentId: string) => {
		return (agent.subagents || []).some((subagent) => subagent.id === agentId);
	};

	const setAgentSubagents = (subagents: Agent[]) => {
		setAgent({
			...agent,
			subagents: [...(agent.subagents || []), ...subagents],
		});
	};

	const handleGetAgents = async () => {
		setIsLoadingAgents(true);
		try {
			const response = await agentService.search();
			setAgents(response.data.assistants);
		} catch (error) {
			console.error("Failed to fetch agents:", error);
			setAgents([]);
		} finally {
			setIsLoadingAgents(false);
		}
	};

	const handleGetPublicAgents = async (
		limit = 50,
		offset = 0,
		sortBy?: "fork_count" | "published_at" | "updated_at",
		tags?: string[],
	) => {
		setIsLoadingPublicAgents(true);
		try {
			const response = await agentService.listPublic(
				limit,
				offset,
				sortBy,
				tags,
			);
			setPublicAgents(response.data.assistants);
		} catch (error) {
			console.error("Failed to fetch public agents:", error);
			setPublicAgents([]);
		} finally {
			setIsLoadingPublicAgents(false);
		}
	};

	const handleGetAgent = async (id: string) => {
		try {
			// First try to get from user's namespace
			const response = await agentService.search({
				filter: {
					id: id,
				},
			});
			if (response.data.assistants && response.data.assistants.length > 0) {
				setAgent(response.data.assistants[0]);
				updateQueryStateModel(response.data.assistants[0].model);
				return;
			}
		} catch (error) {
			console.error("Failed to fetch agent from user namespace:", error);
		}

		// Fallback to public endpoint if not found in user's namespace
		try {
			const publicResponse = await agentService.getPublic(id);
			if (publicResponse.data.assistant) {
				// PublicAssistant excludes system_prompt, tools, mcp, a2a, subagents for security
				// Set defaults for fields that the UI expects
				setAgent({
					...publicResponse.data.assistant,
					system_prompt: publicResponse.data.assistant.system_prompt ?? "",
					tools: publicResponse.data.assistant.tools ?? [],
					mcp: publicResponse.data.assistant.mcp ?? {},
					a2a: publicResponse.data.assistant.a2a ?? {},
					subagents: publicResponse.data.assistant.subagents ?? [],
				});
				updateQueryStateModel(publicResponse.data.assistant.model);
			}
		} catch (error) {
			console.error("Failed to fetch public agent:", error);
		}
	};

	const useEffectGetAgent = (id: string) => {
		// Must react to id changes — agent pages may stay mounted while id changes
		// eslint-disable-next-line react-hooks/exhaustive-deps
		useEffect(() => {
			handleGetAgent(id);
		}, [id]);
	};

	const useEffectGetAgents = () => {
		useMountEffect(() => {
			handleGetAgents();
			return () => {
				setAgents([]);
			};
		});
	};

	const useEffectGetPublicAgents = () => {
		useMountEffect(() => {
			handleGetPublicAgents();
			return () => {
				setPublicAgents([]);
			};
		});
	};

	const clearMcp = () => {
		setAgent({ ...agent, mcp: {} });
	};

	const clearA2a = () => {
		setAgent({ ...agent, a2a: {} });
	};

	const loadMcpTemplate = () => {
		setAgent({ ...agent, mcp: ToolConfig.DEFAULT_MCP_CONFIG });
	};

	const loadA2aTemplate = () => {
		setAgent({ ...agent, a2a: ToolConfig.DEFAULT_A2A_CONFIG });
	};

	const setAgentTools = (tools: string[]) => {
		setAgent({ ...agent, tools: tools });
	};

	return {
		agent,
		setAgent,
		setAgentSystemMessage,
		agents,
		publicAgents,
		isLoadingAgents,
		isLoadingPublicAgents,
		handleGetAgents,
		handleGetPublicAgents,
		useEffectGetAgents,
		useEffectGetPublicAgents,
		useEffectGetAgent,
		handleGetAgent,
		clearMcp,
		clearA2a,
		loadMcpTemplate,
		loadA2aTemplate,
		setAgentSubagents,
		addAgentToSubagents,
		removeAgentFromSubagents,
		toggleSubagent,
		isAgentSelected,
		webSearchCheck,
		setWebSearchCheck,
		setAgentTools,
		updateQueryStateModel,
	};
}

export default useAgent;
