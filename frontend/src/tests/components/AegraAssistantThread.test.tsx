import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import AgentThreadPage from "@/pages/agents/thread";

const calls = vi.hoisted(() => ({
	getThread: vi.fn(),
	useLoadThreadEffect: vi.fn(),
	useListThreadsEffect: vi.fn(),
}));

vi.mock("@/lib/services/threadService", () => ({ getThread: calls.getThread }));
vi.mock("@/context/ChatContext", () => ({
	useChatContext: () => ({
		useLoadThreadEffect: calls.useLoadThreadEffect,
		useListThreadsEffect: calls.useListThreadsEffect,
		fromBackendFormat: vi.fn(),
		clearBackendSyncFiles: vi.fn(),
		clearThreadScopedFiles: vi.fn(),
		runWithPersistentSyncSuspended: vi.fn((callback: () => void) => callback()),
	}),
}));
vi.mock("@/context/AgentContext", () => ({
	useAgentContext: () => ({
		agent: { id: "assistant-1", files: {} },
		setAgent: vi.fn(),
		useEffectGetAgent: vi.fn(),
		useEffectGetAgents: vi.fn(),
	}),
}));
vi.mock("@/hooks/useAgent", () => ({ INIT_AGENT_STATE: { agent: {} } }));
vi.mock("@/layouts/chat-layout-v2", () => ({
	default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/sidebar", () => ({ SidebarTrigger: () => null }));
vi.mock("@/components/ui/scroll-area", () => ({
	ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/forms/agents/agent-create-form", () => ({
	AgentCreateForm: () => <div>Assistant settings</div>,
}));

describe("assistant thread in the Aegra experiment", () => {
	it("shows unavailable and assistant settings without loading old thread state", () => {
		vi.clearAllMocks();
		render(
			<MemoryRouter initialEntries={["/assistant/assistant-1/thread/legacy-1"]}>
				<Routes>
					<Route
						path="/assistant/:agentId/thread/:threadId"
						element={<AgentThreadPage />}
					/>
				</Routes>
			</MemoryRouter>,
		);
		expect(screen.getByRole("status")).toHaveTextContent(
			"Assistant conversations are unavailable in the Aegra experiment.",
		);
		expect(screen.getByText("Assistant settings")).toBeInTheDocument();
		expect(calls.getThread).not.toHaveBeenCalled();
		expect(calls.useLoadThreadEffect).not.toHaveBeenCalled();
		expect(calls.useListThreadsEffect).not.toHaveBeenCalled();
	});
});
