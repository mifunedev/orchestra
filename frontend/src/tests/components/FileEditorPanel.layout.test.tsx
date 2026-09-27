import React from "react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import FileEditorPanel from "@/components/panels/FileEditorPanel";

const fixture = vi.hoisted(() => ({
	mobile: false,
	inferenceMode: false,
	isGenerating: false,
	isRecording: false,
	toggleInferenceMode: vi.fn(),
	startRecording: vi.fn(),
	stopRecording: vi.fn(),
	writeText: vi.fn(),
	zipFile: vi.fn(),
	generateZip: vi.fn(),
}));
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
		inferenceMode: fixture.inferenceMode,
		toggleInferenceMode: fixture.toggleInferenceMode,
		isGenerating: fixture.isGenerating,
		setIsGenerating: vi.fn(),
	}),
}));
vi.mock("@/lib/utils/apiClient", () => ({ default: { post: vi.fn() } }));
vi.mock("react-voice-visualizer", () => ({
	useVoiceVisualizer: () => ({
		isRecordingInProgress: fixture.isRecording,
		startRecording: fixture.startRecording,
		stopRecording: fixture.stopRecording,
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
		MoreHorizontal: Icon,
	};
});
vi.mock("jszip", () => ({
	default: class {
		file = fixture.zipFile;
		generateAsync = fixture.generateZip;
	},
}));
vi.mock("@/components/inputs/MonacoEditor", () => ({
	default: () => <textarea aria-label="Monaco editor" />,
}));
vi.mock("@/components/cards/MarkdownCard", () => ({
	default: ({ content }: { content: string }) => (
		<div data-testid="markdown-card">{content}</div>
	),
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
		fixture.inferenceMode = false;
		fixture.isGenerating = false;
		fixture.isRecording = false;
		fixture.generateZip.mockResolvedValue(new Blob());
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText: fixture.writeText.mockResolvedValue(undefined) },
		});
		context.fileSystem = new Map([
			["/one.txt", { content: ["one"] }],
			["/two.txt", { content: ["two"] }],
		]);
		context.openTabs = ["/one.txt"];
		context.activeFile = "/one.txt";
	});

	it("opens markdown in preview and toggles to code and back", () => {
		context.fileSystem.set("/one.md", { content: ["# First document"] });
		context.openTabs = ["/one.md"];
		context.activeFile = "/one.md";
		render(<FileEditorPanel />);

		expect(screen.getByTestId("markdown-card")).toHaveTextContent(
			"# First document",
		);
		expect(screen.queryByLabelText("Monaco editor")).not.toBeInTheDocument();
		fireEvent.pointerDown(
			screen.getByRole("button", { name: "File actions" }),
			{ button: 0, ctrlKey: false, pointerType: "mouse" },
		);
		fireEvent.click(screen.getByRole("menuitem", { name: "Show code" }));
		expect(screen.getByLabelText("Monaco editor")).toBeInTheDocument();
		expect(screen.queryByTestId("markdown-card")).not.toBeInTheDocument();
		fireEvent.pointerDown(
			screen.getByRole("button", { name: "File actions" }),
			{ button: 0, ctrlKey: false, pointerType: "mouse" },
		);
		fireEvent.click(screen.getByRole("menuitem", { name: "Preview markdown" }));
		expect(screen.getByTestId("markdown-card")).toHaveTextContent(
			"# First document",
		);
		expect(screen.queryByLabelText("Monaco editor")).not.toBeInTheDocument();
	});

	it("starts each newly selected markdown file in preview after viewing code", () => {
		context.fileSystem.set("/one.md", { content: ["# First document"] });
		context.fileSystem.set("/two.md", { content: ["# Second document"] });
		context.openTabs = ["/one.md", "/two.md"];
		context.activeFile = "/one.md";
		const { rerender } = render(<FileEditorPanel />);

		fireEvent.pointerDown(
			screen.getByRole("button", { name: "File actions" }),
			{ button: 0, ctrlKey: false, pointerType: "mouse" },
		);
		fireEvent.click(screen.getByRole("menuitem", { name: "Show code" }));
		expect(screen.getByLabelText("Monaco editor")).toBeInTheDocument();
		context.activeFile = "/two.md";
		rerender(<FileEditorPanel />);
		expect(screen.getByTestId("markdown-card")).toHaveTextContent(
			"# Second document",
		);
		expect(screen.queryByLabelText("Monaco editor")).not.toBeInTheDocument();
		context.activeFile = "/one.md";
		rerender(<FileEditorPanel />);
		expect(screen.getByTestId("markdown-card")).toHaveTextContent(
			"# First document",
		);
	});

	it.each(["html", "htm", "mmd"])(
		"opens .%s in code and permits preview",
		(extension) => {
			context.fileSystem.set(`/example.${extension}`, { content: ["sample"] });
			context.openTabs = [`/example.${extension}`];
			context.activeFile = `/example.${extension}`;
			render(<FileEditorPanel />);

			expect(screen.getByLabelText("Monaco editor")).toBeInTheDocument();
			const previewName =
				extension === "mmd" ? "Preview Mermaid diagram" : "Preview HTML";
			fireEvent.pointerDown(
				screen.getByRole("button", { name: "File actions" }),
				{ button: 0, ctrlKey: false, pointerType: "mouse" },
			);
			fireEvent.click(screen.getByRole("menuitem", { name: previewName }));
			if (extension === "mmd") {
				expect(screen.getByTestId("markdown-card")).toHaveTextContent("sample");
			} else {
				expect(
					screen.getByTitle(`Preview of /example.${extension}`),
				).toBeInTheDocument();
			}
		},
	);

	it("keeps HTML code-first after previewing markdown and resets markdown after HTML preview", () => {
		context.fileSystem.set("/one.md", { content: ["# First document"] });
		context.fileSystem.set("/example.html", { content: ["<p>Example</p>"] });
		context.openTabs = ["/one.md", "/example.html"];
		context.activeFile = "/one.md";
		const { rerender } = render(<FileEditorPanel />);

		expect(screen.getByTestId("markdown-card")).toBeInTheDocument();
		context.activeFile = "/example.html";
		rerender(<FileEditorPanel />);
		expect(screen.getByLabelText("Monaco editor")).toBeInTheDocument();
		fireEvent.pointerDown(
			screen.getByRole("button", { name: "File actions" }),
			{ button: 0, ctrlKey: false, pointerType: "mouse" },
		);
		fireEvent.click(screen.getByRole("menuitem", { name: "Preview HTML" }));
		expect(screen.getByTitle("Preview of /example.html")).toBeInTheDocument();
		context.activeFile = "/one.md";
		rerender(<FileEditorPanel />);
		expect(screen.getByTestId("markdown-card")).toHaveTextContent(
			"# First document",
		);
	});

	it("keeps non-previewable files in the editor after markdown preview", () => {
		context.fileSystem.set("/one.md", { content: ["# First document"] });
		context.openTabs = ["/one.md", "/one.txt"];
		context.activeFile = "/one.md";
		const { rerender } = render(<FileEditorPanel />);

		context.activeFile = "/one.txt";
		rerender(<FileEditorPanel />);
		expect(screen.getByLabelText("Monaco editor")).toBeInTheDocument();
		expect(screen.queryByTestId("markdown-card")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("menuitem", { name: "Show code" }),
		).not.toBeInTheDocument();
	});

	it("shows one file-actions trigger beside the tabs while keeping new-file and tab-close controls", () => {
		render(<FileEditorPanel />);
		expect(
			screen.getAllByRole("button", { name: "File actions" }),
		).toHaveLength(1);
		expect(
			screen.getByRole("button", { name: "Create new file" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Close /one.txt tab" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Toggle inference mode" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Start dictation" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Download current file" }),
		).not.toBeInTheDocument();
		fireEvent.pointerDown(
			screen.getByRole("button", { name: "File actions" }),
			{ button: 0, ctrlKey: false, pointerType: "mouse" },
		);
		expect(
			screen.getAllByRole("menuitem").map((item) => item.textContent),
		).toEqual([
			"Inference mode: Off",
			"Start dictation",
			"Copy current file",
			"Download current file",
			"Download all files as ZIP",
		]);
	});

	it("runs inference, dictation, copy, single-file download, and ZIP actions", async () => {
		const createObjectURL = vi.fn().mockReturnValue("blob:fixture");
		const revokeObjectURL = vi.fn();
		Object.defineProperty(URL, "createObjectURL", {
			configurable: true,
			value: createObjectURL,
		});
		Object.defineProperty(URL, "revokeObjectURL", {
			configurable: true,
			value: revokeObjectURL,
		});
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => {});
		try {
			render(<FileEditorPanel />);
			const select = (name: string) => {
				fireEvent.pointerDown(
					screen.getByRole("button", { name: "File actions" }),
					{ button: 0, ctrlKey: false, pointerType: "mouse" },
				);
				fireEvent.click(screen.getByRole("menuitem", { name }));
			};
			select("Inference mode: Off");
			expect(fixture.toggleInferenceMode).toHaveBeenCalledOnce();
			select("Start dictation");
			expect(fixture.startRecording).toHaveBeenCalledOnce();
			select("Copy current file");
			expect(fixture.writeText).toHaveBeenCalledWith("one");
			select("Download current file");
			expect(click).toHaveBeenCalledOnce();
			expect(createObjectURL).toHaveBeenCalledOnce();
			select("Download all files as ZIP");
			await vi.waitFor(() => expect(click).toHaveBeenCalledTimes(2));
			expect(fixture.zipFile).toHaveBeenCalledWith("/one.txt", "one");
			expect(fixture.zipFile).toHaveBeenCalledWith("/two.txt", "two");
			expect(fixture.generateZip).toHaveBeenCalledWith({ type: "blob" });
			expect(revokeObjectURL).toHaveBeenCalledTimes(2);
		} finally {
			click.mockRestore();
		}
	});

	it("shows stop dictation and active inference, and disables mode changes during recording", () => {
		fixture.isRecording = true;
		fixture.inferenceMode = true;
		render(<FileEditorPanel />);
		fireEvent.pointerDown(
			screen.getByRole("button", { name: "File actions" }),
			{ button: 0, ctrlKey: false, pointerType: "mouse" },
		);
		expect(
			screen.getByRole("menuitem", { name: "Inference mode: On" }),
		).toHaveAttribute("data-disabled");
		fireEvent.click(
			screen.getByRole("menuitem", { name: "Inference mode: On" }),
		);
		expect(fixture.toggleInferenceMode).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("menuitem", { name: "Stop dictation" }));
		expect(fixture.stopRecording).toHaveBeenCalledOnce();
	});

	it("disables dictation and inference while generating", () => {
		fixture.isGenerating = true;
		render(<FileEditorPanel />);
		fireEvent.pointerDown(
			screen.getByRole("button", { name: "File actions" }),
			{ button: 0, ctrlKey: false, pointerType: "mouse" },
		);
		expect(
			screen.getByRole("menuitem", { name: "Inference mode: Off" }),
		).toHaveAttribute("data-disabled");
		expect(
			screen.getByRole("menuitem", { name: "Start dictation" }),
		).toHaveAttribute("data-disabled");
		fireEvent.click(screen.getByRole("menuitem", { name: "Start dictation" }));
		expect(fixture.startRecording).not.toHaveBeenCalled();
	});

	it("opens the menu with a keyboard, selects an action, and dismisses with Escape", () => {
		render(<FileEditorPanel />);
		const trigger = screen.getByRole("button", { name: "File actions" });
		trigger.focus();
		fireEvent.keyDown(trigger, { key: "ArrowDown" });
		expect(
			screen.getByRole("menuitem", { name: "Inference mode: Off" }),
		).toBeInTheDocument();
		fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		trigger.focus();
		fireEvent.keyDown(trigger, { key: "Enter" });
		fireEvent.keyDown(
			screen.getByRole("menuitem", { name: "Inference mode: Off" }),
			{ key: "Enter" },
		);
		expect(fixture.toggleInferenceMode).toHaveBeenCalledOnce();
	});

	it("disables the action menu without a selected file or a ZIP to download", () => {
		context.activeFile = null;
		context.openTabs = [];
		context.fileSystem = new Map();
		const { rerender } = render(<FileEditorPanel />);
		const trigger = screen.getByRole("button", { name: "File actions" });
		expect(trigger).toBeDisabled();
		fireEvent.pointerDown(trigger, {
			button: 0,
			ctrlKey: false,
			pointerType: "mouse",
		});
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();

		context.fileSystem = new Map([["/one.txt", { content: ["one"] }]]);
		rerender(<FileEditorPanel />);
		expect(trigger).toBeDisabled();
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();

		context.fileSystem = new Map(context.fileSystem).set("/two.txt", {
			content: ["two"],
		});
		rerender(<FileEditorPanel />);
		expect(trigger).toBeEnabled();
		fireEvent.pointerDown(trigger, {
			button: 0,
			ctrlKey: false,
			pointerType: "mouse",
		});
		expect(
			screen.getAllByRole("menuitem").map((item) => item.textContent),
		).toEqual(["Download all files as ZIP"]);
		fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

		context.fileSystem = new Map([["/one.txt", { content: ["one"] }]]);
		context.activeFile = "/one.txt";
		context.openTabs = ["/one.txt"];
		rerender(<FileEditorPanel />);
		expect(trigger).toBeEnabled();
		fireEvent.pointerDown(trigger, {
			button: 0,
			ctrlKey: false,
			pointerType: "mouse",
		});
		expect(
			screen.queryByRole("menuitem", { name: "Download all files as ZIP" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("menuitem", { name: /Preview|Show code/ }),
		).not.toBeInTheDocument();
	});

	it("exposes the same action menu on mobile while keeping explorer navigation", () => {
		fixture.mobile = true;
		render(<FileEditorPanel />);
		fireEvent.pointerDown(
			screen.getByRole("button", { name: "File actions" }),
			{ button: 0, ctrlKey: false, pointerType: "mouse" },
		);
		expect(
			screen.getByRole("menuitem", { name: "Start dictation" }),
		).toBeInTheDocument();
		fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
		expect(
			screen.getByRole("button", { name: "Show file explorer" }),
		).toBeInTheDocument();
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
