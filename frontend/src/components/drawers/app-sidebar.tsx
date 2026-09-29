import * as React from "react";
import { useState, useCallback } from "react";
import { MoreHorizontal, Trash2, Plus, FileText } from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	useSidebar,
} from "@/components/ui/sidebar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/context/ChatContext";
import { formatContent, truncateFrom } from "@/lib/utils/format";
import { useAgentContext } from "@/context/AgentContext";
import { useProjectContext } from "@/context/ProjectContext";
import { Project } from "@/lib/entities/project";
import { CreateProjectModal } from "@/components/modals/CreateProjectModal";
import { AddSourceModal } from "@/components/modals/AddSourceModal";
import { formatDistanceToNow } from "date-fns";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useLinkClick from "@/hooks/useLinkClick";
import { SettingsPopover } from "@/components/popovers/SettingsPopover";
import { ActivityBar, type PanelId } from "@/components/sidebar/ActivityBar";
import { SidePanel } from "@/components/sidebar/SidePanel";

// Route-based panels navigate to a full page instead of showing a side panel
const ROUTE_PANELS: Partial<Record<PanelId, string>> = {
	assistants: "/assistants",
	memories: "/memories",
};

// ---------- Item components (unchanged logic) ----------

interface ThreadItemProps {
	thread: any;
}

function ThreadItem({ thread }: ThreadItemProps) {
	const { metadata } = useChatContext();
	const { agent } = useAgentContext();
	const { isMobile, setOpenMobile } = useSidebar();
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const messages = thread.value?.messages || [];
	const fileCount = Object.keys(thread.value?.files || {}).length;
	const lastMessage = messages
		.filter((msg: any) => msg.type === "human")
		.slice(-1)[0];
	const isSelected = metadata?.thread_id === thread.value?.thread_id;

	const getThreadTitle = () => {
		if (thread.value?.title) return thread.value?.title;
		if (!lastMessage) return "Empty thread";
		const content =
			typeof lastMessage.content === "string"
				? lastMessage.content
				: formatContent(lastMessage.content);
		if (!content) return "Empty thread";
		const firstLine = content.split("\n")[0];
		return truncateFrom(firstLine, "end", "...", 50);
	};

	const handleThreadClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		const threadUrl = pathname.startsWith("/assistant/")
			? `/assistant/${agent.id}/thread/${thread.value?.thread_id || thread.key}`
			: `/thread/${thread.value?.thread_id || thread.key}`;

		if (event.ctrlKey || event.metaKey) {
			window.open(threadUrl, "_blank", "noopener,noreferrer");
			return;
		}

		navigate(threadUrl);

		if (isMobile) {
			setOpenMobile(false);
		}
	};

	const threadTitle = getThreadTitle();
	const model =
		lastMessage?.model?.split(":")[1] || lastMessage?.model || "N/A";
	const relativeTime = thread.updated_at
		? formatDistanceToNow(new Date(thread.updated_at), { addSuffix: true })
		: "";

	return (
		<SidebarMenuItem className="mb-1 group/thread relative">
			<SidebarMenuButton
				asChild
				isActive={isSelected}
				className={`h-auto px-3 py-3 rounded-lg border transition-all ${
					isSelected
						? "bg-sidebar-accent border-sidebar-accent shadow-sm"
						: "bg-transparent border-sidebar-border hover:bg-sidebar-accent/50 hover:border-sidebar-accent/50"
				}`}
			>
				<button
					onClick={handleThreadClick}
					className="flex items-start gap-2.5 w-full"
				>
					<div className="flex flex-col min-w-0 flex-1 gap-1.5">
						<div className="flex items-start justify-between gap-2 w-full">
							<span
								className={`text-sm leading-tight line-clamp-2 ${
									isSelected
										? "font-semibold text-sidebar-accent-foreground"
										: "font-medium text-sidebar-foreground"
								}`}
							>
								{threadTitle}
							</span>
							{relativeTime && (
								<span className="text-[10px] text-sidebar-foreground/40 shrink-0 font-normal mt-0.5 whitespace-nowrap">
									{relativeTime}
								</span>
							)}
						</div>
						<div className="flex items-center gap-2.5 text-[11px] text-sidebar-foreground/50">
							<div className="flex items-center gap-1">
								<span className="font-medium">{fileCount}</span>
								<span>file{fileCount !== 1 ? "s" : ""}</span>
							</div>
							<span className="text-sidebar-foreground/30">&bull;</span>
							<div className="flex items-center gap-1 truncate">
								<span className="truncate">{model}</span>
							</div>
						</div>
					</div>
				</button>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}

interface ProjectItemProps {
	project: Project;
	onAddSource: (project: Project) => void;
}

function ProjectItem({ project, onAddSource }: ProjectItemProps) {
	const { selectedProject, selectProject, handleDeleteProject } =
		useProjectContext();
	const { setMetadata } = useChatContext();
	const { isMobile, setOpenMobile } = useSidebar();
	const navigate = useNavigate();

	const isSelected = selectedProject?.id === project.id;
	const sourceCount = project.sources?.length || 0;

	const handleProjectClick = () => {
		selectProject(project);
		setMetadata((prev: any) => ({
			...prev,
			project_id: project.id,
		}));
		if (isMobile) {
			setOpenMobile(false);
		}
		navigate(`/p/${project.id}`);
	};

	const handleDeleteClick = async () => {
		if (window.confirm("Are you sure you want to delete this project?")) {
			const deleted = await handleDeleteProject(project.id!);
			if (deleted) {
				setMetadata((prev: any) => {
					const { project_id: _project_id, ...rest } = prev;
					return rest;
				});
			}
		}
	};

	const relativeTime = project.updated_at
		? formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })
		: "";

	return (
		<SidebarMenuItem className="mb-1 group/project relative">
			<SidebarMenuButton
				asChild
				isActive={isSelected}
				className={`h-auto px-3 py-3 rounded-lg border transition-all ${
					isSelected
						? "bg-sidebar-accent border-sidebar-accent shadow-sm"
						: "bg-transparent border-sidebar-border hover:bg-sidebar-accent/50 hover:border-sidebar-accent/50"
				}`}
			>
				<button
					onClick={handleProjectClick}
					className="flex items-start gap-2.5 w-full"
				>
					<div className="flex flex-col min-w-0 flex-1 gap-1.5">
						<div className="flex items-start justify-between gap-2 w-full">
							<span
								className={`text-sm leading-tight line-clamp-2 ${
									isSelected
										? "font-semibold text-sidebar-accent-foreground"
										: "font-medium text-sidebar-foreground"
								}`}
							>
								{project.name}
							</span>
							{relativeTime && (
								<span className="text-[10px] text-sidebar-foreground/40 shrink-0 font-normal mt-0.5 whitespace-nowrap">
									{relativeTime}
								</span>
							)}
						</div>
						{project.description && (
							<span className="text-xs text-sidebar-foreground/60 truncate">
								{project.description}
							</span>
						)}
						<div className="flex items-center gap-2.5 text-[11px] text-sidebar-foreground/50">
							<div className="flex items-center gap-1">
								<FileText className="w-3 h-3" />
								<span>
									{sourceCount} source{sourceCount !== 1 ? "s" : ""}
								</span>
							</div>
						</div>
					</div>
				</button>
			</SidebarMenuButton>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="absolute right-2 bottom-2 opacity-0 group-hover/project:opacity-100 transition-opacity h-6 w-6"
						onClick={(e) => e.stopPropagation()}
					>
						<MoreHorizontal className="h-3.5 w-3.5 text-sidebar-foreground/60" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48">
					<DropdownMenuItem
						onClick={() => onAddSource(project)}
						className="cursor-pointer"
					>
						<Plus className="mr-2 h-4 w-4" />
						Add Source
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={handleDeleteClick}
						className="text-red-300 focus:text-red-400 hover:text-red-300 cursor-pointer"
					>
						<Trash2 className="mr-2 h-4 w-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarMenuItem>
	);
}

// ---------- Main AppSidebar component ----------

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const {
		threads,
		loadMoreThreads,
		hasMoreThreads,
		isLoadingMoreThreads,
		clearMessages,
	} = useChatContext();
	const { projects, useEffectGetProjects } = useProjectContext();
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const onLogoLinkClick = useLinkClick("/");

	// Modal state
	const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] =
		useState(false);
	const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
	const [selectedProjectForSource, setSelectedProjectForSource] =
		useState<Project | null>(null);

	// Activity bar panel state
	const [activePanel, setActivePanel] = useState<PanelId | null>("threads");

	// Fetch projects on mount
	useEffectGetProjects();

	// Filter out threads associated with a project
	const unassociatedThreads = threads.filter(
		(thread: any) => !thread.value?.project_id,
	);

	const handleAddSource = useCallback((project: Project) => {
		setSelectedProjectForSource(project);
		setIsAddSourceModalOpen(true);
	}, []);

	const handlePanelToggle = useCallback(
		(panelId: PanelId) => {
			const route = ROUTE_PANELS[panelId];

			if (route) {
				// Route-based panels: navigate to full page
				navigate(route);
			}

			// Switch the active tab
			setActivePanel(panelId);
		},
		[navigate],
	);

	// Auto-highlight based on route
	React.useEffect(() => {
		if (pathname.startsWith("/assistants")) {
			setActivePanel("assistants");
		} else if (pathname.startsWith("/memories")) {
			setActivePanel("memories");
		}
	}, [pathname]);

	const renderThreadItem = useCallback(
		(thread: any) => <ThreadItem thread={thread} />,
		[],
	);

	const renderProjectItem = useCallback(
		(project: Project) => (
			<ProjectItem project={project} onAddSource={handleAddSource} />
		),
		[handleAddSource],
	);

	return (
		<>
			<Sidebar {...props} autoFocus={false} data-tour="sidebar">
				<SidebarHeader>
					<Link
						to="/"
						onClick={(e) => {
							clearMessages();
							onLogoLinkClick(e);
						}}
						className="flex items-center gap-2 m-2"
					>
						<span className="flex items-center gap-0.5">
							<img
								src="https://avatars.githubusercontent.com/u/139279732?s=200&v=4"
								alt="Logo"
								className="w-10 h-10 rounded-full pl-0"
							/>
							<h1 className="text-3xl font-bold text-foreground italic">
								RCHESTRA
							</h1>
						</span>
					</Link>
					{/* Icon tabs row */}
					<ActivityBar
						activePanel={activePanel}
						onPanelToggle={handlePanelToggle}
					/>
				</SidebarHeader>
				<SidebarContent className="gap-0">
					<SidePanel
						activePanel={activePanel}
						threads={unassociatedThreads}
						projects={projects}
						loadMoreThreads={loadMoreThreads}
						hasMoreThreads={hasMoreThreads}
						isLoadingMoreThreads={isLoadingMoreThreads}
						renderThreadItem={renderThreadItem}
						onCreateProject={() => setIsCreateProjectModalOpen(true)}
						renderProjectItem={renderProjectItem}
					/>
				</SidebarContent>
				<SidebarFooter>
					<div data-tour="settings-popover">
						<SettingsPopover />
					</div>
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>

			<CreateProjectModal
				isOpen={isCreateProjectModalOpen}
				onClose={() => setIsCreateProjectModalOpen(false)}
			/>

			<AddSourceModal
				isOpen={isAddSourceModalOpen}
				onClose={() => {
					setIsAddSourceModalOpen(false);
					setSelectedProjectForSource(null);
				}}
				project={selectedProjectForSource}
			/>
		</>
	);
}
