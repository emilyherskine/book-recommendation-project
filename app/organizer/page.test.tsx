import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import OrganizerPage, { metadata } from "./page";

vi.mock("@/app/components/pages/organizer-dashboard", () => ({
  OrganizerDashboard: () => <p>dashboard</p>,
}));

describe("OrganizerPage", () => {
  it("renders the dashboard and stays out of search results", () => {
    render(<OrganizerPage />);
    expect(screen.getByText("dashboard")).toBeInTheDocument();
    expect(metadata.robots).toMatchObject({ index: false });
  });
});
