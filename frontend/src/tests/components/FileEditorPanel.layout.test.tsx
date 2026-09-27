import React from "react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import FileEditorPanel from "@/components/panels/FileEditorPanel";

const fixture = vi.hoisted(() => ({ mobile: false }));
const context = vi.hoisted(() => ({
	fileSystem: new Map<string, { content: string[] }>(),
	openTabs: [] as string[],
	activeFile: "/one.txt" as string | null,
	dirtyFiles: new Set<string>(),
	createFile: vi.fn(),
	updateFile: vi.fn(),
	deletePath: vi.fn(),
	renameFile: vi.fn(),
	closeTab: vi.fn(),
	selectTab: vi.fn(),
	markDirty: vi.fn(),
	savePersistentContextFiles: vi.fn(),
	setViewMode: vi.fn(),
	inputRef: { current: null },
}));

vi.mock("@/context/ChatContext", () => ({ useChatContext: () => context }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => fixture.mobile }));
vi.mock("@/hooks/useInferenceDictation", () => ({
	default: () => ({
		inferenceMode: false,
		toggleInferenceMode: vi.fn(),
		isGenerating: false,
		setIsGenerating: vi.fn(),
	}),
}));
vi.mock("@/lib/utils/apiClient", () => ({ default: { post: vi.fn() } }));
vi.mock("react-voice-visualizer", () => ({
	useVoiceVisualizer: () => ({
		isRecordingInProgress: false,
		recordedBlob: null,
	}),
	VoiceVisualizer: () => null,
}));
vi.mock("react-resizable-panels", () => ({
	PanelGroup: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="panel-group">{children}</div>
	),
	Panel: ({
		children,
		...props
	}: React.PropsWithChildren<Record<string, unknown>>) => (
		<div
			data-testid="panel"
			data-default-size={String(props.defaultSize)}
			data-collapsible={String(Boolean(props.collapsible))}
			className={String(props.className ?? "")}
		>
			{children}
		</div>
	),
	PanelResizeHandle: () => <div data-testid="resize-handle" />,
}));
vi.mock("lucide-react", () => {
	const Icon = () => <span />;
	return {
		FileText: Icon,
		Download: Icon,
		Check: Icon,
		Copy: Icon,
		Eye: Icon,
		Plus: Icon,
		X: Icon,
		Folder: Icon,
		Mic: Icon,
		Square: Icon,
		PanelLeft: Icon,
		Sparkles: Icon,
		Loader2: Icon,
	};
});
vi.mock("jszip", () => ({
	default: class {
		file() {}
		generateAsync() {
			return Promise.resolve(new Blob());
		}
	},
}));
vi.mock("@/components/inputs/MonacoEditor", () => ({
	default: () => <textarea aria-label="Monaco editor" />,
}));
vi.mock("@/components/cards/MarkdownCard", () => ({ default: () => null }));
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
		...props
	}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button {...props}>{children}</button>
	),
}));
vi.mock("@/components/ui/dialog", () => ({
	Dialog: () => null,
	DialogContent: () => null,
	DialogHeader: () => null,
	DialogTitle: () => null,
	DialogFooter: () => null,
}));
vi.mock("@/components/ui/context-menu", () => ({
	ContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	ContextMenuContent: () => null,
	ContextMenuItem: () => null,
	ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
}));
vi.mock("@/components/ui/input", () => ({ Input: () => null }));
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
		onFileSelect,
		onToggleCollapse,
	}: {
		onFileSelect: (path: string) => void;
		onToggleCollapse: () => void;
	}) => (
		<div aria-label="File explorer">
			<button onClick={() => onFileSelect("/two.txt")}>Select two.txt</button>
			<button onClick={onToggleCollapse}>Hide file explorer</button>
		</div>
	),
}));

describe("FileEditorPanel layout", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fixture.mobile = false;
		context.fileSystem = new Map([
			["/one.txt", { content: ["one"] }],
			["/two.txt", { content: ["two"] }],
		]);
		context.openTabs = ["/one.txt"];
		context.activeFile = "/one.txt";
	});

	it("places the editor before the resize handle and explorer on desktop", () => {
		render(<FileEditorPanel />);
		const group = screen.getByTestId("panel-group");
		const [editor, handle, explorer] = Array.from(group.children);
		expect(editor).toContainElement(screen.getByLabelText("Monaco editor"));
		expect(editor).toHaveAttribute("data-default-size", "80");
		expect(handle).toHaveAttribute("data-testid", "resize-handle");
		expect(explorer).toContainElement(screen.getByLabelText("File explorer"));
		expect(explorer).toHaveAttribute("data-default-size", "20");
		expect(explorer).toHaveAttribute("data-collapsible", "true");
	});

	it("keeps the editor visible after collapsing the desktop explorer", () => {
		render(<FileEditorPanel />);
		fireEvent.click(screen.getByRole("button", { name: "Hide file explorer" }));
		expect(screen.getByLabelText("Monaco editor")).toBeInTheDocument();
		expect(screen.queryByTestId("resize-handle")).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Show file explorer" }),
		).toBeInTheDocument();
	});

	it("selects a file from the mobile tree and restores it with the editor toggle", () => {
		fixture.mobile = true;
		render(<FileEditorPanel />);
		const editor = screen
			.getByLabelText("Monaco editor")
			.closest('[data-testid="panel"]')!;
		const tree = screen
			.getByLabelText("File explorer")
			.closest('[data-testid="panel"]')!;
		expect(tree).toHaveClass("hidden");
		expect(editor).not.toHaveClass("hidden");
		fireEvent.click(screen.getByRole("button", { name: "Show file explorer" }));
		expect(editor).toHaveClass("hidden");
		expect(tree).not.toHaveClass("hidden");
		fireEvent.click(
			within(tree as HTMLElement).getByRole("button", {
				name: "Select two.txt",
			}),
		);
		expect(context.selectTab).toHaveBeenCalledWith("/two.txt");
		expect(tree).toHaveClass("hidden");
		expect(editor).not.toHaveClass("hidden");
		fireEvent.click(screen.getByRole("button", { name: "Show file explorer" }));
		expect(tree).not.toHaveClass("hidden");
		expect(editor).toHaveClass("hidden");
	});
});
