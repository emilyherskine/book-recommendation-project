import { estimateSpice, preferredPool, scoreForPreferences } from "./preferences";

const prefs = { format: "Any format", length: "Any length", spiceLevel: 2 } as const;

describe("scoreForPreferences", () => {
  it("rewards books inside the preferred page range and excludes ones outside it", () => {
    const short = { ...prefs, length: "Short (<250 pages)" } as const;
    expect(scoreForPreferences({ subjects: [], pageCount: 200 }, short)).toMatchObject({
      excluded: false,
      reasons: ["Fits your length preference: 200 pages"],
    });
    expect(scoreForPreferences({ subjects: [], pageCount: 600 }, short).excluded).toBe(true);
    expect(scoreForPreferences({ subjects: [] }, short).excluded).toBe(false);
  });

  it("treats the length boundaries as documented", () => {
    const medium = { ...prefs, length: "Medium (250-450 pages)" } as const;
    expect(scoreForPreferences({ subjects: [], pageCount: 250 }, medium).excluded).toBe(false);
    expect(scoreForPreferences({ subjects: [], pageCount: 450 }, medium).excluded).toBe(false);
    expect(scoreForPreferences({ subjects: [], pageCount: 451 }, medium).excluded).toBe(true);
  });

  it("prefers ebooks that can be borrowed", () => {
    const ebook = { ...prefs, format: "Ebook" } as const;
    const borrowable = scoreForPreferences({ subjects: [], ebookAccess: "borrowable" }, ebook);
    const none = scoreForPreferences({ subjects: [], ebookAccess: "no_ebook" }, ebook);
    expect(borrowable.score).toBeGreaterThan(none.score);
    expect(none.excluded).toBe(true);
  });

  it("uses the formats recorded on a TBR entry", () => {
    const audio = { ...prefs, format: "Audiobook" } as const;
    const has = scoreForPreferences({ subjects: [], formats: ["Audiobook"] }, audio);
    const lacks = scoreForPreferences({ subjects: [], formats: ["Print"] }, audio);
    expect(has.score).toBeGreaterThan(lacks.score);
    expect(scoreForPreferences({ subjects: ["Audiobook"] }, audio).reasons).toContain(
      "Available as an audiobook",
    );
  });

  it("prioritizes physical editions and excludes a known unavailable format", () => {
    const print = { ...prefs, format: "Print" } as const;
    const ebook = { ...prefs, format: "Ebook" } as const;
    expect(scoreForPreferences({ subjects: [], editionCount: 3 }, print).reasons).toContain(
      "Available as a physical book",
    );
    expect(scoreForPreferences({ subjects: [], ebookAccess: "no_ebook" }, ebook).excluded).toBe(
      true,
    );
  });

  it("matches heat level to the pepper rating", () => {
    const mild = { ...prefs, spiceLevel: 1 } as const;
    const hot = { ...prefs, spiceLevel: 5 } as const;
    const steamy = { subjects: ["Erotic romance"] };
    expect(scoreForPreferences(steamy, mild).excluded).toBe(true);
    expect(scoreForPreferences(steamy, hot).excluded).toBe(false);
    expect(scoreForPreferences(steamy, hot).score).toBeGreaterThan(
      scoreForPreferences(steamy, mild).score,
    );
    expect(scoreForPreferences({ subjects: ["Mystery"] }, mild).excluded).toBe(false);
  });
});

describe("estimateSpice", () => {
  it("reads heat from subject tags", () => {
    expect(estimateSpice(["clean romance"])).toBe(1);
    expect(estimateSpice(["Romance"])).toBe(3);
    expect(estimateSpice(["steamy"])).toBe(4);
    expect(estimateSpice(["Detective"])).toBeUndefined();
  });
});

describe("preferredPool", () => {
  const fit = (excluded: boolean) => ({ score: 0, reasons: [], excluded });
  it("drops mismatches only when enough matches remain", () => {
    const items = [{ bad: true }, { bad: false }];
    expect(preferredPool(items, (item) => fit(item.bad))).toEqual([{ bad: false }]);
    expect(preferredPool(items, (item) => fit(item.bad), 2)).toEqual(items);
  });
});
