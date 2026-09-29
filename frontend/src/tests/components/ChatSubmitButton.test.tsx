import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ChatSubmitButton from "@/components/buttons/ChatSubmitButton";

const context = vi.fn();
vi.mock("@/context/ChatContext", () => ({ useChatContext: () => context() }));
vi.mock("@/components/tooltips/MainToolTip", () => ({
	MainToolTip: ({ children }: { children: React.ReactNode }) => children,
}));

describe("ChatSubmitButton preflight", () => {
	it("retains text and images on rejected click without queueing", () => {
		const file = new File(["image"], "image.png");
		const enqueue = vi.fn();
		const setQuery = vi.fn();
		const setImages = vi.fn();
		const preflightSubmit = vi.fn(() => false);
		context.mockReturnValue({
			controller: null,
			query: "draft",
			images: [file],
			enqueue,
			setQuery,
			setImages,
			preflightSubmit,
		});
		render(<ChatSubmitButton abortQuery={vi.fn()} />);
		fireEvent.click(screen.getByRole("button"));
		expect(preflightSubmit).toHaveBeenCalledWith([file]);
		expect(enqueue).not.toHaveBeenCalled();
		expect(setQuery).not.toHaveBeenCalled();
		expect(setImages).not.toHaveBeenCalled();
	});
	it("queues and clears supported text", () => {
		const enqueue = vi.fn(() => true);
		const setQuery = vi.fn();
		const setImages = vi.fn();
		context.mockReturnValue({
			controller: null,
			query: "hello",
			images: [],
			enqueue,
			setQuery,
			setImages,
			preflightSubmit: vi.fn(() => true),
		});
		render(<ChatSubmitButton abortQuery={vi.fn()} />);
		fireEvent.click(screen.getByRole("button"));
		expect(enqueue).toHaveBeenCalledWith("hello", []);
		expect(setQuery).toHaveBeenCalledWith("");
		expect(setImages).toHaveBeenCalledWith([]);
	});
});
