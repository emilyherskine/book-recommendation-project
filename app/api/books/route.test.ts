// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, vi } from "vitest";
import { GET } from "./route";
import { searchOpenLibrary } from "@/app/lib/open-library";

vi.mock("@/app/lib/open-library", () => ({ searchOpenLibrary: vi.fn() }));
const search = vi.mocked(searchOpenLibrary);

const call = (query: string) => GET(new NextRequest(`http://localhost/api/books?${query}`));

beforeEach(() => {
  search.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/books", () => {
  it("rejects an invalid mood", async () => {
    expect((await call("mode=Nope")).status).toBe(400);
  });

  it("ranks results and attaches reasons", async () => {
    search.mockResolvedValue({
      items: [
        { key: "/works/1", title: "Cozy Village Mystery", authors: [], subjects: ["cozy"] },
        { key: "/works/2", title: "Plain", authors: [], subjects: [] },
      ],
      total: 2,
      offset: 0,
      limit: 8,
      hasMore: false,
    });
    const response = await call("mode=Comfort&genre=Mystery");
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(2);
    expect(
      body.items.every(
        (book: { recommendationReasons: string[] }) => book.recommendationReasons.length,
      ),
    ).toBe(true);
  });

  it("returns 502 when Open Library fails", async () => {
    search.mockRejectedValue(new Error("down"));
    expect((await call("mode=Comfort")).status).toBe(502);
  });
});
