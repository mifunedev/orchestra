import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Globe, Wrench } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAgentContext } from "@/context/AgentContext";
import { useChatContext } from "@/context/ChatContext";
import ImageUpload from "../inputs/ImageUpload";
import { ToolSelectionModal } from "@/components/modals/ToolSelectionModal";
import { getSettings } from "@/lib/services/userSettingsService";
import { getAuthToken } from "@/lib/utils/auth";

const FALLBACK_TOOLS = [
	"web_search",
	"web_scrape",
	"math_calculator",
	"think_tool",
];

const WEB_SEARCH_TOOLS = ["web_search", "web_scrape"];

export function BaseToolMenu() {
	const { agent, setAgent, agents, webSearchCheck, setWebSearchCheck } =
		useAgentContext();
	const [pendingSubagentIds, setPendingSubagentIds] = useState<string[] | null>(
		null,
	);
	const { addFile, setViewMode } = useChatContext();
	const [open, setOpen] = useState<boolean>(false);
	const [showToolModal, setShowToolModal] = useState(false);
	const [showFileDialog, setShowFileDialog] = useState(false);
	const [newFilePath, setNewFilePath] = useState("");
	const [pathError, setPathError] = useState("");
	// Validate file path
	const validatePath = (path: string): string => {
		if (!path.trim()) return "Path is required";
		if (!path.startsWith("/")) return "Path must start with /";
		if (!/^\/[a-zA-Z0-9_\-./]+$/.test(path))
			return "Invalid characters in path";
		return "";
	};

	const handleCreateFile = () => {
		const trimmedPath = newFilePath.trim();
		const normalizedPath = trimmedPath.startsWith("/")
			? trimmedPath
			: `/${trimmedPath}`;
		const error = validatePath(normalizedPath);
		if (error) {
			setPathError(error);
			return;
		}
		addFile(normalizedPath, "");
		setViewMode("editor");
		setShowFileDialog(false);
		setNewFilePath("");
		setPathError("");
		setOpen(false);
	};

	useEffect(() => {
		if (!getAuthToken()) {
			setAgent((prev) => ({
				...prev,
				tools: [...new Set([...prev.tools, ...FALLBACK_TOOLS])],
			}));
			return;
		}
		getSettings()
			.then((res) => {
				const tools = res.defaults.tools ?? FALLBACK_TOOLS;
				const mcp = res.defaults.mcp ?? {};
				const a2a = res.defaults.a2a ?? {};
				setAgent((prev) => ({
					...prev,
					tools: [...new Set([...prev.tools, ...tools])],
					mcp,
					a2a,
				}));
				if (res.defaults.subagents) {
					setPendingSubagentIds(res.defaults.subagents);
				}
			})
			.catch(() => {
				setAgent((prev) => ({
					...prev,
					tools: [...new Set([...prev.tools, ...FALLBACK_TOOLS])],
				}));
			});
	}, []);

	// Resolve pending subagent IDs to Agent objects once agents list is available
	useEffect(() => {
		if (
			!pendingSubagentIds ||
			pendingSubagentIds.length === 0 ||
			agents.length === 0
		)
			return;
		const resolved = agents.filter(
			(a) => a.id && pendingSubagentIds.includes(a.id),
		);
		setAgent((prev) => ({ ...prev, subagents: resolved }));
		setPendingSubagentIds(null);
	}, [agents, pendingSubagentIds]);

	useEffect(() => {
		localStorage.setItem(
			"orchestra:tool:search",
			JSON.stringify(webSearchCheck),
		);
		if (webSearchCheck) {
			setAgent((prev) => ({
				...prev,
				tools: [...new Set([...prev.tools, ...WEB_SEARCH_TOOLS])],
			}));
		} else {
			setAgent((prev) => ({
				...prev,
				tools: prev.tools.filter((tool) => !WEB_SEARCH_TOOLS.includes(tool)),
			}));
		}
	}, [webSearchCheck]);

	return (
		<>
			<DropdownMenu open={open}>
				<DropdownMenuTrigger asChild>
					<Button
						data-tour="tools-menu-button"
						onClick={() => setOpen(!open)}
						size="icon"
						variant="outline"
						className="relative rounded-full ml-1 bg-foreground/10 text-foreground-500 cursor-pointer"
					>
						<Plus className="h-5 w-5" />
						{agent.tools.length > 0 && (
							<span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
								{agent.tools.length}
							</span>
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className="w-64 rounded-xl"
					align="start"
					onInteractOutside={() => setOpen(false)}
					onEscapeKeyDown={() => setOpen(false)}
				>
					{/* Attachments */}
					<DropdownMenuGroup>
						<ImageUpload />
					</DropdownMenuGroup>

					<DropdownMenuSeparator className="h-px bg-muted-foreground/30" />

					{/* Quick Toggles */}
					<DropdownMenuGroup>
						<DropdownMenuLabel className="text-xs text-muted-foreground">
							Quick Toggles
						</DropdownMenuLabel>
						<DropdownMenuItem
							onClick={() => setWebSearchCheck(!webSearchCheck)}
							className="flex items-center gap-3 cursor-pointer text-base rounded-lg"
						>
							<Globe className="h-12 w-12" />
							<span>Web Search {webSearchCheck ? "✅" : "🚫"}</span>
						</DropdownMenuItem>
					</DropdownMenuGroup>

					<DropdownMenuSeparator className="h-px bg-muted-foreground/30" />

					{/* Advanced */}
					<DropdownMenuGroup>
						<DropdownMenuLabel className="text-xs text-muted-foreground">
							Advanced
						</DropdownMenuLabel>
						<DropdownMenuItem
							onClick={() => {
								setShowToolModal(true);
								setOpen(false);
							}}
							className="flex items-center gap-3 cursor-pointer text-base rounded-lg"
						>
							<Wrench className="h-4 w-4" />
							<span>Configure Tools</span>
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Tool Selection Modal */}
			<ToolSelectionModal
				isOpen={showToolModal}
				onClose={() => setShowToolModal(false)}
				initialSelectedTools={agent.tools || []}
				initialMcpConfig={agent.mcp as Record<string, any>}
				initialA2aConfig={agent.a2a as Record<string, any>}
			/>

			{/* New File Dialog */}
			<Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New File</DialogTitle>
					</DialogHeader>
					<div className="py-4">
						<Input
							placeholder="/path/to/file.ext"
							value={newFilePath}
							onChange={(e) => {
								setNewFilePath(e.target.value);
								setPathError("");
							}}
							onKeyDown={(e) => e.key === "Enter" && handleCreateFile()}
							autoFocus
						/>
						{pathError && (
							<p className="text-sm text-destructive-accent mt-2">
								{pathError}
							</p>
						)}
						<p className="text-xs text-muted-foreground mt-2">
							Example: /src/main.py, /data/config.json
						</p>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => {
								setShowFileDialog(false);
								setNewFilePath("");
								setPathError("");
							}}
						>
							Cancel
						</Button>
						<Button onClick={handleCreateFile}>Create</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

export default BaseToolMenu;
