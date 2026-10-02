import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import {
  BookCover,
  ChoiceGroup,
  IconButton,
  ModeSelector,
  ProgressBar,
  SectionHeading,
} from "./reader-ui";

describe("reader-ui", () => {
  it("renders an accessible icon button", () => {
    render(<IconButton label="Close">x</IconButton>);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("renders section headings with optional detail", () => {
    render(<SectionHeading detail="More" eyebrow="EYEBROW" title="Title" />);
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("labels the book cover", () => {
    render(<BookCover author="Author" title="Dracula" />);
    expect(screen.getByRole("img", { name: "Book cover for Dracula" })).toBeInTheDocument();
  });

  it("shows progress", () => {
    render(<ProgressBar label="Read" value={40} />);
    expect(screen.getByLabelText("Read")).toHaveAttribute("value", "40");
  });

  it("selects a mood", async () => {
    const onSelect = vi.fn();
    render(<ModeSelector onSelect={onSelect} selected="Comfort" />);
    await userEvent.click(screen.getByRole("button", { name: /Festive/ }));
    expect(onSelect).toHaveBeenCalledWith("Festive");
  });

  it("marks the selected choice and ignores disabled ones", async () => {
    const onSelect = vi.fn();
    render(
      <ChoiceGroup
        ariaLabel="Pick"
        className="x"
        onSelect={onSelect}
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B", disabled: true },
        ]}
        selected="a"
      />,
    );
    expect(screen.getByRole("button", { name: "A" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "B" }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
