import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatLayout from "@/layouts/chat-layout-v2";
import { useChatContext } from "@/context/ChatContext";
import { ChatNav } from "@/components/nav/ChatNav";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatMessages from "@/components/lists/ChatMessages";
import ChatMessagesSkeleton from "@/components/lists/ChatMessagesSkeleton";
import { useAppContext } from "@/context/AppContext";
import { useAgentContext } from "@/context/AgentContext";
import { useProjectContext } from "@/context/ProjectContext";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from "@/components/ui/resizable";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import FileEditorPanel from "@/components/panels/FileEditorPanel";
import useModel from "@/hooks/useModel";
import { ArrowLeft } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export default function ThreadPage() {
	const { threadId, projectId } = useParams<{
		threadId: string;
		projectId?: string;
	}>();
	const navigate = useNavigate();
	const { loading } = useAppContext();
	const { useEffectGetAgents } = useAgentContext();
	const { selectProject, projects } = useProjectContext();
	const { setModel } = useModel();
	const {
		messages,
		setMessages,
		metadata,
		setViewMode,
		setMetadata,
		setFilesMap,
		clearThreadScopedFiles,
		clearMessages,
		setCheckpoints,
		useListThreadsEffect,
		useModelsEffect,
		viewMode,
		setTodos,
		useLoadThreadEffect,
		threadLoading,
		threadError,
	} = useChatContext();
	const isMobile = useMediaQuery("(max-width: 768px)");
	const hasLiveThreadState =
		metadata?.thread_id === threadId && messages.length > 0;
	const isRouteThreadMismatch =
		Boolean(threadId) &&
		Boolean(metadata?.thread_id) &&
		metadata.thread_id !== threadId;
	const effectiveThreadLoading =
		!hasLiveThreadState &&
		!threadError &&
		(threadLoading || messages.length === 0 || isRouteThreadMismatch);
	const effectiveThreadError = !hasLiveThreadState ? threadError : null;

	useModelsEffect();
	useEffectGetAgents();
	useListThreadsEffect(!loading);

	useEffect(() => {
		if (!threadId || metadata?.thread_id === threadId) {
			return;
		}

		setMessages([]);
		clearThreadScopedFiles();
		setCheckpoints([]);
		setTodos([]);
		setViewMode("chat");
		setMetadata((prev: any) => ({
			...prev,
			thread_id: threadId,
		}));
	}, [
		threadId,
		metadata?.thread_id,
		setMessages,
		clearThreadScopedFiles,
		setCheckpoints,
		setTodos,
		setViewMode,
		setMetadata,
	]);

	useLoadThreadEffect(
		threadId,
		{
			setCheckpoints,
			setMessages,
			setMetadata,
			setFilesMap,
			setTodos,
			setModel,
		},
		{
			enabled: !hasLiveThreadState,
		},
	);

	// Handle project context if on /p/:projectId/t/:threadId
	useEffect(() => {
		if (projectId) {
			setMetadata((prev: any) => ({
				...prev,
				project_id: projectId,
			}));
			localStorage.setItem("current_project_id", projectId);

			// Set selectedProject
			const project = projects.find((p: any) => p.id === projectId);
			if (project) {
				selectProject(project);
			}
		}

		return () => {
			if (projectId) {
				setMetadata((prev: any) => {
					const { project_id: _project_id, ...rest } = prev;
					return rest;
				});
				localStorage.removeItem("current_project_id");
				selectProject(null);
			}
		};
	}, [projectId, projects]);

	if (effectiveThreadError) {
		return (
			<ChatLayout>
				<div className="flex h-full flex-col items-center justify-center gap-4">
					<p className="text-muted-foreground">{effectiveThreadError}</p>
					<button
						onClick={() => {
							clearMessages();
							clearThreadScopedFiles();
							navigate("/chat");
						}}
						className="text-primary hover:underline"
					>
						Go to Chat
					</button>
				</div>
			</ChatLayout>
		);
	}

	return (
		<ChatLayout>
			<div className="flex h-full relative">
				{viewMode === "chat" ? (
					<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
						<ChatNav sidebarTrigger={<SidebarTrigger />} />
						<div className="flex-1 min-h-0">
							{effectiveThreadLoading ? (
								<ChatMessagesSkeleton />
							) : (
								<ChatMessages messages={messages} />
							)}
						</div>
						<ChatComposer showAgentMenu={true} showSandboxStatus={true} />
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
									<ChatNav sidebarTrigger={<SidebarTrigger />} />
									<div className="flex-1 min-h-0">
										{effectiveThreadLoading ? (
											<ChatMessagesSkeleton />
										) : (
											<ChatMessages messages={messages} />
										)}
									</div>
									<ChatComposer showAgentMenu={true} showSandboxStatus={true} />
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
								<ChatNav sidebarTrigger={<SidebarTrigger />} />
								<div className="flex-1 min-h-0">
									{effectiveThreadLoading ? (
										<ChatMessagesSkeleton />
									) : (
										<ChatMessages messages={messages} />
									)}
								</div>
								<ChatComposer showAgentMenu={true} showSandboxStatus={true} />
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
										<div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background shrink-0">
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
		</ChatLayout>
	);
}
