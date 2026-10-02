import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { OrganizerDashboard } from "./organizer-dashboard";

const record = {
  requestId: "a",
  status: "new",
  createdAt: "2026-01-01T00:00:00Z",
  selection: {
    title: "Rebecca",
    authors: ["du Maurier"],
    pageCount: 380,
    preferenceMatch: ["Matches your genre: gothic"],
  },
  preferences: {
    mode: "Comfort",
    genres: ["gothic"],
    readingFormat: "Print",
    bookLength: "Any length",
    spiceLevel: 2,
  },
  recipient: {
    name: "Reader",
    email: "r@example.com",
    fulfillment: "ship to me",
    shippingAddress: "1 Moon St",
  },
};

afterEach(() => vi.unstubAllGlobals());

describe("OrganizerDashboard", () => {
  it("asks anonymous visitors to sign in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
    );
    render(<OrganizerDashboard />);
    expect(await screen.findByLabelText("Organizer password")).toBeInTheDocument();
  });

  it("shows requests and marks them delivered", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "PATCH"
        ? { ok: true, status: 200, json: async () => ({ ok: true }) }
        : { ok: true, status: 200, json: async () => ({ requests: [record] }) },
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<OrganizerDashboard />);
    expect(await screen.findByRole("heading", { name: "Rebecca" })).toBeInTheDocument();
    expect(screen.getByText("1 Moon St")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mark delivered" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Undo delivered" })).toBeInTheDocument(),
    );
  });
});
