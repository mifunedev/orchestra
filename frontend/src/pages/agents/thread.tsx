import { AgentCreateForm } from "@/components/forms/agents/agent-create-form";
import { useChatContext } from "@/context/ChatContext";
import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useParams } from "react-router-dom";
import { useAgentContext } from "@/context/AgentContext";
import { INIT_AGENT_STATE } from "@/hooks/useAgent";
import ChatLayout from "@/layouts/chat-layout-v2";
import { SidebarTrigger } from "@/components/ui/sidebar";

function AgentThreadPage() {
	const { agentId } = useParams();
	const { agent, setAgent, useEffectGetAgent, useEffectGetAgents } =
		useAgentContext();
	const {
		fromBackendFormat,
		clearBackendSyncFiles,
		clearThreadScopedFiles,
		runWithPersistentSyncSuspended,
	} = useChatContext();

	useEffectGetAgent(agentId!);
	useEffectGetAgents();

	useEffect(() => {
		setAgent({
			...agent,
			mcp: {},
			a2a: {},
		});
		return () => {
			setAgent(INIT_AGENT_STATE.agent);
			clearBackendSyncFiles();
			clearThreadScopedFiles();
		};
	}, []);

	useEffect(() => {
		if (agent?.files && Object.keys(agent.files).length > 0) {
			runWithPersistentSyncSuspended(() => {
				fromBackendFormat(agent.files);
			});
		}
	}, [agent?.id, fromBackendFormat, runWithPersistentSyncSuspended]);

	return (
		<ChatLayout>
			<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
				<div className="flex items-center gap-2 px-4 pt-4 pb-2">
					<SidebarTrigger />
					<h1 className="text-lg font-semibold">
						Assistant thread unavailable
					</h1>
				</div>
				<p role="status" className="px-4 pb-4 text-muted-foreground">
					Assistant conversations are unavailable in the Aegra experiment.
				</p>
				<ScrollArea className="flex-1 min-h-0 px-4">
					<AgentCreateForm />
				</ScrollArea>
			</div>
		</ChatLayout>
	);
}

export default AgentThreadPage;
