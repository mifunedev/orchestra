import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ChatInput from "./ChatInput";
import { getAuthToken } from "@/lib/utils/auth";
import { createQueryWrapper } from "@/tests/test-utils";

// Sonner is mocked following the precedent in settings/MemorySettings.test.tsx
vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/utils/auth", () => ({
	getAuthToken: vi.fn(),
}));

vi.mock("@/lib/services/userSettingsService", () => ({
	patchDefaults: vi.fn().mockResolvedValue({}),
	getSettings: vi.fn().mockResolvedValue({}),
}));

const isModelVisible = vi.fn();
vi.mock("@/hooks/useModelVisibility", () => ({
	useModelVisibility: () => ({ isModelVisible }),
}));

vi.mock("@/hooks/useAppHook", () => ({
	default: () => ({ isLikelyMobile: () => false }),
}));

vi.mock("react-voice-visualizer", () => ({
	useVoiceVisualizer: () => ({}),
	VoiceVisualizer: () => <div data-testid="voice-visualizer" />,
}));

// Neighbours of the model picker in the action row — out of scope here.
vi.mock("../panels/QueuePanel", () => ({ default: () => null }));
vi.mock("../menus/BaseToolMenu", () => ({ default: () => null }));
vi.mock("../menus/AgentMenu", () => ({ default: () => null }));
vi.mock("./ImagePreview", () => ({ ImagePreview: () => null }));
vi.mock("./ImagePreviewModal", () => ({ ImagePreviewModal: () => null }));
vi.mock("../buttons/ChatSubmitButton", () => ({
	default: () => <button type="button">Send</button>,
}));
vi.mock("@/context/ProjectContext", () => ({
	useProjectContext: () => ({ selectedProject: null, selectProject: vi.fn() }),
}));

const HEALTHY_MODELS = {
	default: "openai:gpt-4o",
	models: ["openai:gpt-4o", "anthropic:claude-sonnet-4-20250514"],
	free: [],
};

const EMPTY_MODELS = { default: "", models: [], free: [] };

const mockContext = vi.fn();
vi.mock("@/context/ChatContext", () => ({
	useChatContext: () => mockContext(),
}));

const enqueue = vi.fn();
const refetch = vi.fn();

function contextValue(overrides: Record<string, unknown> = {}) {
	return {
		query: "",
		setQuery: vi.fn(),
		abortQuery: vi.fn(),
		images: [],
		setImages: vi.fn(),
		previewImage: null,
		previewImageIndex: 0,
		removeImage: vi.fn(),
		handleImageClick: vi.fn(),
		handleTextareaResize: vi.fn(),
		handlePaste: vi.fn(),
		handleDrop: vi.fn(),
		setPreviewImage: vi.fn(),
		handleSubmit: vi.fn(),
		metadata: {},
		setMetadata: vi.fn(),
		inputRef: { current: null },
		enqueue,
		preflightSubmit: vi.fn(() => true),
		displayModel: HEALTHY_MODELS.default,
		models: HEALTHY_MODELS,
		setModel: vi.fn(),
		isLoading: false,
		isError: false,
		isFetching: false,
		refetch,
		...overrides,
	};
}

// SelectReasoningEffort sits beside the picker in the action row and calls
// useQueryClient, so the composer needs a QueryClientProvider even though the
// model state under test arrives via ChatContext.
const renderInput = () =>
	render(<ChatInput />, { wrapper: createQueryWrapper() });

describe("ChatInput model states", () => {
	beforeEach(() => {
		// Radix/cmdk need pointer-capture and observer APIs jsdom does not ship.
		// Same stubs as tests/components/SelectReasoningEffort.test.tsx —
		// vitest.config.ts declares no setupFiles to hold them centrally.
		Element.prototype.scrollIntoView = vi.fn();
		Element.prototype.hasPointerCapture = vi.fn(() => false);
		Element.prototype.setPointerCapture = vi.fn();
		Element.prototype.releasePointerCapture = vi.fn();
		globalThis.ResizeObserver ??= class {
			observe() {}
			unobserve() {}
			disconnect() {}
		} as unknown as typeof ResizeObserver;

		vi.clearAllMocks();
		vi.mocked(getAuthToken).mockReturnValue("mock-token");
		isModelVisible.mockReturnValue(true);
		mockContext.mockReturnValue(contextValue());
	});

	it("renders the picker with the current model when healthy", () => {
		renderInput();

		expect(screen.getByTestId("model-picker-trigger")).toBeInTheDocument();
		expect(screen.getByTestId("model-picker-trigger")).toHaveAttribute(
			"aria-label",
			"Model: gpt-4o",
		);
		expect(screen.queryByTestId("model-picker-error")).not.toBeInTheDocument();
	});

	it("renders a skeleton while the models query is loading", () => {
		mockContext.mockReturnValue(
			contextValue({
				isLoading: true,
				displayModel: null,
				models: EMPTY_MODELS,
			}),
		);

		renderInput();

		expect(screen.getByTestId("model-picker-skeleton")).toBeInTheDocument();
		expect(
			screen.queryByTestId("model-picker-trigger"),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId("model-picker-empty")).not.toBeInTheDocument();
	});

	it("renders an enabled retry button on error and refetches when clicked", () => {
		mockContext.mockReturnValue(
			contextValue({ isError: true, displayModel: null, models: EMPTY_MODELS }),
		);

		renderInput();

		const retry = screen.getByTestId("model-picker-error");
		expect(retry).toBeInTheDocument();
		expect(retry).toBeEnabled();
		expect(retry).toHaveTextContent("Models unavailable");
		expect(retry).toHaveAttribute(
			"aria-label",
			"Models unavailable. Retry loading models.",
		);

		fireEvent.click(retry);
		expect(refetch).toHaveBeenCalledTimes(1);
	});

	it("keeps the retry control keyboard reachable and activatable", () => {
		mockContext.mockReturnValue(
			contextValue({ isError: true, displayModel: null, models: EMPTY_MODELS }),
		);

		renderInput();

		const retry = screen.getByTestId("model-picker-error");

		// A real, enabled <button> with no negative tabindex is in the natural tab
		// order — the point of US-004 is that this is not a disabled chip.
		expect(retry.tagName).toBe("BUTTON");
		expect(retry).toBeEnabled();
		expect(retry).not.toHaveAttribute("tabindex", "-1");
		expect(retry).not.toHaveAttribute("aria-disabled", "true");

		retry.focus();
		expect(retry).toHaveFocus();

		// Enter and Space both activate a native button; jsdom does not synthesise
		// the resulting click, so assert the click handler itself.
		fireEvent.click(retry);
		expect(refetch).toHaveBeenCalledTimes(1);
	});

	it("shows a retrying state and disables the chip while refetching", () => {
		mockContext.mockReturnValue(
			contextValue({
				isError: true,
				isFetching: true,
				displayModel: null,
				models: EMPTY_MODELS,
			}),
		);

		renderInput();

		const retry = screen.getByTestId("model-picker-error");
		expect(retry).toHaveTextContent("Retrying…");
		expect(retry).toBeDisabled();
		expect(retry).toHaveAttribute("aria-label", "Retrying to load models");
	});

	it("renders the empty chip — not the error chip — on a zero-model success", () => {
		mockContext.mockReturnValue(
			contextValue({ displayModel: null, models: EMPTY_MODELS }),
		);

		renderInput();

		expect(screen.getByTestId("model-picker-empty")).toHaveTextContent(
			"No models available",
		);
		expect(screen.queryByTestId("model-picker-error")).not.toBeInTheDocument();
	});

	it("renders nothing model-related when unauthenticated", () => {
		vi.mocked(getAuthToken).mockReturnValue(null);
		mockContext.mockReturnValue(
			contextValue({ displayModel: null, models: EMPTY_MODELS }),
		);

		renderInput();

		// Must not fall through to the empty state on the login screen
		expect(screen.queryByTestId("model-picker-empty")).not.toBeInTheDocument();
		expect(screen.queryByTestId("model-picker-error")).not.toBeInTheDocument();
		expect(
			screen.queryByTestId("model-picker-trigger"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId("model-picker-skeleton"),
		).not.toBeInTheDocument();
	});

	it("labels the trigger 'Select model' when loaded with no default", () => {
		mockContext.mockReturnValue(
			contextValue({
				displayModel: null,
				models: { ...HEALTHY_MODELS, default: "" },
			}),
		);

		renderInput();

		expect(screen.getByTestId("model-picker-trigger")).toHaveTextContent(
			"Select model",
		);
	});

	it("keeps the composer usable during an outage", async () => {
		const setQuery = vi.fn();
		mockContext.mockReturnValue(
			contextValue({
				isError: true,
				displayModel: null,
				models: EMPTY_MODELS,
				query: "hello there",
				setQuery,
			}),
		);

		renderInput();

		const textarea = screen.getByRole("textbox");
		expect(textarea).toBeEnabled();
		expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();

		fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

		await waitFor(() =>
			expect(enqueue).toHaveBeenCalledWith("hello there", []),
		);
	});

	it("retains draft and image on unsupported Enter without queueing", () => {
		const file = new File(["image"], "image.png");
		const setQuery = vi.fn();
		const setImages = vi.fn();
		const preflightSubmit = vi.fn(() => false);
		mockContext.mockReturnValue(
			contextValue({
				query: "draft",
				images: [file],
				setQuery,
				setImages,
				preflightSubmit,
			}),
		);
		renderInput();
		fireEvent.keyDown(screen.getByRole("textbox"), {
			key: "Enter",
			shiftKey: false,
		});
		expect(preflightSubmit).toHaveBeenCalledWith([file]);
		expect(enqueue).not.toHaveBeenCalled();
		expect(setQuery).not.toHaveBeenCalled();
		expect(setImages).not.toHaveBeenCalled();
	});

	it("announces the outage in a polite live region", () => {
		mockContext.mockReturnValue(
			contextValue({ isError: true, displayModel: null, models: EMPTY_MODELS }),
		);

		renderInput();

		const region = screen.getByRole("status");
		expect(region).toHaveAttribute("aria-live", "polite");
		expect(region).toHaveTextContent(
			"Model list unavailable. The server could not be reached.",
		);
	});

	it("keeps the live region mounted and empty when healthy", () => {
		renderInput();

		const region = screen.getByRole("status");
		expect(region).toBeInTheDocument();
		expect(region).toHaveTextContent("");
	});

	// US-006: two states that also used to render as nothing, or as a dead end.
	describe("model list empty states", () => {
		it("tells the user where to unhide models when visibility hides them all", async () => {
			// Models exist server-side; the user has switched them all off. That is
			// user-caused and user-fixable, so the normal picker must still render.
			isModelVisible.mockReturnValue(false);
			renderInput();

			const trigger = screen.getByTestId("model-picker-trigger");
			expect(trigger).toBeInTheDocument();
			fireEvent.click(trigger);

			await waitFor(() =>
				expect(
					screen.getByText(
						"All models are hidden. Turn some on in Settings → Model Visibility.",
					),
				).toBeInTheDocument(),
			);
		});

		it("keeps the generic empty message when a search simply matches nothing", async () => {
			renderInput();

			fireEvent.click(screen.getByTestId("model-picker-trigger"));
			const search = await screen.findByPlaceholderText("Search models...");
			fireEvent.change(search, { target: { value: "zzzznomatch" } });

			await waitFor(() =>
				expect(screen.getByText("No model found.")).toBeInTheDocument(),
			);
			// Models are visible — this is a search miss, not a visibility problem.
			expect(
				screen.queryByText(/All models are hidden/),
			).not.toBeInTheDocument();
		});
	});
});
