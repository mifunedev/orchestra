import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import ThreadPage from "./ThreadPage";

const mockUseChatContext = vi.fn();
const mockUseAppContext = vi.fn();
const mockUseAgentContext = vi.fn();
const mockUseProjectContext = vi.fn();
const mockUseModel = vi.fn();

vi.mock("@/context/ChatContext", () => ({
	useChatContext: () => mockUseChatContext(),
}));

vi.mock("@/context/AppContext", () => ({
	useAppContext: () => mockUseAppContext(),
}));

vi.mock("@/context/AgentContext", () => ({
	useAgentContext: () => mockUseAgentContext(),
}));

vi.mock("@/context/ProjectContext", () => ({
	useProjectContext: () => mockUseProjectContext(),
}));

vi.mock("@/hooks/useModel", () => ({
	default: () => mockUseModel(),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
	useMediaQuery: () => false,
}));

vi.mock("@/hooks/useActiveStreamRecovery", () => ({
	default: () => ({ isRecovering: false }),
}));

vi.mock("@/layouts/chat-layout-v2", () => ({
	default: ({ children }: { children: ReactNode }) => (
		<div data-testid="chat-layout">{children}</div>
	),
}));

vi.mock("@/components/nav/ChatNav", () => ({
	ChatNav: () => <div data-testid="chat-nav" />,
}));

vi.mock("@/components/chat/ChatComposer", () => ({
	default: ({
		showAgentMenu,
		showSandboxStatus,
	}: {
		showAgentMenu?: boolean;
		showSandboxStatus?: boolean;
	}) => (
		<div
			data-testid="chat-composer"
			data-show-agent-menu={String(showAgentMenu)}
			data-show-sandbox-status={String(showSandboxStatus)}
		/>
	),
}));

vi.mock("@/components/lists/ChatMessages", () => ({
	default: ({ messages }: { messages: any[] }) => (
		<div data-testid="chat-messages">{messages.length}</div>
	),
}));

vi.mock("@/components/lists/ChatMessagesSkeleton", () => ({
	default: () => <div data-testid="chat-messages-skeleton" />,
}));

vi.mock("@/components/ui/sidebar", () => ({
	SidebarTrigger: () => <div data-testid="sidebar-trigger" />,
}));

vi.mock("@/components/ui/button", () => ({
	Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button {...props}>{children}</button>
	),
}));

vi.mock("@/components/ui/resizable", () => ({
	ResizablePanelGroup: ({ children }: { children: ReactNode }) => (
		<div data-testid="desktop-panels">{children}</div>
	),
	ResizablePanel: ({
		children,
		defaultSize,
		minSize,
		maxSize,
	}: {
		children: ReactNode;
		defaultSize: number;
		minSize: number;
		maxSize: number;
	}) => (
		<div
			data-testid="desktop-panel"
			data-size={defaultSize}
			data-min={minSize}
			data-max={maxSize}
		>
			{children}
		</div>
	),
	ResizableHandle: () => <div data-testid="desktop-handle" />,
}));

vi.mock("@/components/ui/sheet", () => ({
	Sheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	SheetContent: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/components/panels/FileEditorPanel", () => ({
	default: () => <div data-testid="file-editor-panel" />,
}));

function renderThreadPage(pathname: string) {
	return render(
		<MemoryRouter initialEntries={[pathname]}>
			<Routes>
				<Route path="/thread/:threadId" element={<ThreadPage />} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("ThreadPage", () => {
	const mockUseLoadThreadEffect = vi.fn();
	const baseChatContext = {
		messages: [],
		setMessages: vi.fn(),
		metadata: {},
		setViewMode: vi.fn(),
		setMetadata: vi.fn(),
		setFilesMap: vi.fn(),
		setCheckpoints: vi.fn(),
		useListThreadsEffect: vi.fn(),
		useListCheckpointsEffect: vi.fn(),
		useModelsEffect: vi.fn(),
		viewMode: "chat",
		setTodos: vi.fn(),
		useLoadThreadEffect: mockUseLoadThreadEffect,
		threadLoading: false,
		threadError: null,
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockUseAppContext.mockReturnValue({
			loading: false,
		});

		mockUseAgentContext.mockReturnValue({
			useEffectGetAgents: vi.fn(),
		});

		mockUseProjectContext.mockReturnValue({
			selectProject: vi.fn(),
			projects: [],
		});

		mockUseModel.mockReturnValue({
			setModel: vi.fn(),
		});

		mockUseChatContext.mockReturnValue({
			...baseChatContext,
		});
	});

	it("skips initial thread hydration when the live thread already matches the route", () => {
		mockUseChatContext.mockReturnValue({
			...baseChatContext,
			messages: [{ id: "msg-1", content: "Hello" }],
			metadata: { thread_id: "live-123" },
		});

		renderThreadPage("/thread/live-123");

		expect(mockUseLoadThreadEffect).toHaveBeenCalledWith(
			"live-123",
			expect.any(Object),
			{ enabled: false },
		);
	});

	it("hydrates from the backend when there are no in-memory messages", () => {
		mockUseChatContext.mockReturnValue({
			...baseChatContext,
			messages: [],
			metadata: { thread_id: "live-123" },
		});

		renderThreadPage("/thread/live-123");

		expect(mockUseLoadThreadEffect).toHaveBeenCalledWith(
			"live-123",
			expect.any(Object),
			{ enabled: true },
		);
	});

	it("hydrates from the backend when the route thread differs from the current chat state", () => {
		mockUseChatContext.mockReturnValue({
			...baseChatContext,
			messages: [{ id: "msg-1", content: "Hello" }],
			metadata: { thread_id: "other-thread" },
		});

		renderThreadPage("/thread/live-123");

		expect(mockUseLoadThreadEffect).toHaveBeenCalledWith(
			"live-123",
			expect.any(Object),
			{ enabled: true },
		);
	});

	it("clears stale in-memory thread state when the route thread differs", () => {
		const setMessages = vi.fn();
		const setCheckpoints = vi.fn();
		const setFilesMap = vi.fn();
		const setTodos = vi.fn();
		const setViewMode = vi.fn();
		const setMetadata = vi.fn();

		mockUseChatContext.mockReturnValue({
			...baseChatContext,
			messages: [{ id: "msg-1", content: "Hello" }],
			metadata: { thread_id: "other-thread" },
			setMessages,
			setCheckpoints,
			setFilesMap,
			setTodos,
			setViewMode,
			setMetadata,
		});

		renderThreadPage("/thread/live-123");

		expect(setMessages).toHaveBeenCalledWith([]);
		expect(setCheckpoints).toHaveBeenCalledWith([]);
		expect(setFilesMap).not.toHaveBeenCalled();
		expect(setTodos).toHaveBeenCalledWith([]);
		expect(setViewMode).toHaveBeenCalledWith("chat");
		expect(setMetadata).toHaveBeenCalledWith(expect.any(Function));
	});

	it("does not render a stale thread error when reusing live in-memory state", () => {
		mockUseChatContext.mockReturnValue({
			...baseChatContext,
			messages: [{ id: "msg-1", content: "Hello" }],
			metadata: { thread_id: "live-123" },
			threadError: "No checkpoints found for thread",
		});

		renderThreadPage("/thread/live-123");

		expect(
			screen.queryByText("No checkpoints found for thread"),
		).not.toBeInTheDocument();
		expect(screen.getByTestId("chat-messages")).toHaveTextContent("1");
	});

	it("shows open files to the right of chat in the desktop split view", () => {
		mockUseChatContext.mockReturnValue({
			...baseChatContext,
			messages: [{ id: "msg-1", content: "Hello" }],
			metadata: { thread_id: "live-123" },
			viewMode: "files",
		});

		renderThreadPage("/thread/live-123");

		const [chat, handle, files] = Array.from(
			screen.getByTestId("desktop-panels").children,
		);
		expect(chat).toContainElement(screen.getAllByTestId("chat-nav")[0]);
		expect(chat).toHaveAttribute("data-size", "40");
		expect(chat).toHaveAttribute("data-min", "20");
		expect(chat).toHaveAttribute("data-max", "50");
		expect(handle).toHaveAttribute("data-testid", "desktop-handle");
		expect(files).toContainElement(screen.getByTestId("file-editor-panel"));
		expect(files).toHaveAttribute("data-size", "60");
		expect(files).toHaveAttribute("data-min", "50");
		expect(files).toHaveAttribute("data-max", "80");
	});

	it("renders the composer with sandbox status enabled", () => {
		renderThreadPage("/thread/live-123");

		expect(screen.getByTestId("chat-composer")).toHaveAttribute(
			"data-show-agent-menu",
			"true",
		);
		expect(screen.getByTestId("chat-composer")).toHaveAttribute(
			"data-show-sandbox-status",
			"true",
		);
	});
});
