import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock useChatContext
const mockUseChatContext = vi.fn();
vi.mock("@/context/ChatContext", () => ({
	useChatContext: () => mockUseChatContext(),
}));

// Mock useAgentContext
const mockUseAgentContext = vi.fn();
vi.mock("@/context/AgentContext", () => ({
	useAgentContext: () => mockUseAgentContext(),
}));

// Mock child components to isolate ChatNav
vi.mock("@/components/buttons/ColorModeButton", () => ({
	ColorModeButton: () => <button data-testid="color-mode-button" />,
}));
vi.mock("../buttons/NewThreadButton", () => ({
	default: () => <button data-testid="new-thread-button" />,
}));
vi.mock("@/components/buttons/HelpButton", () => ({
	HelpButton: () => <button data-testid="help-button" />,
}));

import { ChatNav } from "./ChatNav";

const defaultContext = {
	viewMode: "chat" as const,
	setViewMode: vi.fn(),
	filesMap: new Map(),
};

describe("ChatNav", () => {
	beforeEach(() => {
		mockUseChatContext.mockReturnValue(defaultContext);
		mockUseAgentContext.mockReturnValue({
			agent: {
				model: "",
				prompt: "",
				tools: [],
				subagents: [],
				mcp: {},
				a2a: {},
				files: [],
			},
			handleGetAgents: vi.fn(),
		});
	});

	it("does not render ModelBadge (moved to ChatInput)", () => {
		render(<ChatNav />);
		expect(screen.queryByTestId("model-badge")).not.toBeInTheDocument();
	});

	it("does not render SelectModel", () => {
		render(<ChatNav />);
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
	});

	it("does not accept showModelBadge prop (removed)", () => {
		// ChatNav no longer has showModelBadge prop
		render(<ChatNav />);
		expect(screen.queryByTestId("model-badge")).not.toBeInTheDocument();
	});

	it("renders core nav elements", () => {
		render(<ChatNav />);
		expect(screen.getByTestId("color-mode-button")).toBeInTheDocument();
		expect(screen.getByTestId("new-thread-button")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Save as Assistant" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /share/i }),
		).not.toBeInTheDocument();
	});
});
