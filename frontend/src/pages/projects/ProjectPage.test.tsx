import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import ProjectPage from "./ProjectPage";

vi.mock("@/context/AppContext", () => ({
	useAppContext: () => ({ loading: false, appVersion: "test" }),
}));
vi.mock("@/context/AgentContext", () => ({
	useAgentContext: () => ({ useEffectGetAgents: vi.fn() }),
}));
vi.mock("@/context/ProjectContext", () => ({
	useProjectContext: () => ({
		selectProject: vi.fn(),
		handleUpdateProject: vi.fn(),
		loading: false,
	}),
}));
vi.mock("@/context/ChatContext", () => ({
	useChatContext: () => ({
		messages: [{ id: "message" }],
		viewMode: "files",
		setViewMode: vi.fn(),
		metadata: {},
		setMetadata: vi.fn(),
		useListThreadsEffect: vi.fn(),
		useListCheckpointsEffect: vi.fn(),
		useModelsEffect: vi.fn(),
	}),
}));
vi.mock("@/lib/services/projectService", () => ({
	default: {
		get: vi.fn().mockResolvedValue({ data: { project: { id: "project-1" } } }),
	},
}));
vi.mock("@/hooks/useMediaQuery", () => ({ useMediaQuery: () => false }));
vi.mock("@/layouts/chat-layout-v2", () => ({
	default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/nav/ChatNav", () => ({
	ChatNav: () => <div data-testid="chat-nav" />,
}));
vi.mock("@/components/lists/ChatMessages", () => ({
	default: () => <div data-testid="chat-messages" />,
}));
vi.mock("@/components/inputs/ChatInput", () => ({
	default: () => <div data-testid="chat-input" />,
}));
vi.mock("@/components/ui/sidebar", () => ({
	SidebarTrigger: () => <div />,
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
		<div data-size={defaultSize} data-min={minSize} data-max={maxSize}>
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

describe("ProjectPage", () => {
	it("shows open files to the right of chat in the desktop split view", async () => {
		render(
			<MemoryRouter initialEntries={["/p/project-1"]}>
				<Routes>
					<Route path="/p/:projectId" element={<ProjectPage />} />
				</Routes>
			</MemoryRouter>,
		);

		const [chat, handle, files] = Array.from(
			(await screen.findByTestId("desktop-panels")).children,
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
});
