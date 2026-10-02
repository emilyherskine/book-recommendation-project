import { afterEach, vi } from "vitest";
import { applyEnrichment, fetchEnrichment } from "./enrich";

afterEach(() => vi.unstubAllGlobals());

describe("enrichment", () => {
  it("only looks up books without subjects and applies the results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ subjects: ["gothic"], pageCount: 380 }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const entries = [
      { title: "Rebecca", subjects: [] },
      { title: "Tagged", subjects: ["mystery"] },
    ];
    const found = await fetchEnrichment(entries);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).books).toEqual([{ title: "Rebecca" }]);
    const applied = applyEnrichment(entries, found);
    expect(applied[0]).toMatchObject({ subjects: ["gothic"], pageCount: 380 });
    expect(applied[1].subjects).toEqual(["mystery"]);
  });

  it("stays quiet when the lookup fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await fetchEnrichment([{ title: "Rebecca", subjects: [] }])).size).toBe(0);
  });
});
