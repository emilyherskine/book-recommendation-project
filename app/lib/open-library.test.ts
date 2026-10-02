import { afterEach, vi } from "vitest";
import { searchOpenLibrary } from "./open-library";

afterEach(() => vi.unstubAllGlobals());

describe("searchOpenLibrary", () => {
  it("normalizes works and reports pagination", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        num_found: 10,
        docs: [
          { key: "/works/OL1W", title: " Dracula ", author_name: ["Bram Stoker"], cover_i: 7 },
          { key: "/authors/OL2A", title: "Not a work" },
          { title: "No key" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const page = await searchOpenLibrary("gothic", 0, 5);

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      key: "/works/OL1W",
      title: "Dracula",
      authors: ["Bram Stoker"],
      coverUrl: "https://covers.openlibrary.org/b/id/7-M.jpg",
    });
    expect(page).toMatchObject({ total: 10, offset: 0, limit: 5, hasMore: true });
    expect(String(fetchMock.mock.calls[0][0])).toContain("q=gothic");
  });

  it("throws when Open Library responds with an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(searchOpenLibrary("x", 0, 1)).rejects.toThrow("503");
  });
});
