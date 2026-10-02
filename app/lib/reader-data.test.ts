import { deriveReaderDNA, genreCatalog, modeSearchTerms, readingModes } from "./reader-data";

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
