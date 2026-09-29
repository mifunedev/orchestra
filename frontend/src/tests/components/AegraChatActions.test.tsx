import React from "react";
import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppSidebar } from "@/components/drawers/app-sidebar";
import ListProjectThreads from "@/components/lists/ListProjectThreads";

const legacy = vi.hoisted(() => ({
	deleteThread: vi.fn(),
	updateThreadProject: vi.fn(),
	searchThreadsByProject: vi.fn(),
	searchThreadsSemantic: vi.fn(),
}));

vi.mock("@/lib/services", () => legacy);
vi.mock("@/lib/services/threadService", () => legacy);
vi.mock("@/context/ChatContext", () => ({
	useChatContext: () => ({
		metadata: { thread_id: "native-1" },
		threads: [
			{
				key: "native-1",
				value: { thread_id: "native-1", title: "Native thread" },
			},
			{
				key: "known-1",
				value: {
					thread_id: "known-1",
					title: "Known thread",
					files: { "answer.txt": {}, "report.txt": {} },
					messages: [{ type: "human", model: "provider:gpt-4", content: "Hi" }],
				},
			},
		],
		clearMessages: vi.fn(),
	}),
}));
vi.mock("@/context/AgentContext", () => ({
	useAgentContext: () => ({ agent: { id: "" } }),
}));
vi.mock("@/context/ProjectContext", () => ({
	useProjectContext: () => ({
		projects: [],
		useEffectGetProjects: vi.fn(),
	}),
}));
vi.mock("@/hooks/useLinkClick", () => ({ default: () => vi.fn() }));
vi.mock("@/components/ui/sidebar", () => ({
	Sidebar: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	SidebarHeader: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	SidebarContent: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	SidebarFooter: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	SidebarRail: () => null,
	SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	SidebarMenuButton: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
	useSidebar: () => ({ isMobile: false, setOpenMobile: vi.fn() }),
}));
vi.mock("@/components/sidebar/ActivityBar", () => ({
	ActivityBar: () => null,
}));
vi.mock("@/components/sidebar/SidePanel", () => ({
	SidePanel: ({
		threads,
		renderThreadItem,
		onSearchClick,
	}: {
		threads: Array<{ key: string }>;
		renderThreadItem: (
			thread: { key: string },
			projects: [],
		) => React.ReactNode;
		onSearchClick?: () => void;
	}) => (
		<div>
			{onSearchClick && <button onClick={onSearchClick}>Search threads</button>}
			{threads.map((thread) => (
				<div key={thread.key}>{renderThreadItem(thread, [])}</div>
			))}
		</div>
	),
}));
vi.mock("@/components/modals/CreateProjectModal", () => ({
	CreateProjectModal: () => null,
}));
vi.mock("@/components/modals/AddSourceModal", () => ({
	AddSourceModal: () => null,
}));
vi.mock("@/components/popovers/SettingsPopover", () => ({
	SettingsPopover: () => null,
}));

const renderWithRouter = (node: React.ReactElement) =>
	render(<MemoryRouter>{node}</MemoryRouter>);

describe("Aegra-only history affordances", () => {
	it("does not offer sidebar search, project move, or delete for a native thread", () => {
		renderWithRouter(<AppSidebar />);
		expect(
			screen.getByRole("button", { name: /Native thread/ }),
		).toBeInTheDocument();
		expect(screen.queryByText("Search threads")).not.toBeInTheDocument();
		expect(screen.queryByText("Delete")).not.toBeInTheDocument();
		expect(screen.queryByText(/Add to Project/)).not.toBeInTheDocument();
		expect(legacy.deleteThread).not.toHaveBeenCalled();
		expect(legacy.updateThreadProject).not.toHaveBeenCalled();
		expect(legacy.searchThreadsSemantic).not.toHaveBeenCalled();
	});

	it("omits unknown file and model metadata from a native search row", () => {
		renderWithRouter(<AppSidebar />);
		const row = screen.getByRole("button", { name: /Native thread/ });
		expect(within(row).queryByText(/files?/)).not.toBeInTheDocument();
		expect(within(row).queryByText("N/A")).not.toBeInTheDocument();
		expect(row).not.toHaveTextContent("•");
	});

	it("shows an explicitly known file count and model", () => {
		renderWithRouter(<AppSidebar />);
		const row = screen.getByRole("button", { name: /Known thread/ });
		expect(within(row).getByText("2")).toBeInTheDocument();
		expect(within(row).getByText("files")).toBeInTheDocument();
		expect(row).toHaveTextContent("gpt-4");
	});

	it("does not fetch or delete old project chat history", () => {
		renderWithRouter(<ListProjectThreads projectId="project-1" />);
		expect(
			screen.getByText(
				"Project conversations are unavailable in this experiment.",
			),
		).toBeInTheDocument();
		expect(legacy.searchThreadsByProject).not.toHaveBeenCalled();
		expect(legacy.deleteThread).not.toHaveBeenCalled();
	});
});
