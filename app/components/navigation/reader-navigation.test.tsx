import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ReaderSidebar, ReaderTopbar } from "./reader-navigation";

describe("reader navigation", () => {
  it("navigates and marks the active view", async () => {
    const onNavigate = vi.fn();
    render(
      <ReaderSidebar
        activeView="Monthly pick"
        menuOpen={false}
        onNavigate={onNavigate}
        tbrCount={3}
      />,
    );
    expect(screen.getByRole("button", { name: /Find a mystery/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByLabelText("3 books in TBR")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Feedback/ }));
    expect(onNavigate).toHaveBeenCalledWith("Feedback");
  });

  it("toggles the mobile menu from the topbar", async () => {
    const onToggleMenu = vi.fn();
    render(
      <ReaderTopbar
        activeView="Feedback"
        menuOpen={false}
        onToggleMenu={onToggleMenu}
        tbrCount={0}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(onToggleMenu).toHaveBeenCalled();
    expect(screen.getByText("Feedback")).toBeInTheDocument();
  });
});
