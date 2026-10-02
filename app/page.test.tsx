import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import Home from "./page";

vi.mock("@/app/components/reader-app", () => ({ default: () => <p>reader app</p> }));

describe("Home", () => {
  it("renders the reader app", () => {
    render(<Home />);
    expect(screen.getByText("reader app")).toBeInTheDocument();
  });
});
