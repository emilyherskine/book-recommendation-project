import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";
import ReaderApp from "./reader-app";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, offset: 0, limit: 8, hasMore: false }),
    }),
  );
});

describe("ReaderApp", () => {
  it("opens on the monthly pick and navigates between views", async () => {
    render(<ReaderApp />);
    await waitFor(() =>
      expect(screen.queryByText(/Opening your reading room/)).not.toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: /Reader DNA/ }));
    expect(await screen.findByText("Your story ingredients")).toBeInTheDocument();
  });

  it("restores saved TBR data from this device", async () => {
    localStorage.setItem(
      "marginalia:reading-data",
      JSON.stringify({ tbr: [{ title: "Rebecca", subjects: [] }] }),
    );
    render(<ReaderApp />);
    expect(await screen.findByLabelText("1 books in TBR")).toBeInTheDocument();
  });
});
