import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnvironmentBadge } from "../EnvironmentBadge";

describe("EnvironmentBadge", () => {
	it("renders DES label", () => {
		render(<EnvironmentBadge environment="des" status="healthy" />);
		expect(screen.getByText("des")).toBeInTheDocument();
	});

	it("renders PRE label", () => {
		render(<EnvironmentBadge environment="pre" status="healthy" />);
		expect(screen.getByText("pre")).toBeInTheDocument();
	});

	it("renders PRO label", () => {
		render(<EnvironmentBadge environment="pro" status="healthy" />);
		expect(screen.getByText("pro")).toBeInTheDocument();
	});

	it("shows version when provided", () => {
		render(<EnvironmentBadge environment="des" status="healthy" version="v1.0.0" />);
		expect(screen.getByText("v1.0.0")).toBeInTheDocument();
	});

	it("does not show version when not provided", () => {
		const { container } = render(<EnvironmentBadge environment="des" status="healthy" />);
		const versionEl = container.querySelector(".font-mono");
		expect(versionEl).not.toBeInTheDocument();
	});
});
