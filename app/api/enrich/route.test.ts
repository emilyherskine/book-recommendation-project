// @vitest-environment node
import { NextRequest } from "next/server";
import { vi } from "vitest";
import { POST } from "./route";
import { searchOpenLibrary } from "@/app/lib/open-library";

vi.mock("@/app/lib/open-library", () => ({ searchOpenLibrary: vi.fn() }));

let ip = 0;
const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/enrich", {
      method: "POST",
      headers: { "x-forwarded-for": `10.2.0.${(ip += 1)}` },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/enrich", () => {
  it("returns subjects for each book in order, tolerating failed lookups", async () => {
    vi.mocked(searchOpenLibrary)
      .mockResolvedValueOnce({
        items: [
          { key: "/works/1", title: "Rebecca", authors: [], subjects: ["gothic"], pageCount: 380 },
        ],
        total: 1,
        offset: 0,
        limit: 1,
        hasMore: false,
      })
      .mockRejectedValueOnce(new Error("down"));
    const response = await post({ books: [{ title: "Rebecca" }, { title: "Emma" }] });
    expect((await response.json()).results).toEqual([
      { subjects: ["gothic"], pageCount: 380 },
      { subjects: [] },
    ]);
  });

  it("rejects malformed bodies", async () => {
    expect((await post({ nope: true })).status).toBe(400);
  });
});
