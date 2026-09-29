import { ColorModeButton } from "@/components/buttons/ColorModeButton";
import NewThreadButton from "../buttons/NewThreadButton";
import { HelpButton } from "@/components/buttons/HelpButton";
import { SaveAsAssistantDialog } from "@/components/dialogs/SaveAsAssistantDialog";
import { Save } from "lucide-react";
import { useAgentContext } from "@/context/AgentContext";
import { Button } from "@/components/ui/button";
import AgentService from "@/lib/services/agentService";
import { toast } from "sonner";
import { useState } from "react";

export function ChatNav({
	sidebarTrigger,
}: {
	sidebarTrigger?: React.ReactNode | undefined;
}) {
	const { agent, handleGetAgents } = useAgentContext();
	const [saveDialogOpen, setSaveDialogOpen] = useState(false);

	const handleSaveAsAssistant = async (name: string, description: string) => {
		try {
			await AgentService.create({
				name,
				description,
				model: agent.model,
				prompt: agent.prompt,
				tools: agent.tools,
				subagents: agent.subagents,
				mcp: agent.mcp,
				a2a: agent.a2a,
				files: agent.files,
			});
			toast.success("Assistant saved successfully");
			await handleGetAgents();
		} catch {
			toast.error("Failed to save assistant");
		}
	};

	return (
		<header className="bg-transparent mb-1">
			<div className="mx-auto px-4 sm:px-6 lg:px-4 pt-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center">{sidebarTrigger}</div>

					<div className="flex items-center gap-2" data-tour="chat-nav-actions">
						<Button
							variant="outline"
							size="icon"
							className="h-9 w-9"
							onClick={() => setSaveDialogOpen(true)}
							aria-label="Save as Assistant"
							title="Save as Assistant"
						>
							<Save className="h-4 w-4" />
						</Button>
						<NewThreadButton />
						<HelpButton />
						<div className="w-9">
							<ColorModeButton />
						</div>
					</div>
				</div>
			</div>
			<SaveAsAssistantDialog
				isOpen={saveDialogOpen}
				onClose={() => setSaveDialogOpen(false)}
				onSave={handleSaveAsAssistant}
			/>
		</header>
	);
}
