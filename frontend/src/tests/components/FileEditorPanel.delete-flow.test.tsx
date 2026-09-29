import React, { useState } from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	render,
	screen,
	fireEvent,
	within,
	waitFor,
} from "@testing-library/react";
import FileEditorPanel from "@/components/panels/FileEditorPanel";
import ChatPanel from "@/pages/chat/ChatPanel";

const currentContext: Record<string, any> = {};
const mockUseChatContext = vi.fn(() => currentContext);

const buildFileData = (content: string) => ({
	content: [content],
	created_at: "2024-01-01T00:00:00Z",
	modified_at: "2024-01-01T00:00:00Z",
});

vi.mock("@/context/ChatContext", () => ({
	useChatContext: () => mockUseChatContext(),
}));

vi.mock("@/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

vi.mock("@/hooks/useMediaQuery", () => ({
	useMediaQuery: () => false,
}));

vi.mock("@/lib/utils/apiClient", () => ({
	default: {
		post: vi.fn(),
	},
}));

vi.mock("react-voice-visualizer", () => ({
	useVoiceVisualizer: () => ({
		startRecording: vi.fn(),
		stopRecording: vi.fn(),
		isRecordingInProgress: false,
		recordedBlob: null,
	}),
	VoiceVisualizer: () => null,
}));

vi.mock("react-resizable-panels", () => ({
	PanelGroup: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	PanelResizeHandle: () => <div />,
}));

vi.mock("@/components/ui/resizable", () => ({
	ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ResizablePanel: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ResizableHandle: () => <div />,
}));

vi.mock("@/components/ui/sheet", () => ({
	Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SheetContent: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("lucide-react", () => {
	const Icon = () => <span />;
	return {
		FileText: Icon,
		Download: Icon,
		Check: Icon,
		Copy: Icon,
		MoreHorizontal: Icon,
		Eye: Icon,
		Plus: Icon,
		X: Icon,
		Folder: Icon,
		Mic: Icon,
		Square: Icon,
		PanelLeft: Icon,
		Sparkles: Icon,
		Loader2: Icon,
		ArrowLeft: Icon,
	};
});

vi.mock("jszip", () => ({
	default: class JSZipMock {
		file() {}
		async generateAsync() {
			return new Blob();
		}
	},
}));

vi.mock("@/components/inputs/MonacoEditor", () => ({
	default: ({
		value,
		handleChange,
	}: {
		value: string;
		handleChange?: (value: string) => void;
	}) => (
		<textarea
			aria-label="Monaco editor"
			defaultValue={value}
			onChange={(event) => handleChange?.(event.target.value)}
		/>
	),
}));

vi.mock("@/components/cards/MarkdownCard", () => ({
	default: () => null,
}));

vi.mock("@/components/tooltips/MainToolTip", () => ({
	MainToolTip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
	ScrollArea: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ScrollBar: () => null,
}));

vi.mock("@/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		...props
	}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/components/ui/dialog", () => ({
	Dialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
	}) => (open ? <div data-testid="dialog-root">{children}</div> : null),
	DialogContent: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DialogTitle: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/components/ui/context-menu", () => ({
	ContextMenu: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="context-menu">{children}</div>
	),
	ContextMenuContent: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ContextMenuItem: ({
		children,
		onClick,
		onSelect,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		onSelect?: () => void;
	}) => <button onClick={onSelect ?? onClick}>{children}</button>,
	ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
}));

vi.mock("@/components/ui/input", () => ({
	Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
		<input {...props} />
	),
}));

vi.mock("@/components/ui/breadcrumb", () => ({
	Breadcrumb: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	BreadcrumbItem: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	BreadcrumbList: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	BreadcrumbPage: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	BreadcrumbSeparator: () => <span>/</span>,
}));

vi.mock("@/components/panels/FileTree", () => ({
	FileTreeSidebar: ({
		selectedFile,
		onDelete,
		onNewFile,
	}: {
		selectedFile: string | null;
		onDelete: (path: string) => void;
		onNewFile: (parentPath?: string) => void;
	}) => (
		<div>
			<button
				onClick={() => {
					if (selectedFile) {
						onDelete(selectedFile);
					}
				}}
				aria-label="Tree Delete Selected"
			>
				Tree Delete Selected
			</button>
			<button
				onClick={() => onDelete("/folder")}
				aria-label="Tree Delete Folder"
			>
				Tree Delete Folder
			</button>
			<button onClick={() => onNewFile("/folder")} aria-label="Tree New File">
				Tree New File
			</button>
		</div>
	),
}));

vi.mock("@/components/chat/ChatComposer", () => ({
	default: () => {
		const { inputRef } = mockUseChatContext();
		return (
			<div>
				<textarea ref={inputRef} aria-label="Chat composer" />
				<button type="button">Submit chat</button>
			</div>
		);
	},
}));

vi.mock("@/components/lists/ChatMessages", () => ({
	default: () => <div>messages</div>,
}));

vi.mock("@/components/sections/agent-section", () => ({
	default: () => <div>agent</div>,
}));

vi.mock("@/layouts/ChatLayout", () => ({
	default: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

type HarnessOptions = {
	files: Record<string, string>;
	useChatPanel?: boolean;
};

function renderHarness({ files, useChatPanel = false }: HarnessOptions) {
	const inputRef = React.createRef<HTMLTextAreaElement>();
	const events: string[] = [];
	const createFile = vi.fn();
	const updateFile = vi.fn();
	const deletePath = vi.fn();
	const renameFile = vi.fn();
	const closeTab = vi.fn();
	const selectTab = vi.fn();
	const markDirty = vi.fn();
	const savePersistentContextFiles = vi.fn().mockResolvedValue(true);
	const setViewModeSpy = vi.fn();

	function Harness() {
		const initialPaths = Object.keys(files);
		const [viewMode, setViewMode] = useState<"chat" | "editor">("editor");
		const [fileSystem, setFileSystem] = useState(
			() =>
				new Map(
					Object.entries(files).map(([path, content]) => [
						path,
						buildFileData(content),
					]),
				),
		);
		const [openTabs, setOpenTabs] = useState<string[]>(initialPaths);
		const [activeFile, setActiveFile] = useState<string | null>(
			initialPaths[0] ?? null,
		);

		currentContext.fileSystem = fileSystem;
		currentContext.openTabs = openTabs;
		currentContext.activeFile = activeFile;
		currentContext.dirtyFiles = new Set<string>();
		currentContext.createFile = (path: string, content = "") => {
			createFile(path, content);
			events.push(`create:${path}`);
			setFileSystem((prev) => {
				const next = new Map(prev);
				next.set(path, buildFileData(content));
				return next;
			});
			setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
			setActiveFile(path);
			setViewMode("editor");
		};
		currentContext.updateFile = updateFile;
		currentContext.deletePath = (path: string) => {
			deletePath(path);
			events.push(`delete:${path}`);
			setFileSystem((prev) => {
				const next = new Map(prev);
				for (const currentPath of Array.from(next.keys())) {
					if (
						currentPath === path ||
						currentPath.startsWith(`${path.replace(/\/$/, "")}/`)
					) {
						next.delete(currentPath);
					}
				}

				const remainingPaths = Array.from(next.keys());
				setOpenTabs((prevTabs) =>
					prevTabs.filter(
						(tab) =>
							tab !== path && !tab.startsWith(`${path.replace(/\/$/, "")}/`),
					),
				);
				setActiveFile((current) => {
					if (
						current &&
						(current === path ||
							current.startsWith(`${path.replace(/\/$/, "")}/`))
					) {
						return remainingPaths[0] ?? null;
					}

					return current;
				});
				return next;
			});
		};
		currentContext.renameFile = (oldPath: string, newPath: string) => {
			renameFile(oldPath, newPath);
			setFileSystem((prev) => {
				const next = new Map(prev);
				const existing = next.get(oldPath);
				if (existing) {
					next.delete(oldPath);
					next.set(newPath, existing);
				}
				return next;
			});
			setOpenTabs((prev) =>
				prev.map((tab) => (tab === oldPath ? newPath : tab)),
			);
			setActiveFile((current) => (current === oldPath ? newPath : current));
		};
		currentContext.closeTab = (path: string) => {
			closeTab(path);
			setOpenTabs((prev) => prev.filter((tab) => tab !== path));
		};
		currentContext.selectTab = (path: string) => {
			selectTab(path);
			setActiveFile(path);
			setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
		};
		currentContext.markDirty = markDirty;
		currentContext.savePersistentContextFiles = savePersistentContextFiles;
		currentContext.setViewMode = (mode: "chat" | "editor") => {
			setViewModeSpy(mode);
			events.push(`view:${mode}`);
			setViewMode(mode);
		};
		currentContext.inputRef = inputRef;
		currentContext.messages = [];
		currentContext.viewMode = viewMode;

		return useChatPanel ? (
			<ChatPanel chatNav={<div>nav</div>} />
		) : (
			<FileEditorPanel />
		);
	}

	return {
		...render(<Harness />),
		createFile,
		deletePath,
		renameFile,
		selectTab,
		setViewModeSpy,
		events,
	};
}

describe("FileEditorPanel delete flow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.keys(currentContext).forEach((key) => {
			delete currentContext[key];
		});
	});

	it("keeps the editor interactive after a file-tree delete", async () => {
		const { createFile, deletePath } = renderHarness({
			files: { "/test.txt": "hello" },
		});

		fireEvent.click(
			screen.getByRole("button", { name: "Tree Delete Selected" }),
		);

		const deleteDialog = await screen.findByTestId("dialog-root");
		expect(within(deleteDialog).getByText("Delete File")).toBeInTheDocument();

		fireEvent.click(
			within(deleteDialog).getByRole("button", { name: "Delete" }),
		);

		await waitFor(() => {
			expect(deletePath).toHaveBeenCalledWith("/test.txt");
		});

		fireEvent.click(screen.getByRole("button", { name: "Create new file" }));

		const createDialog = await screen.findByTestId("dialog-root");
		fireEvent.change(
			within(createDialog).getByPlaceholderText("/path/to/file.ext"),
			{
				target: { value: "/after-delete.txt" },
			},
		);
		fireEvent.click(
			within(createDialog).getByRole("button", { name: "Create" }),
		);

		await waitFor(() => {
			expect(createFile).toHaveBeenCalledWith("/after-delete.txt", "");
		});
	});

	it("keeps tab interactions working after a tab-menu delete", async () => {
		const { deletePath, selectTab } = renderHarness({
			files: {
				"/first.txt": "one",
				"/second.txt": "two",
			},
		});

		const tabMenus = screen.getAllByTestId("context-menu");
		fireEvent.click(
			within(tabMenus[0]).getByRole("button", { name: "Delete" }),
		);

		const deleteDialog = await screen.findByTestId("dialog-root");
		fireEvent.click(
			within(deleteDialog).getByRole("button", { name: "Delete" }),
		);

		await waitFor(() => {
			expect(deletePath).toHaveBeenCalledWith("/first.txt");
		});

		fireEvent.click(
			within(screen.getAllByTestId("context-menu")[0]).getByText("second.txt"),
		);

		expect(selectTab).toHaveBeenCalledWith("/second.txt");
	});

	it("keeps the editor interactive after a folder delete", async () => {
		const { createFile, deletePath } = renderHarness({
			files: {
				"/folder/one.txt": "one",
				"/folder/two.txt": "two",
				"/keep.txt": "keep",
			},
		});

		fireEvent.click(screen.getByRole("button", { name: "Tree Delete Folder" }));

		const deleteDialog = await screen.findByTestId("dialog-root");
		expect(within(deleteDialog).getByText("Delete Folder")).toBeInTheDocument();
		fireEvent.click(
			within(deleteDialog).getByRole("button", { name: "Delete" }),
		);

		await waitFor(() => {
			expect(deletePath).toHaveBeenCalledWith("/folder");
		});

		fireEvent.click(screen.getByRole("button", { name: "Create new file" }));

		const createDialog = await screen.findByTestId("dialog-root");
		fireEvent.change(
			within(createDialog).getByPlaceholderText("/path/to/file.ext"),
			{
				target: { value: "/keep-adding.txt" },
			},
		);
		fireEvent.click(
			within(createDialog).getByRole("button", { name: "Create" }),
		);

		await waitFor(() => {
			expect(createFile).toHaveBeenCalledWith("/keep-adding.txt", "");
		});
	});

	it("returns to chat and restores chat focus after deleting the last file", async () => {
		const { deletePath, events, setViewModeSpy } = renderHarness({
			files: { "/only.txt": "hello" },
			useChatPanel: true,
		});

		fireEvent.click(
			screen.getByRole("button", { name: "Tree Delete Selected" }),
		);

		const deleteDialog = await screen.findByTestId("dialog-root");
		fireEvent.click(
			within(deleteDialog).getByRole("button", { name: "Delete" }),
		);

		await waitFor(() => {
			expect(deletePath).toHaveBeenCalledWith("/only.txt");
			expect(setViewModeSpy).toHaveBeenCalledWith("chat");
		});

		await waitFor(() => {
			expect(screen.getByLabelText("Chat composer")).toHaveFocus();
		});

		expect(events).toEqual(["delete:/only.txt", "view:chat"]);
	});
});
