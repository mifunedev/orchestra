import React, {
	useState,
	useMemo,
	useEffect,
	useCallback,
	useRef,
} from "react";
import { flushSync } from "react-dom";
import {
	FileText,
	Download,
	Check,
	Copy,
	MoreHorizontal,
	Eye,
	Plus,
	X,
	Folder,
	Mic,
	Square,
	PanelLeft,
	Sparkles,
	Loader2,
} from "lucide-react";
import { useVoiceVisualizer, VoiceVisualizer } from "react-voice-visualizer";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import apiClient from "@/lib/utils/apiClient";
import { MainToolTip } from "../tooltips/MainToolTip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import MonacoEditor from "@/components/inputs/MonacoEditor";
import MarkdownCard from "@/components/cards/MarkdownCard";
import JSZip from "jszip";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useChatContext } from "@/context/ChatContext";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FileTreeSidebar } from "./FileTree";
import useInferenceDictation from "@/hooks/useInferenceDictation";
import { useIsMobile } from "@/hooks/use-mobile";

interface BreadcrumbSegment {
	label: string;
	path: string;
	isLast: boolean;
}

type EditorActionType = "new_file" | "rename" | "delete";
type PendingEditorAction = {
	type: EditorActionType;
	path?: string;
} | null;
type PostDialogAction = {
	type: "delete";
	path: string;
	switchToChat: boolean;
} | null;
type FocusTarget = "editor" | "chat";

export default function FileEditorPanel() {
	// Use new fileSystem with proper tab semantics
	const {
		fileSystem,
		openTabs,
		activeFile,
		dirtyFiles,
		createFile,
		updateFile,
		deletePath,
		renameFile: renameFileAction,
		closeTab,
		selectTab,
		markDirty,
		savePersistentContextFiles,
		setViewMode,
		inputRef,
	} = useChatContext() as {
		fileSystem: Map<
			string,
			{
				content: string[];
				created_at: string;
				modified_at: string;
				source?: string;
			}
		>;
		openTabs: string[];
		activeFile: string | null;
		dirtyFiles: Set<string>;
		createFile: (path: string, content?: string) => void;
		updateFile: (path: string, content: string) => void;
		deletePath: (path: string) => void;
		renameFile: (oldPath: string, newPath: string) => void;
		closeTab: (path: string) => void;
		selectTab: (path: string) => void;
		markDirty: (path: string) => void;
		savePersistentContextFiles: (options?: {
			reason?: "manual" | "autosave";
			showSuccessToast?: boolean;
			force?: boolean;
		}) => Promise<boolean>;
		setViewMode: (mode: string) => void;
		inputRef: React.RefObject<HTMLTextAreaElement>;
	};

	const [copied, setCopied] = useState(false);
	const [previewOverride, setPreviewOverride] = useState<{
		file: string;
		showPreview: boolean;
	} | null>(null);

	// Dialog states
	const [pendingEditorAction, setPendingEditorAction] =
		useState<PendingEditorAction>(null);
	const [activeDialog, setActiveDialog] = useState<EditorActionType | null>(
		null,
	);
	const [postDialogAction, setPostDialogAction] =
		useState<PostDialogAction>(null);
	const [newFilePath, setNewFilePath] = useState("");
	const [dialogPath, setDialogPath] = useState<string | null>(null);
	const [renamePath, setRenamePath] = useState("");
	const [pathError, setPathError] = useState("");

	// Rename input ref for inline editing
	const renameInputRef = useRef<HTMLInputElement>(null);
	const editorPrimaryActionRef = useRef<HTMLButtonElement>(null);
	const [inlineRenaming, setInlineRenaming] = useState<string | null>(null);
	const [inlineRenamePath, setInlineRenamePath] = useState("");

	// Debounce timer ref
	const debounceRef = useRef<NodeJS.Timeout | null>(null);
	const pendingDebounceFileRef = useRef<string | null>(null);
	const latestEditorValueRef = useRef<string>("");

	// Track processed blobs to prevent re-processing
	const processedBlobRef = useRef<Blob | null>(null);

	// Tree sidebar state - auto-collapse on mobile
	const isMobile = useIsMobile();
	const [isTreeCollapsed, setIsTreeCollapsed] = useState(isMobile);

	// Voice recording state (derived from recorderControls below)
	const recorderControls = useVoiceVisualizer();
	const { startRecording, stopRecording, isRecordingInProgress, recordedBlob } =
		recorderControls;

	// Get file content for inference dictation context
	const getFileContent = useCallback(
		(filename: string): string => {
			const file = fileSystem.get(filename);
			if (!file) return "";
			return Array.isArray(file.content)
				? file.content.join("\n")
				: file.content;
		},
		[fileSystem],
	);

	// Inference dictation hook
	const { inferenceMode, toggleInferenceMode, isGenerating, setIsGenerating } =
		useInferenceDictation({
			activeFile: activeFile || undefined,
			fileContent: activeFile ? getFileContent(activeFile) : undefined,
		});

	// Memoized Monaco options to prevent re-initialization
	const monacoOptions = useMemo(
		() => ({
			minimap: true,
			lineNumbers: "on" as const,
			wordWrap: "on" as const,
			fontSize: 13,
		}),
		[],
	);

	// Get all file paths from fileSystem for validation
	const allFilePaths = useMemo(
		() => Array.from(fileSystem.keys()),
		[fileSystem],
	);
	const deleteTargetMatches = useMemo(() => {
		if (activeDialog !== "delete" || !dialogPath) {
			return [];
		}
		const folderPrefix = dialogPath.endsWith("/")
			? dialogPath
			: `${dialogPath}/`;
		return allFilePaths.filter(
			(path) => path === dialogPath || path.startsWith(folderPrefix),
		);
	}, [activeDialog, allFilePaths, dialogPath]);
	const isFolderDelete = Boolean(
		dialogPath &&
			!fileSystem.has(dialogPath) &&
			deleteTargetMatches.some((path) => path.startsWith(`${dialogPath}/`)),
	);

	// Use activeFile from context (no local selectedFile state needed)
	const selectedFile = activeFile;

	useEffect(() => {
		setPreviewOverride(null);
	}, [selectedFile]);

	// Keep editor value ref in sync (ref assignment, not state)
	latestEditorValueRef.current = selectedFile
		? getFileContent(selectedFile)
		: "";

	// Parse selected file path into breadcrumb segments
	const breadcrumbSegments = useMemo((): BreadcrumbSegment[] => {
		if (!selectedFile) return [];

		const parts = selectedFile.replace(/^\//, "").split("/").filter(Boolean);

		return parts.map((part: string, index: number) => ({
			label: part,
			path: "/" + parts.slice(0, index + 1).join("/"),
			isLast: index === parts.length - 1,
		}));
	}, [selectedFile]);

	// effectiveShowPreview is computed below, after helper function definitions

	// Use isRecordingInProgress directly instead of syncing to local state
	const isRecording = isRecordingInProgress;

	// Handle recorded blob - transcribe and optionally send to LLM for inference
	useEffect(() => {
		// Skip if no blob, no file, or if we've already processed this blob
		if (!recordedBlob || !selectedFile) return;
		if (processedBlobRef.current === recordedBlob) return;

		// Mark this blob as being processed
		processedBlobRef.current = recordedBlob;

		const formData = new FormData();
		formData.append("file", recordedBlob, "recording.webm");
		formData.append("model", "whisper-large-v3");
		formData.append("response_format", "verbose_json");
		formData.append("temperature", "0.0");
		formData.append("timeout", "30");

		apiClient
			.post("/llm/transcribe", formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			})
			.then(async (response) => {
				const transcribedText = response.data.transcript.text;
				if (!transcribedText || !selectedFile) return;

				if (inferenceMode) {
					// Inference mode: send to LLM for file generation
					setIsGenerating(true);
					try {
						// Get current file content for context (fresh at inference time)
						const currentFileContent = getFileContent(selectedFile);

						// Build files map with current file for LLM access
						const filesMap: Record<string, string> = {};
						if (currentFileContent) {
							filesMap[selectedFile] = currentFileContent;
						}

						// Build payload with file_system in input for LLM agent access
						const payload = {
							input: {
								messages: [{ role: "user", content: transcribedText }],
								files: Object.keys(filesMap).length > 0 ? filesMap : undefined,
							},
							generate_files: true,
							target_file: selectedFile,
							file_context: currentFileContent || undefined,
						};

						const streamResponse = await apiClient.post(
							"/llm/stream",
							payload,
							{
								responseType: "text",
								headers: {
									Accept: "text/event-stream",
								},
							},
						);

						// Parse SSE response for file content
						// Response format: data: ["stream_type", {payload}]
						const lines = streamResponse.data.split("\n");
						let generatedContent = "";

						for (const line of lines) {
							if (line.startsWith("data:")) {
								try {
									const data = JSON.parse(line.slice(5).trim());

									// Stream response is a tuple: [type, payload]
									if (Array.isArray(data) && data.length === 2) {
										const [streamType, payload] = data;

										// Handle "values" events which contain files
										if (streamType === "values" && payload?.files) {
											Object.entries(payload.files).forEach(
												([filePath, content]) => {
													if (typeof content === "string") {
														if (fileSystem.has(filePath)) {
															updateFile(filePath, content);
														} else {
															createFile(filePath, content);
														}
													}
												},
											);
										}

										// Handle "values" events to get AI response content
										if (streamType === "values" && payload?.messages) {
											// Get the last AI message content as generated content
											for (const msg of payload.messages) {
												if (msg.type === "ai" || msg.role === "assistant") {
													if (typeof msg.content === "string") {
														generatedContent = msg.content;
													}
												}
											}
										}

										// Handle "messages" events for streaming content
										if (streamType === "messages") {
											const [msgData] = Array.isArray(payload)
												? payload
												: [payload];
											if (
												msgData?.type === "ai" ||
												msgData?.role === "assistant"
											) {
												if (typeof msgData.content === "string") {
													generatedContent += msgData.content;
												}
											}
										}
									}
								} catch {
									// Ignore non-JSON lines
								}
							}
						}

						// If we have generated content and a target file, write it
						if (generatedContent && selectedFile) {
							// Extract code blocks if present, otherwise use raw content
							const codeBlockMatch = generatedContent.match(
								/```(?:\w+)?\n([\s\S]*?)```/,
							);
							const contentToWrite = codeBlockMatch
								? codeBlockMatch[1].trim()
								: generatedContent;

							updateFile(selectedFile, contentToWrite);
						}
					} catch (error) {
						console.error("Error generating content:", error);
					} finally {
						setIsGenerating(false);
					}
				} else {
					// Normal mode: insert transcribed text into editor
					const currentContent = getFileContent(selectedFile);
					const newContent = currentContent
						? `${currentContent}\n${transcribedText}`
						: transcribedText;
					updateFile(selectedFile, newContent);
				}
			})
			.catch((error) => {
				console.error("Error transcribing audio:", error);
			});
		// Note: fileSystem is intentionally excluded from deps to prevent re-triggering
		// The processedBlobRef prevents duplicate processing of the same blob
	}, [recordedBlob, selectedFile, inferenceMode]);

	const handleFileSelect = useCallback(
		(filename: string) => {
			// Use selectTab which opens the tab if not already open
			selectTab(filename);
			// On mobile, auto-collapse tree to show editor after file selection
			if (isMobile) {
				setIsTreeCollapsed(true);
			}
		},
		[selectTab, isMobile],
	);

	// Voice recording handlers
	const handleStartRecording = () => {
		if (startRecording) {
			startRecording();
		}
	};

	const handleStopRecording = () => {
		if (stopRecording) {
			stopRecording();
		}
	};

	const getLanguage = (filename: string): string => {
		const ext = filename.split(".").pop()?.toLowerCase();
		const langMap: Record<string, string> = {
			js: "javascript",
			ts: "typescript",
			tsx: "typescript",
			jsx: "javascript",
			py: "python",
			md: "markdown",
			json: "json",
			html: "html",
			css: "css",
			sh: "shell",
			bash: "shell",
			yml: "yaml",
			yaml: "yaml",
			xml: "xml",
			sql: "sql",
			go: "go",
			rs: "rust",
			java: "java",
			c: "c",
			cpp: "cpp",
			cs: "csharp",
			php: "php",
			rb: "ruby",
			swift: "swift",
			kt: "kotlin",
		};
		return langMap[ext || ""] || "plaintext";
	};

	const isMarkdownFile = (filename: string): boolean => {
		return filename.toLowerCase().endsWith(".md");
	};

	const isHtmlFile = (filename: string): boolean => {
		const lower = filename.toLowerCase();
		return lower.endsWith(".html") || lower.endsWith(".htm");
	};

	const isMermaidFile = (filename: string): boolean => {
		return filename.toLowerCase().endsWith(".mmd");
	};

	// Derive effective preview state — disable for non-previewable files
	const canPreview =
		!!selectedFile &&
		(isMarkdownFile(selectedFile) ||
			isHtmlFile(selectedFile) ||
			isMermaidFile(selectedFile));
	const effectiveShowPreview =
		canPreview &&
		(previewOverride?.file === selectedFile
			? previewOverride.showPreview
			: isMarkdownFile(selectedFile ?? ""));

	// Validate file path
	const validatePath = (path: string, excludePath?: string): string => {
		if (!path.trim()) return "Path is required";
		if (!path.startsWith("/")) return "Path must start with /";
		if (!/^\/[a-zA-Z0-9_\-./]+$/.test(path))
			return "Invalid characters in path";
		if (allFilePaths.includes(path) && path !== excludePath)
			return "File already exists";
		return "";
	};

	const normalizePath = (path: string): string => {
		const trimmed = path.trim();
		if (!trimmed) return "";
		return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
	};

	const getNewFileDraftPath = useCallback((parentPath?: string): string => {
		if (!parentPath) {
			return "";
		}

		if (parentPath === "/") {
			return "/";
		}

		return parentPath.endsWith("/") ? parentPath : `${parentPath}/`;
	}, []);

	const restoreFocus = useCallback(
		(target: FocusTarget) => {
			if (typeof window === "undefined") {
				return;
			}

			let attempts = 0;
			const focusOnAvailableTarget = () => {
				const element =
					target === "chat" ? inputRef.current : editorPrimaryActionRef.current;
				if (element) {
					element.focus();
					return;
				}

				if (attempts < 5) {
					attempts += 1;
					window.requestAnimationFrame(focusOnAvailableTarget);
				}
			};

			window.requestAnimationFrame(focusOnAvailableTarget);
		},
		[inputRef],
	);

	const handleDialogCloseAutoFocus = useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	useEffect(() => {
		if (!pendingEditorAction || activeDialog !== null) {
			return;
		}

		const animationFrame = window.requestAnimationFrame(() => {
			if (pendingEditorAction.type === "new_file") {
				setNewFilePath(getNewFileDraftPath(pendingEditorAction.path));
				setDialogPath(null);
			}

			if (pendingEditorAction.type === "rename") {
				setDialogPath(pendingEditorAction.path ?? null);
				setRenamePath(pendingEditorAction.path ?? "");
			}

			if (pendingEditorAction.type === "delete") {
				setDialogPath(pendingEditorAction.path ?? null);
			}

			setPathError("");
			setActiveDialog(pendingEditorAction.type);
			setPendingEditorAction(null);
		});

		return () => {
			window.cancelAnimationFrame(animationFrame);
		};
	}, [activeDialog, getNewFileDraftPath, pendingEditorAction]);

	useEffect(() => {
		if (!postDialogAction || activeDialog !== null) {
			return;
		}

		const animationFrame = window.requestAnimationFrame(() => {
			if (postDialogAction.type === "delete") {
				deletePath(postDialogAction.path);
				setPostDialogAction(null);

				if (postDialogAction.switchToChat) {
					setViewMode("chat");
					restoreFocus("chat");
					return;
				}

				restoreFocus("editor");
			}
		});

		return () => {
			window.cancelAnimationFrame(animationFrame);
		};
	}, [activeDialog, deletePath, postDialogAction, restoreFocus, setViewMode]);

	// Handle content change with debounce
	const handleContentChange = useCallback(
		(value: string | undefined) => {
			if (!selectedFile || value === undefined) return;

			latestEditorValueRef.current = value;

			// Mark as dirty immediately
			markDirty(selectedFile);

			// Debounce the actual update
			if (debounceRef.current) clearTimeout(debounceRef.current);
			pendingDebounceFileRef.current = selectedFile;
			debounceRef.current = setTimeout(() => {
				updateFile(selectedFile, value);
				debounceRef.current = null;
				pendingDebounceFileRef.current = null;
			}, 300);
		},
		[selectedFile, updateFile, markDirty],
	);

	const flushPendingEditorChange = useCallback(() => {
		if (
			!selectedFile ||
			!debounceRef.current ||
			pendingDebounceFileRef.current !== selectedFile
		) {
			return;
		}

		clearTimeout(debounceRef.current);
		debounceRef.current = null;
		pendingDebounceFileRef.current = null;

		flushSync(() => {
			updateFile(selectedFile, latestEditorValueRef.current);
		});
	}, [selectedFile, updateFile]);

	const handleManualPersistentSave = useCallback(async () => {
		if (!selectedFile || !fileSystem.has(selectedFile)) {
			return;
		}

		flushPendingEditorChange();
		await savePersistentContextFiles({
			reason: "manual",
			showSuccessToast: true,
			force: true,
		});
	}, [
		fileSystem,
		flushPendingEditorChange,
		savePersistentContextFiles,
		selectedFile,
	]);

	useEffect(() => {
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				!event.altKey ||
				event.key.toLowerCase() !== "s" ||
				!selectedFile ||
				!fileSystem.has(selectedFile)
			) {
				return;
			}

			event.preventDefault();
			void handleManualPersistentSave();
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [fileSystem, handleManualPersistentSave, selectedFile]);

	// Create new file (createFile auto-opens tab and selects)
	const handleCreateFile = () => {
		const normalizedPath = normalizePath(newFilePath);
		const error = validatePath(normalizedPath);
		if (error) {
			setPathError(error);
			return;
		}
		createFile(normalizedPath, "");
		setActiveDialog(null);
		setNewFilePath("");
		setPathError("");
		restoreFocus("editor");
	};

	const closeNewFileDialog = useCallback(() => {
		setActiveDialog(null);
		setNewFilePath("");
		setPathError("");
		restoreFocus("editor");
	}, [restoreFocus]);

	const closeDeleteDialog = useCallback(() => {
		setActiveDialog(null);
		setDialogPath(null);
		setPathError("");
		restoreFocus("editor");
	}, [restoreFocus]);

	// Rename file (renameFileAction handles tab and selection update)
	const handleRenameFile = () => {
		if (!dialogPath) return;
		const normalizedPath = normalizePath(renamePath);
		const error = validatePath(normalizedPath, dialogPath);
		if (error) {
			setPathError(error);
			return;
		}
		renameFileAction(dialogPath, normalizedPath);
		setActiveDialog(null);
		setDialogPath(null);
		setRenamePath("");
		setPathError("");
		restoreFocus("editor");
	};

	const closeRenameDialog = useCallback(() => {
		setActiveDialog(null);
		setDialogPath(null);
		setRenamePath("");
		setPathError("");
		restoreFocus("editor");
	}, [restoreFocus]);

	// Start deferred editor flows after Radix menus finish dismissing.
	const initiateDelete = useCallback((filename: string) => {
		setPendingEditorAction({ type: "delete", path: filename });
	}, []);

	const initiateRename = useCallback((filename: string) => {
		setPendingEditorAction({ type: "rename", path: filename });
	}, []);

	// Stable callbacks for FileTreeSidebar to prevent memo invalidation
	const handleOpenNewFileDialog = useCallback((parentPath?: string) => {
		setPendingEditorAction({ type: "new_file", path: parentPath });
	}, []);

	const handleDeleteConfirm = useCallback(() => {
		if (!dialogPath) {
			return;
		}

		const switchToChat = deleteTargetMatches.length === allFilePaths.length;
		setActiveDialog(null);
		setDialogPath(null);
		setPathError("");
		setPostDialogAction({
			type: "delete",
			path: dialogPath,
			switchToChat,
		});
	}, [allFilePaths.length, deleteTargetMatches.length, dialogPath]);

	const handleTreeCollapse = useCallback(() => {
		setIsTreeCollapsed(true);
	}, []);

	const handleTreeExpand = useCallback(() => {
		setIsTreeCollapsed(false);
	}, []);

	const handleToggleTreeCollapse = useCallback(() => {
		setIsTreeCollapsed((prev) => !prev);
	}, []);

	// Inline rename on double-click
	const handleDoubleClick = (filename: string) => {
		setInlineRenaming(filename);
		setInlineRenamePath(filename);
		setTimeout(() => renameInputRef.current?.select(), 0);
	};

	const handleInlineRenameSubmit = () => {
		if (!inlineRenaming) return;
		const normalizedPath = normalizePath(inlineRenamePath);
		const error = validatePath(normalizedPath, inlineRenaming);
		if (!error && normalizedPath !== inlineRenaming) {
			renameFileAction(inlineRenaming, normalizedPath);
		}
		setInlineRenaming(null);
		setInlineRenamePath("");
	};

	const handleInlineRenameKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleInlineRenameSubmit();
		} else if (e.key === "Escape") {
			setInlineRenaming(null);
			setInlineRenamePath("");
		}
	};

	// Copy current file content
	const handleCopy = async () => {
		if (!selectedFile) return;
		try {
			await navigator.clipboard.writeText(getFileContent(selectedFile));
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	// Download single file
	const handleDownloadFile = () => {
		if (!selectedFile) return;
		const content = getFileContent(selectedFile);
		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = selectedFile.split("/").pop() || selectedFile;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	// Download all files as ZIP
	const handleDownloadAllAsZip = async () => {
		const zip = new JSZip();
		allFilePaths.forEach((filename: string) => {
			const content = getFileContent(filename) || "";
			zip.file(filename, content);
		});
		try {
			const blob = await zip.generateAsync({ type: "blob" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `files-${Date.now()}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Failed to create ZIP:", err);
		}
	};

	// File breadcrumb component
	const FileBreadcrumb = () => {
		if (!selectedFile || breadcrumbSegments.length === 0) return null;

		return (
			<div className="px-3 py-1.5 border-b border-border bg-muted/20">
				<Breadcrumb>
					<BreadcrumbList className="text-xs">
						{/* Root indicator */}
						<BreadcrumbItem>
							<span className="font-mono text-muted-foreground">/</span>
						</BreadcrumbItem>

						{breadcrumbSegments.map((segment) => (
							<React.Fragment key={segment.path}>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									{segment.isLast ? (
										<BreadcrumbPage className="flex items-center gap-1">
											<FileText className="h-3 w-3" />
											<span className="font-medium">{segment.label}</span>
										</BreadcrumbPage>
									) : (
										<span className="flex items-center gap-1 text-muted-foreground">
											<Folder className="h-3 w-3" />
											<span>{segment.label}</span>
										</span>
									)}
								</BreadcrumbItem>
							</React.Fragment>
						))}
					</BreadcrumbList>
				</Breadcrumb>
			</div>
		);
	};

	return (
		<div
			className="h-full flex flex-col bg-background"
			role="main"
			aria-label="File editor"
		>
			<PanelGroup direction="horizontal" className="flex-1">
				{/* Editor Panel - hidden on mobile when sidebar is full-width */}
				<Panel
					defaultSize={80}
					className={isMobile && !isTreeCollapsed ? "hidden" : ""}
				>
					<div className="h-full flex flex-col">
						{/* File Tabs (VSCode-like) */}
						<div className="flex items-center border-b border-border bg-muted/30">
							{/* Toggle tree button when collapsed */}
							{isTreeCollapsed && (
								<MainToolTip content="Show file explorer" delayDuration={300}>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setIsTreeCollapsed(false)}
										className="h-9 px-2 border-r border-border rounded-none"
										aria-label="Show file explorer"
									>
										<PanelLeft className="h-4 w-4" />
									</Button>
								</MainToolTip>
							)}

							<ScrollArea className="flex-1">
								<div className="flex">
									{/* Iterate over openTabs (VSCode-like: only show open tabs) */}
									{openTabs.map((filename: string) => (
										<ContextMenu key={filename}>
											<ContextMenuTrigger asChild>
												<div
													role="tab"
													tabIndex={0}
													aria-selected={selectedFile === filename}
													onClick={() => handleFileSelect(filename)}
													onDoubleClick={() => handleDoubleClick(filename)}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															handleFileSelect(filename);
														}
													}}
													className={`
														px-3 py-2 text-sm border-r border-border cursor-pointer
														flex items-center gap-1.5 min-w-fit whitespace-nowrap
														hover:bg-accent transition-colors group relative
														${
															selectedFile === filename
																? "bg-background text-foreground border-b-2 border-b-primary"
																: "text-muted-foreground"
														}
													`}
												>
													<FileText className="h-3 w-3 flex-shrink-0" />
													{inlineRenaming === filename ? (
														<input
															ref={renameInputRef}
															value={inlineRenamePath}
															onChange={(e) =>
																setInlineRenamePath(e.target.value)
															}
															onBlur={handleInlineRenameSubmit}
															onKeyDown={handleInlineRenameKeyDown}
															onClick={(e) => e.stopPropagation()}
															className="bg-transparent border border-primary rounded px-1 text-sm w-32 focus:outline-none"
														/>
													) : (
														<>
															{dirtyFiles.has(filename) && (
																<span className="text-primary text-xs">•</span>
															)}
															<span>{filename.split("/").pop()}</span>
														</>
													)}
													{/* Close tab button - CLOSES TAB, does NOT delete file */}
													<button
														onClick={(e) => {
															e.stopPropagation();
															closeTab(filename);
														}}
														className="ml-1 p-1 md:p-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
														title="Close tab"
														aria-label={`Close ${filename} tab`}
													>
														<X className="h-4 w-4 md:h-3 md:w-3" />
													</button>
												</div>
											</ContextMenuTrigger>
											<ContextMenuContent>
												<ContextMenuItem
													onSelect={() => initiateRename(filename)}
												>
													Rename
												</ContextMenuItem>
												<ContextMenuItem
													onSelect={() => initiateDelete(filename)}
													className="text-destructive-accent"
												>
													Delete
												</ContextMenuItem>
											</ContextMenuContent>
										</ContextMenu>
									))}
									{/* New File Button */}
									<button
										ref={editorPrimaryActionRef}
										onClick={() => handleOpenNewFileDialog()}
										className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
										title="New File"
										aria-label="Create new file"
									>
										<Plus className="h-4 w-4" />
									</button>
								</div>
								<ScrollBar orientation="horizontal" />
							</ScrollArea>

							<div className="flex items-center px-2 border-l border-border">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											className="h-8 w-8 p-0"
											aria-label="File actions"
										>
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										{selectedFile && (
											<>
												<DropdownMenuItem
													onSelect={toggleInferenceMode}
													disabled={isRecording || isGenerating}
												>
													<Sparkles />
													Inference mode: {inferenceMode ? "On" : "Off"}
												</DropdownMenuItem>
												<DropdownMenuItem
													onSelect={
														isRecording
															? handleStopRecording
															: handleStartRecording
													}
													disabled={isGenerating}
												>
													{isRecording ? <Square /> : <Mic />}
													{isRecording ? "Stop dictation" : "Start dictation"}
												</DropdownMenuItem>
												{canPreview && (
													<DropdownMenuItem
														onSelect={() =>
															setPreviewOverride({
																file: selectedFile,
																showPreview: !effectiveShowPreview,
															})
														}
													>
														<Eye />
														{effectiveShowPreview
															? "Show code"
															: `Preview ${isHtmlFile(selectedFile) ? "HTML" : isMermaidFile(selectedFile) ? "Mermaid diagram" : "markdown"}`}
													</DropdownMenuItem>
												)}
												<DropdownMenuItem onSelect={handleCopy}>
													{copied ? <Check /> : <Copy />}
													Copy current file
												</DropdownMenuItem>
												<DropdownMenuItem onSelect={handleDownloadFile}>
													<Download />
													Download current file
												</DropdownMenuItem>
											</>
										)}
										{allFilePaths.length > 1 && (
											<DropdownMenuItem onSelect={handleDownloadAllAsZip}>
												<Download />
												Download all files as ZIP
											</DropdownMenuItem>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>

						{/* File Path Breadcrumb */}
						<FileBreadcrumb />

						{/* Voice Visualizer - only show when recording */}
						{isRecording && (
							<div className="px-4 py-2 bg-background border-b border-border">
								<VoiceVisualizer
									controls={recorderControls}
									height={35}
									width="100%"
									isControlPanelShown={false}
									isDefaultUIShown={false}
									onlyRecording={true}
									speed={1}
									barWidth={2}
								/>
							</div>
						)}

						{/* Generating Indicator - only show when generating */}
						{isGenerating && (
							<div className="px-4 py-3 bg-primary/5 border-b border-border flex items-center gap-3">
								<Loader2 className="h-4 w-4 animate-spin text-primary" />
								<span className="text-sm text-muted-foreground">
									Generating content from voice prompt...
								</span>
							</div>
						)}

						{/* Editor Area */}
						<div className="flex-1 overflow-hidden">
							{selectedFile && fileSystem.has(selectedFile) ? (
								<>
									{effectiveShowPreview && isMarkdownFile(selectedFile) ? (
										<ScrollArea className="h-full">
											<div className="p-6 max-w-4xl mx-auto">
												<MarkdownCard content={getFileContent(selectedFile)} />
											</div>
										</ScrollArea>
									) : effectiveShowPreview && isHtmlFile(selectedFile) ? (
										<iframe
											srcDoc={getFileContent(selectedFile)}
											sandbox="allow-same-origin"
											className="w-full h-full border-0 bg-white"
											title={`Preview of ${selectedFile}`}
										/>
									) : effectiveShowPreview && isMermaidFile(selectedFile) ? (
										<ScrollArea className="h-full">
											<div className="p-6 max-w-4xl mx-auto">
												<MarkdownCard
													content={`\`\`\`mermaid\n${getFileContent(selectedFile)}\n\`\`\``}
												/>
											</div>
										</ScrollArea>
									) : (
										<MonacoEditor
											key={selectedFile}
											value={getFileContent(selectedFile)}
											language={getLanguage(selectedFile)}
											handleChange={handleContentChange}
											height="100%"
											options={monacoOptions}
										/>
									)}
								</>
							) : allFilePaths.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
									<FileText className="h-12 w-12 opacity-50" />
									<p>No files yet</p>
									<Button
										variant="outline"
										onClick={() => handleOpenNewFileDialog()}
										className="gap-2"
									>
										<Plus className="h-4 w-4" />
										Create File
									</Button>
								</div>
							) : null}
						</div>
					</div>
				</Panel>

				{!isTreeCollapsed && !isMobile && (
					<PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />
				)}

				<Panel
					defaultSize={20}
					minSize={15}
					maxSize={35}
					collapsible
					collapsedSize={0}
					onCollapse={handleTreeCollapse}
					onExpand={handleTreeExpand}
					className={
						isTreeCollapsed ? "hidden" : isMobile ? "!flex-[1_1_100%]" : ""
					}
				>
					<FileTreeSidebar
						selectedFile={selectedFile}
						dirtyFiles={dirtyFiles}
						onFileSelect={handleFileSelect}
						onNewFile={handleOpenNewFileDialog}
						onRename={initiateRename}
						onDelete={initiateDelete}
						isCollapsed={isTreeCollapsed}
						onToggleCollapse={handleToggleTreeCollapse}
					/>
				</Panel>
			</PanelGroup>

			{/* New File Dialog */}
			<Dialog
				open={activeDialog === "new_file"}
				onOpenChange={(open) => {
					if (!open) {
						closeNewFileDialog();
					}
				}}
			>
				<DialogContent onCloseAutoFocus={handleDialogCloseAutoFocus}>
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
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={closeNewFileDialog}>
							Cancel
						</Button>
						<Button onClick={handleCreateFile}>Create</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog
				open={activeDialog === "delete"}
				onOpenChange={(open) => {
					if (!open) {
						closeDeleteDialog();
					}
				}}
			>
				<DialogContent onCloseAutoFocus={handleDialogCloseAutoFocus}>
					<DialogHeader>
						<DialogTitle>
							Delete {isFolderDelete ? "Folder" : "File"}
						</DialogTitle>
					</DialogHeader>
					<p className="py-4">
						Are you sure you want to delete{" "}
						<span className="font-mono text-sm bg-muted px-1 rounded">
							{dialogPath}
						</span>
						?
						{isFolderDelete && (
							<span className="block mt-2 text-sm text-muted-foreground">
								This removes {deleteTargetMatches.length} file
								{deleteTargetMatches.length === 1 ? "" : "s"} from the current
								workspace.
							</span>
						)}
						{dialogPath && dirtyFiles.has(dialogPath) && (
							<span className="block mt-2 text-sm text-amber-500">
								This file has unsaved changes.
							</span>
						)}
					</p>
					<DialogFooter>
						<Button variant="ghost" onClick={closeDeleteDialog}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDeleteConfirm}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Rename Dialog */}
			<Dialog
				open={activeDialog === "rename"}
				onOpenChange={(open) => {
					if (!open) {
						closeRenameDialog();
					}
				}}
			>
				<DialogContent onCloseAutoFocus={handleDialogCloseAutoFocus}>
					<DialogHeader>
						<DialogTitle>Rename File</DialogTitle>
					</DialogHeader>
					<div className="py-4">
						<Input
							placeholder="/path/to/file.ext"
							value={renamePath}
							onChange={(e) => {
								setRenamePath(e.target.value);
								setPathError("");
							}}
							onKeyDown={(e) => e.key === "Enter" && handleRenameFile()}
							autoFocus
						/>
						{pathError && (
							<p className="text-sm text-destructive-accent mt-2">
								{pathError}
							</p>
						)}
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={closeRenameDialog}>
							Cancel
						</Button>
						<Button onClick={handleRenameFile}>Rename</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
