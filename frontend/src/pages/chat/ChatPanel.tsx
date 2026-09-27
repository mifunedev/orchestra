import ChatComposer from "@/components/chat/ChatComposer";
import ChatMessages from "@/components/lists/ChatMessages";
import AgentSection from "@/components/sections/agent-section";
import { useChatContext } from "@/context/ChatContext";
import ChatLayout from "@/layouts/ChatLayout";
import { Agent } from "@/lib/services/agentService";
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from "@/components/ui/resizable";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import FileEditorPanel from "@/components/panels/FileEditorPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface ChatPanelProps {
	agent?: Agent;
	chatNav?: React.ReactNode | undefined;
	sidebarTrigger?: React.ReactNode | undefined;
	showAgentMenu?: boolean;
	showSandboxStatus?: boolean;
}

function ChatPanel({
	agent,
	chatNav,
	showAgentMenu = true,
	showSandboxStatus = false,
}: ChatPanelProps) {
	const { messages, viewMode, setViewMode } = useChatContext();
	const isMobile = useMediaQuery("(max-width: 768px)");

	// Show AgentSection only when in chat mode with no messages and no files
	if (agent && messages.length === 0 && viewMode === "chat") {
		return (
			<ChatLayout>
				{chatNav}
				<div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
					<AgentSection
						agent={agent}
						showAgentMenu={showAgentMenu}
						showSandboxStatus={showSandboxStatus}
					/>
				</div>
			</ChatLayout>
		);
	}

	return (
		<div className="flex h-full relative">
			{viewMode === "chat" ? (
				// CHAT MODE (Default) - Full-width chat
				<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
					{chatNav}
					<div className="flex-1 min-h-0">
						<ChatMessages messages={messages} />
					</div>
					<ChatComposer
						showAgentMenu={showAgentMenu}
						showSandboxStatus={showSandboxStatus}
					/>
				</div>
			) : (
				<>
					{/* Desktop: ResizablePanel split view */}
					<ResizablePanelGroup
						direction="horizontal"
						className="hidden md:flex flex-1"
					>
						<ResizablePanel defaultSize={40} minSize={20} maxSize={50}>
							<div className="flex flex-col h-full min-h-0 overflow-hidden">
								{chatNav}
								<div className="flex-1 min-h-0">
									<ChatMessages messages={messages} />
								</div>
								<ChatComposer
									showAgentMenu={showAgentMenu}
									showSandboxStatus={showSandboxStatus}
								/>
							</div>
						</ResizablePanel>

						<ResizableHandle withHandle />

						<ResizablePanel defaultSize={60} minSize={50} maxSize={80}>
							<FileEditorPanel />
						</ResizablePanel>
					</ResizablePanelGroup>

					{/* Mobile: Sheet overlay with editor */}
					<div className="md:hidden flex-1 flex flex-col">
						{/* Background: Chat view */}
						<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
							{chatNav}
							<div className="flex-1 min-h-0">
								<ChatMessages messages={messages} />
							</div>
							<ChatComposer
								showAgentMenu={showAgentMenu}
								showSandboxStatus={showSandboxStatus}
							/>
						</div>

						{/* Foreground: Editor Sheet - Only on mobile */}
						{isMobile && (
							<Sheet open={true} onOpenChange={() => setViewMode("chat")}>
								<SheetContent
									side="right"
									className="w-full h-full p-0 max-w-none flex flex-col [&>button]:hidden"
									aria-label="File editor"
								>
									{/* Mobile header with Back button */}
									<div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background shrink-0">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setViewMode("chat")}
											className="gap-2"
											aria-label="Back to chat"
										>
											<ArrowLeft className="h-4 w-4" />
											<span>Back to Chat</span>
										</Button>
									</div>

									{/* Editor content */}
									<div className="flex-1 overflow-hidden">
										<FileEditorPanel />
									</div>
								</SheetContent>
							</Sheet>
						)}
					</div>
				</>
			)}
		</div>
	);
}

export default ChatPanel;
