import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockChatContext = vi.hoisted(() => ({
	fileSystem: new Map<string, any>(),
	openTabs: [] as string[],
	activeFile: "/test.txt" as string | null,
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

vi.mock("@/context/ChatContext", () => ({
	useChatContext: () => mockChatContext,
}));

vi.mock("@/hooks/useInferenceDictation", () => ({
	default: () => ({
		inferenceMode: false,
		toggleInferenceMode: vi.fn(),
		isGenerating: false,
		setIsGenerating: vi.fn(),
	}),
}));

vi.mock("@/hooks/use-mobile", () => ({
	useIsMobile: () => false,
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
	Dialog: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
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
		<div>{children}</div>
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
	FileTreeSidebar: () => <div>tree</div>,
}));

import FileEditorPanel from "@/components/panels/FileEditorPanel";

describe("FileEditorPanel manual save", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		mockChatContext.fileSystem = new Map([
			[
				"/test.txt",
				{
					content: ["test content"],
					created_at: "2024-01-01T00:00:00Z",
					modified_at: "2024-01-01T00:00:00Z",
				},
			],
		]);
		mockChatContext.openTabs = [];
		mockChatContext.activeFile = "/test.txt";
		mockChatContext.dirtyFiles = new Set();
		mockChatContext.savePersistentContextFiles.mockResolvedValue(true);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("flushes the pending editor debounce before Alt+S saves", () => {
		render(<FileEditorPanel />);

		fireEvent.change(screen.getByLabelText("Monaco editor"), {
			target: { value: "latest content" },
		});

		expect(mockChatContext.markDirty).toHaveBeenCalledWith("/test.txt");
		expect(mockChatContext.updateFile).not.toHaveBeenCalled();

		fireEvent.keyDown(window, { altKey: true, key: "s" });

		expect(mockChatContext.updateFile).toHaveBeenCalledWith(
			"/test.txt",
			"latest content",
		);
		expect(mockChatContext.savePersistentContextFiles).toHaveBeenCalledWith({
			reason: "manual",
			showSuccessToast: true,
			force: true,
		});

		vi.advanceTimersByTime(300);
		expect(mockChatContext.updateFile).toHaveBeenCalledTimes(1);
	});

	it("does not handle Alt+S when the panel is not mounted", () => {
		fireEvent.keyDown(window, { altKey: true, key: "s" });

		expect(mockChatContext.savePersistentContextFiles).not.toHaveBeenCalled();
		expect(mockChatContext.updateFile).not.toHaveBeenCalled();
	});
});
