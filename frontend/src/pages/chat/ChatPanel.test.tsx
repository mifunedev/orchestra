import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import ChatPanel from "./ChatPanel";

const mockUseChatContext = vi.fn();
const mockUseAppContext = vi.fn();

vi.mock("@/context/ChatContext", () => ({
	useChatContext: () => mockUseChatContext(),
}));

vi.mock("@/context/AppContext", () => ({
	useAppContext: () => mockUseAppContext(),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
	useMediaQuery: () => false,
}));

vi.mock("@/layouts/ChatLayout", () => ({
	default: ({ children }: { children: ReactNode }) => (
		<div data-testid="chat-layout">{children}</div>
	),
}));

vi.mock("@/components/sections/agent-section", () => ({
	default: ({
		showAgentMenu,
		showSandboxStatus,
	}: {
		showAgentMenu?: boolean;
		showSandboxStatus?: boolean;
	}) => (
		<div
			data-testid="agent-section"
			data-show-agent-menu={String(showAgentMenu)}
			data-show-sandbox-status={String(showSandboxStatus)}
		/>
	),
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

vi.mock("@/components/ui/button", () => ({
	Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button {...props}>{children}</button>
	),
}));

describe("ChatPanel", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockUseAppContext.mockReturnValue({
			appVersion: "test-version",
		});

		mockUseChatContext.mockReturnValue({
			messages: [{ id: "msg-1", content: "Hello" }],
			viewMode: "chat",
			setViewMode: vi.fn(),
		});
	});

	it("renders the composer without sandbox status by default", () => {
		render(<ChatPanel chatNav={<div data-testid="chat-nav" />} />);

		expect(screen.getByTestId("chat-composer")).toHaveAttribute(
			"data-show-agent-menu",
			"true",
		);
		expect(screen.getByTestId("chat-composer")).toHaveAttribute(
			"data-show-sandbox-status",
			"false",
		);
	});

	it("renders the composer with sandbox status when enabled", () => {
		render(
			<ChatPanel
				chatNav={<div data-testid="chat-nav" />}
				showSandboxStatus={true}
			/>,
		);

		expect(screen.getByTestId("chat-composer")).toHaveAttribute(
			"data-show-sandbox-status",
			"true",
		);
	});

	it("passes showAgentMenu through to the composer", () => {
		render(
			<ChatPanel
				chatNav={<div data-testid="chat-nav" />}
				showAgentMenu={false}
			/>,
		);

		expect(screen.getByTestId("chat-composer")).toHaveAttribute(
			"data-show-agent-menu",
			"false",
		);
	});

	it("shows open files to the right of chat in the desktop split view", () => {
		mockUseChatContext.mockReturnValue({
			messages: [{ id: "msg-1", content: "Hello" }],
			viewMode: "files",
			setViewMode: vi.fn(),
		});

		render(<ChatPanel chatNav={<div data-testid="chat-nav" />} />);

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

	it("renders AgentSection without ChatComposer on initial empty state", () => {
		mockUseChatContext.mockReturnValue({
			messages: [],
			viewMode: "chat",
			setViewMode: vi.fn(),
		});

		render(
			<ChatPanel
				agent={{
					id: "agent1",
					name: "Test Agent",
					description: "desc",
					model: "gpt-4",
					tools: [],
				}}
				chatNav={<div data-testid="chat-nav" />}
				showSandboxStatus={true}
			/>,
		);

		expect(screen.getByTestId("agent-section")).toBeInTheDocument();
		expect(screen.getByTestId("agent-section")).toHaveAttribute(
			"data-show-sandbox-status",
			"true",
		);
		expect(screen.queryByTestId("chat-composer")).not.toBeInTheDocument();
	});
});
