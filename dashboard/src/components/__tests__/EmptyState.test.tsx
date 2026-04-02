import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../ui/EmptyState";

describe("EmptyState", () => {
	it("renders title", () => {
		render(<EmptyState title="No data" />);
		expect(screen.getByText("No data")).toBeInTheDocument();
	});

	it("renders description when provided", () => {
		render(<EmptyState title="No data" description="Try again later" />);
		expect(screen.getByText("Try again later")).toBeInTheDocument();
	});

	it("does not render description when not provided", () => {
		const { container } = render(<EmptyState title="No data" />);
		// Only the title paragraph should exist
		const paragraphs = container.querySelectorAll("p");
		expect(paragraphs).toHaveLength(1);
	});

	it("renders action when provided", () => {
		render(<EmptyState title="No data" action={<button type="button">Retry</button>} />);
		expect(screen.getByText("Retry")).toBeInTheDocument();
	});

	it("renders icon when provided", () => {
		render(<EmptyState title="No data" icon={<span data-testid="icon">X</span>} />);
		expect(screen.getByTestId("icon")).toBeInTheDocument();
	});
});
