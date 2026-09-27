import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatLayout from "@/layouts/chat-layout-v2";
import { useChatContext } from "@/context/ChatContext";
import { ChatNav } from "@/components/nav/ChatNav";
import ChatInput from "@/components/inputs/ChatInput";
import ChatMessages from "@/components/lists/ChatMessages";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { useAgentContext } from "@/context/AgentContext";
import { useProjectContext } from "@/context/ProjectContext";
import ProjectSection from "@/components/sections/project-section";
import ListProjectThreads from "@/components/lists/ListProjectThreads";
import ProjectService from "@/lib/services/projectService";
import { Project } from "@/lib/entities/project";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from "@/components/ui/resizable";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import FileEditorPanel from "@/components/panels/FileEditorPanel";
import { ArrowLeft } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export default function ProjectPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const navigate = useNavigate();
	const { loading, appVersion } = useAppContext();
	const { useEffectGetAgents } = useAgentContext();
	const {
		selectProject,
		handleUpdateProject,
		loading: projectLoading2,
	} = useProjectContext();
	const {
		messages,
		setViewMode,
		metadata,
		setMetadata,
		useListThreadsEffect,
		useListCheckpointsEffect,
		useModelsEffect,
		viewMode,
	} = useChatContext();

	const [project, setProject] = useState<Project | null>(null);
	const [projectLoading, setProjectLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const isMobile = useMediaQuery("(max-width: 768px)");

	useModelsEffect();
	useEffectGetAgents();
	useListThreadsEffect(!loading);
	useListCheckpointsEffect(!loading, metadata);

	// Fetch project data
	useEffect(() => {
		const fetchProject = async () => {
			if (!projectId) return;
			setProjectLoading(true);
			setError(null);
			try {
				const response = await ProjectService.get(projectId);
				const fetchedProject = response.data.project;
				setProject(fetchedProject);
				// Set selectedProject in context so ChatInput can access it
				selectProject(fetchedProject);
			} catch (err) {
				console.error("Failed to fetch project:", err);
				setError("Project not found");
			} finally {
				setProjectLoading(false);
			}
		};

		fetchProject();
	}, [projectId]);

	// Set project_id in metadata when page mounts and persist to localStorage
	useEffect(() => {
		if (projectId) {
			setMetadata((prev: any) => ({
				...prev,
				project_id: projectId,
			}));
			localStorage.setItem("current_project_id", projectId);
		}

		return () => {
			setMetadata((prev: any) => {
				const { project_id: _project_id, ...rest } = prev;
				return rest;
			});
			localStorage.removeItem("current_project_id");
			selectProject(null);
		};
	}, [projectId]);

	if (projectLoading) {
		return (
			<ChatLayout>
				<div className="flex h-full items-center justify-center">
					<p className="text-muted-foreground">Loading project...</p>
				</div>
			</ChatLayout>
		);
	}

	if (error || !project) {
		return (
			<ChatLayout>
				<div className="flex h-full flex-col items-center justify-center gap-4">
					<p className="text-muted-foreground">
						{error || "Project not found"}
					</p>
					<Button onClick={() => navigate("/chat")}>Go to Chat</Button>
				</div>
			</ChatLayout>
		);
	}

	// Show project view when no messages
	if (messages.length === 0) {
		return (
			<ChatLayout>
				<ChatNav sidebarTrigger={<SidebarTrigger />} />
				<div className="flex-1 flex flex-col bg-background overflow-hidden">
					{/* Centered Project Section */}
					<div className="flex flex-col items-center justify-center p-6 flex-1">
						<ProjectSection
							project={project}
							showAgentMenu={true}
							onProjectUpdated={(updatedProject) => {
								setProject(updatedProject);
								selectProject(updatedProject);
							}}
							onUpdate={handleUpdateProject}
							loading={projectLoading2}
						/>
					</div>

					{/* Project Threads Section */}
					<div className="flex-shrink-0 px-6">
						<div className="w-full max-w-2xl mx-auto">
							<div className="flex items-center gap-4 mb-4">
								<div className="h-px flex-1 bg-border" />
								<span className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
									Threads
								</span>
								<div className="h-px flex-1 bg-border" />
							</div>
						</div>
					</div>

					{/* Scrollable Thread List */}
					<div className="max-h-[35vh] overflow-y-auto px-6 pb-6 flex-shrink-0">
						<div className="w-full max-w-2xl mx-auto">
							<ListProjectThreads projectId={projectId!} />
						</div>
					</div>
				</div>
				<footer className="flex-shrink-0 bg-card">
					<div className="px-4 sm:px-6 lg:px-8 py-4">
						<p className="text-center text-muted-foreground text-xs">
							&copy; 2025 Ensō Labs. All rights reserved. v{appVersion}
						</p>
					</div>
				</footer>
			</ChatLayout>
		);
	}

	// Show chat view when there are messages
	return (
		<ChatLayout>
			<div className="flex h-full relative">
				{viewMode === "chat" ? (
					<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
						<ChatNav sidebarTrigger={<SidebarTrigger />} />
						<div className="flex-1 min-h-0">
							<ChatMessages messages={messages} />
						</div>
						<div className="sticky bottom-0 bg-background border-border">
							<div className="max-w-4xl mx-auto">
								<div className="flex flex-col gap-2 px-4 pb-4">
									<ChatInput showAgentMenu={true} />
								</div>
							</div>
						</div>
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
										<ChatMessages messages={messages} />
									</div>
									<div className="sticky bottom-0 bg-background border-border">
										<div className="max-w-4xl mx-auto">
											<div className="flex flex-col gap-2 px-4 pb-4">
												<ChatInput showAgentMenu={true} />
											</div>
										</div>
									</div>
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
									<ChatMessages messages={messages} />
								</div>
								<div className="sticky bottom-0 bg-background border-border">
									<div className="max-w-4xl mx-auto">
										<div className="flex flex-col gap-2 px-4 pb-4">
											<ChatInput showAgentMenu={true} />
										</div>
									</div>
								</div>
							</div>
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
					</>
				)}
			</div>
		</ChatLayout>
	);
}
