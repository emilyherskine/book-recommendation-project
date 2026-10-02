import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, vi } from "vitest";
import { FeedbackPage } from "./feedback-page";

describe("FeedbackPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requires a rating before submitting, then thanks the reader", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    render(<FeedbackPage />);
    const submit = screen.getByRole("button", { name: /Send feedback/ });
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "4 out of 5 stars" }));
    await userEvent.click(submit);
    await waitFor(() => expect(screen.getByText(/Thank you/)).toBeInTheDocument());
  });
});
