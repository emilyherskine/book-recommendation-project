import {
  deriveReaderDNA,
  genreCatalog,
  modeSearchTerms,
  readingModes,
  topThemes,
} from "./reader-data";

const fallback = { mood: "Atmospheric", pace: "Steady clues", setting: "Small towns" };

describe("reader-data", () => {
  it("keeps the fallback DNA when history has no signals", () => {
    expect(deriveReaderDNA([], fallback)).toEqual(fallback);
  });

  it("derives DNA traits from subjects and titles", () => {
    const dna = deriveReaderDNA(
      [{ title: "A London Affair", subjects: ["psychological", "thriller"] }],
      fallback,
    );
    expect(dna).toEqual({ mood: "Dark and twisty", pace: "Page-turning", setting: "Big cities" });
  });

  it("defines a search phrase for every reading mode", () => {
    for (const mode of readingModes) expect(modeSearchTerms[mode.name]).toBeTruthy();
  });

  it("has uniquely named genres", () => {
    const names = genreCatalog.map((genre) => genre.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("Reader DNA from a TBR", () => {
  it("changes when only a TBR is uploaded", () => {
    const tbr = [
      { title: "A Court of Thorns", subjects: ["fantasy", "romance"] },
      { title: "The Name of the Wind", subjects: ["fantasy", "magic"] },
    ];
    const dna = deriveReaderDNA([], fallback, tbr);
    expect(dna.mood).toBe("Epic and imaginative");
    expect(dna.setting).toBe("Magical worlds");
    expect(dna).not.toEqual(fallback);
  });

  it("lets the most common signal win and weighs read books more", () => {
    const tbr = [
      { title: "x", subjects: ["cozy"] },
      { title: "y", subjects: ["cozy"] },
    ];
    const history = [{ title: "z", subjects: ["psychological", "thriller"] }];
    expect(deriveReaderDNA(history, fallback, tbr).mood).toBe("Clever and cozy");
    expect(deriveReaderDNA(history, fallback, tbr.slice(0, 1)).mood).toBe("Dark and twisty");
  });

  it("lists the most common themes, skipping catalogue noise", () => {
    const entries = [
      { title: "a", subjects: ["Gothic", "Accessible book", "fiction"] },
      { title: "b", subjects: ["gothic", "ghosts"] },
    ];
    expect(topThemes(entries, [])).toEqual(["gothic", "ghosts"]);
  });
});
