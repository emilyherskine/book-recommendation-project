import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackPage } from "./feedback-page";

describe("FeedbackPage", () => {
  it("requires a rating before submitting, then thanks the reader", async () => {
    render(<FeedbackPage />);
    const submit = screen.getByRole("button", { name: /Send feedback/ });
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "4 out of 5 stars" }));
    await userEvent.click(submit);
    expect(screen.getByText(/Thank you/)).toBeInTheDocument();
  });
});
