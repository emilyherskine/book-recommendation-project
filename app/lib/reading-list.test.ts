import { parseReadingList } from "./reading-list";

describe("parseReadingList", () => {
  it("parses CSV with quoted fields and subjects", () => {
    const csv = 'Title,Author,Genres\n"Rebecca, A Novel",Daphne du Maurier,gothic;mystery\n';
    expect(parseReadingList("tbr.csv", csv)).toEqual([
      { title: "Rebecca, A Novel", author: "Daphne du Maurier", subjects: ["gothic", "mystery"] },
    ]);
  });

  it("rejects CSV files without a title column", () => {
    expect(() => parseReadingList("x.csv", "Foo,Bar\n1,2")).toThrow(/Title/);
  });

  it("returns an empty list for header-only CSV", () => {
    expect(parseReadingList("x.csv", "Title")).toEqual([]);
  });

  it("parses JSON arrays and { books } objects, skipping invalid rows", () => {
    const rows = [{ title: "Dracula", authors: "Bram Stoker" }, 5, { title: " " }];
    const expected = [{ title: "Dracula", author: "Bram Stoker", subjects: [] }];
    expect(parseReadingList("a.json", JSON.stringify(rows))).toEqual(expected);
    expect(parseReadingList("a.json", JSON.stringify({ books: rows }))).toEqual(expected);
  });
});
