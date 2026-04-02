import { describe, expect, it } from "vitest";
import { StatusDot } from "../StatusDot";
import { renderWithProviders } from "../../__tests__/test-utils";

describe("StatusDot", () => {
	it("renders without crashing", () => {
		const { container } = renderWithProviders(<StatusDot status="healthy" />);
		expect(container.querySelector("span")).toBeInTheDocument();
	});

	it("does not show pulse by default", () => {
		const { container } = renderWithProviders(<StatusDot status="healthy" />);
		expect(container.querySelector(".animate-ping")).not.toBeInTheDocument();
	});

	it("shows pulse when pulse=true and status=healthy", () => {
		const { container } = renderWithProviders(<StatusDot status="healthy" pulse />);
		expect(container.querySelector(".animate-ping")).toBeInTheDocument();
	});

	it("does not show pulse for non-healthy status even with pulse=true", () => {
		const { container } = renderWithProviders(<StatusDot status="idle" pulse />);
		expect(container.querySelector(".animate-ping")).not.toBeInTheDocument();
	});
});
