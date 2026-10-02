"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { genreCatalog, type GenreGroup, type LocalReadingData, type OpenLibraryBook, type ReadingHistoryEntry, type ReadingMode, type RecommendationSource } from "@/app/lib/reader-data";
import { parseReadingList } from "@/app/lib/reading-list";
import { BookCover, ChoiceGroup, ModeSelector, SectionHeading } from "@/app/components/ui/reader-ui";

export function ReaderDnaPage({ data }: { data: LocalReadingData }) {
  const hasReadData = data.readingHistory.length > 0;
  return <><SectionHeading detail="A snapshot shaped by the books you’ve read. Add more history to refine the pattern." eyebrow="YOUR READER DNA" title="Your reader DNA" /><section className="dna-layout"><div className="dna-intro"><span aria-hidden="true" className="dna-emblem">✳</span><p className="eyebrow">{hasReadData ? "LEARNING FROM YOUR SHELF" : "A STARTING POINT"}</p><h2>{data.dna.mood}.<br /><em>{data.dna.pace}.</em><br />{data.dna.setting}.</h2><p>{hasReadData ? `This snapshot uses ${data.readingHistory.length} books in your reading history. Add more history to refine the pattern.` : "Add a reading-history file to reveal patterns in the books you enjoy."}</p><span className="dna-updated">STORED ONLY IN THIS BROWSER</span></div><div className="dna-details"><h3>Your story ingredients</h3>{Object.entries(data.dna).map(([label, value], index) => <div className="dna-trait" key={label}><span className="trait-index">0{index + 1}</span><div><span>{label}</span><strong>{value}</strong></div><span aria-label={hasReadData ? "Based on local reading history" : "General starting value"} className="trait-evidence">{hasReadData ? "SHELF" : "START"}</span></div>)}<h3 className="favorites-title">Your lists</h3><ul className="favorite-list"><li>Reading history<span>{data.readingHistory.length}</span></li><li>To be read<span>{data.tbr.length}</span></li></ul></div></section></>;
}

export function ImportReadsPage({ data, onImport }: { data: LocalReadingData; onImport: (source: "history" | "tbr", entries: ReadingHistoryEntry[]) => void }) {
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [source, setSource] = useState<"history" | "tbr">("tbr");
  const inputRef = useRef<HTMLInputElement>(null);

  async function readFile(file?: File) {
    if (!file) return;
    setError("");
    setMessage("");
    if (file.size > 20 * 1024 * 1024) {
      setError("This file is larger than 20 MB. Export a smaller reading list and try again.");
      return;
    }
    try {
      const entries = parseReadingList(file.name, await file.text());
      if (!entries.length) throw new Error("No book titles were found. Check the file format and try again.");
      onImport(source, entries);
      setFileName(file.name);
      setMessage(`${entries.length} books added to your ${source === "tbr" ? "TBR" : "reading history"}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read this file.");
    }
  }
  return <><SectionHeading detail="Keep a TBR to draw your pick from, or import reading history to tune recommendations. Your lists stay in this browser." eyebrow="YOUR BOOK LISTS" title="Upload books" /><div className="list-counts"><div><span>TO BE READ</span><strong>{data.tbr.length}</strong></div><div><span>READING HISTORY</span><strong>{data.readingHistory.length}</strong></div></div><ChoiceGroup ariaLabel="Choose which list to update" className="import-source-toggle" options={[{ value: "tbr", label: "To be read" }, { value: "history", label: "Already read" }]} selected={source} onSelect={setSource} /><section className="import-panel"><div aria-hidden="true" className="import-symbol">⇧</div><h2>Upload your {source === "tbr" ? "TBR" : "reading history"}</h2><p>Choose a CSV or JSON file. We read it in this browser and keep it on this device only.</p><input accept=".csv,text/csv,.json,application/json" className="visually-hidden" id="reading-file" onChange={(event) => { void readFile(event.target.files?.[0]); event.currentTarget.value = ""; }} ref={inputRef} type="file" /><button className="button button-primary" onClick={() => inputRef.current?.click()} type="button">Choose a CSV or JSON file</button>{fileName && <p aria-live="polite" className="file-status">Imported: {fileName}</p>}{message && <p aria-live="polite" className="file-status">{message}</p>}{error && <p aria-live="polite" className="form-error">{error}</p>}<span className="file-types">CSV needs a Title column · JSON accepts a books array · 20 MB maximum</span></section><div className="import-sources"><span>SUPPORTED SOURCES</span><strong>Goodreads CSV</strong><strong>StoryGraph CSV</strong><strong>Book title JSON</strong></div></>;
}

function tbrRecommendations(data: LocalReadingData, mode: ReadingMode, genres: string[], query: string): OpenLibraryBook[] {
  const modeWords: Record<ReadingMode, string[]> = {
    Comfort: ["cozy", "amateur", "sleuth", "small", "town", "village", "friendship"],
    Challenge: ["historical", "literary", "detective", "puzzle", "complex", "classic"],
    Festive: ["christmas", "winter", "holiday", "snow", "festive", "seasonal"],
    "Wild card": ["unusual", "experimental", "speculative", "surreal", "unexpected"],
  };
  const queryWords = query.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  return data.tbr
    .map((entry, index) => {
      const text = `${entry.title} ${entry.author ?? ""} ${entry.subjects.join(" ")}`.toLowerCase();
      if (queryWords.length && !queryWords.some((word) => text.includes(word))) return null;
      const moodMatches = modeWords[mode].filter((word) => text.includes(word));
      const genreTerms = genres.flatMap((genre) => genreCatalog.find((item) => item.name === genre)?.terms ?? [genre.toLowerCase()]);
      const themeMatches = genreTerms.filter((word) => text.includes(word));
      const dnaWords = `${data.dna.mood} ${data.dna.pace} ${data.dna.setting}`.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3);
      const dnaMatches = dnaWords.filter((word) => text.includes(word));
      const reasons = ["From your TBR", ...themeMatches.slice(0, 2).map((word) => `Fits your selected genres: ${word}`), ...moodMatches.slice(0, 2).map((word) => `Fits your ${mode.toLowerCase()} mood: ${word}`), ...dnaMatches.slice(0, 2).map((word) => `Matches your reading DNA: ${word}`)];
      return {
        key: `tbr:${entry.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${index}`,
        title: entry.title,
        authors: entry.author ? [entry.author] : [],
        subjects: entry.subjects,
        recommendationScore: themeMatches.length * 5 + moodMatches.length * 2 + dnaMatches.length * 2,
        recommendationReasons: reasons,
        source: "tbr" as const,
      };
    })
    .filter((book): book is NonNullable<typeof book> => book !== null)
    .sort((first, second) => (second.recommendationScore ?? 0) - (first.recommendationScore ?? 0));
}

export function MonthlyPickPage({ data, mode, onModeSelect, onReveal, onSelectBook }: { data: LocalReadingData; mode: ReadingMode; onModeSelect: (mode: ReadingMode) => void; onReveal: () => void; onSelectBook: (book: OpenLibraryBook | null) => void }) {
  const [books, setBooks] = useState<OpenLibraryBook[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [source, setSource] = useState<RecommendationSource>("all");
  const [genres, setGenres] = useState<string[]>([]);
  const [genreSearch, setGenreSearch] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [requestVersion, setRequestVersion] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 8;

  function resetPool() {
    setLoading(true);
    setError("");
    setBooks([]);
    setSelectedKey("");
    onSelectBook(null);
    setOffset(0);
    setRequestVersion((version) => version + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    const localBooks = source === "open-library" ? [] : tbrRecommendations(data, mode, genres, submittedQuery);
    const localPage = localBooks.slice(offset, offset + limit);
    if (source === "tbr") {
      Promise.resolve().then(() => {
        if (controller.signal.aborted) return;
        setBooks((current) => offset === 0 ? localPage : [...current, ...localPage]);
        setHasMore(offset + limit < localBooks.length);
        if (offset === 0 && localPage.length) {
          const randomBook = localPage[Math.floor(Math.random() * localPage.length)];
          setSelectedKey(randomBook.key);
          onSelectBook(randomBook);
        }
        setLoading(false);
      });
      return () => controller.abort();
    }
    const params = new URLSearchParams({ mode, limit: String(limit), offset: String(offset) });
    for (const genre of genres) params.append("genre", genre);
    params.set("mood", data.dna.mood);
    params.set("pace", data.dna.pace);
    params.set("setting", data.dna.setting);
    params.set("favorites", data.tbr.slice(0, 6).map((entry) => entry.title).join(" "));
    if (submittedQuery) params.set("q", submittedQuery);
    fetch(`/api/books?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Book search is unavailable.");
        return result as { items: OpenLibraryBook[]; hasMore: boolean };
      })
      .then((result) => {
        const seenBooks = new Set(localPage.map((book) => `${book.title.toLocaleLowerCase()}|${book.authors[0]?.toLocaleLowerCase() ?? ""}`));
        const combined = [...localPage, ...result.items.filter((book) => {
          const signature = `${book.title.toLocaleLowerCase()}|${book.authors[0]?.toLocaleLowerCase() ?? ""}`;
          if (seenBooks.has(signature)) return false;
          seenBooks.add(signature);
          return true;
        })];
        setBooks((current) => offset === 0 ? combined : [...current, ...combined]);
        setHasMore(result.hasMore || offset + limit < localBooks.length);
        if (offset === 0 && combined.length) {
          const randomBook = combined[Math.floor(Math.random() * combined.length)];
          setSelectedKey(randomBook.key);
          onSelectBook(randomBook);
        }
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== "AbortError") {
          setError(reason.message || "Book search is unavailable.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [data, mode, offset, submittedQuery, requestVersion, source, genres, onSelectBook]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetPool();
    setSubmittedQuery(query.trim());
  }

  function changeMode(nextMode: ReadingMode) {
    resetPool();
    onModeSelect(nextMode);
  }

  function changeSource(nextSource: RecommendationSource) {
    resetPool();
    setSource(nextSource);
  }

  function toggleGenre(genre: string) {
    resetPool();
    setGenres((current) => current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre]);
  }

  function addCustomGenre() {
    const genre = customGenre.trim();
    if (!genre || genres.some((item) => item.toLowerCase() === genre.toLowerCase())) return;
    resetPool();
    setGenres((current) => [...current, genre]);
    setCustomGenre("");
  }

  function surpriseAgain() {
    if (!books.length) return;
    const alternatives = books.filter((book) => book.key !== selectedKey);
    const pool = alternatives.length ? alternatives : books;
    const randomBook = pool[Math.floor(Math.random() * pool.length)];
    setSelectedKey(randomBook.key);
    onSelectBook(randomBook);
  }

  function loadMore() {
    setLoading(true);
    setOffset((current) => current + limit);
  }

  const filteredGenres = genreCatalog.filter((genre) => genre.name.toLowerCase().includes(genreSearch.trim().toLowerCase()));
  const genreGroups = [...new Set(filteredGenres.map((genre) => genre.group))] as GenreGroup[];

  return <><SectionHeading
    detail="Choose one, several, or leave genres open. We’ll draw from the whole shelf or your chosen corners, then keep the book hidden until the reveal."
    eyebrow="THE CURATED SURPRISE"
    title="Choose the kind of curious"
  />
    <ModeSelector onSelect={changeMode} selected={mode} />
    <section aria-label="Book genres" className="genre-picker">
      <div className="genre-picker-heading">
        <div><p className="eyebrow">GENRES</p><span>{genres.length ? `${genres.length} selected` : "All genres"}</span></div>
        <button aria-pressed={genres.length === 0} className={`all-genres${genres.length === 0 ? " all-genres-active" : ""}`} onClick={() => { if (genres.length) { resetPool(); setGenres([]); } }} type="button">All genres</button>
      </div>
      {genres.length > 0 && <ul aria-label="Selected genres" className="selected-genres">{genres.map((genre) => <li key={genre}><span>{genre}</span><button aria-label={`Remove ${genre}`} onClick={() => toggleGenre(genre)} type="button">×</button></li>)}</ul>}
      <label className="genre-search-label" htmlFor="genre-search">Find genres</label>
      <input autoComplete="off" className="genre-search" id="genre-search" onChange={(event) => setGenreSearch(event.target.value)} placeholder="Search genres or add your own" value={genreSearch} />
      <div className="genre-groups">
        {genreGroups.map((group) => <fieldset className="genre-group" key={group}><legend>{group}</legend><div>{filteredGenres.filter((genre) => genre.group === group).map((genre) => <label className="genre-option" key={genre.name}><input checked={genres.includes(genre.name)} onChange={() => toggleGenre(genre.name)} type="checkbox" /><span>{genre.name}</span></label>)}</div></fieldset>)}
      </div>
      {genreSearch.trim() && !genreCatalog.some((genre) => genre.name.toLowerCase() === genreSearch.trim().toLowerCase()) && <button className="custom-genre-add" onClick={addCustomGenre} type="button">Add “{genreSearch.trim()}” as a genre</button>}
    </section>
    <ChoiceGroup
      ariaLabel="Choose book recommendation source"
      className="recommendation-source"
      options={[
        { value: "all", label: "TBR + Open Library", detail: `${data.tbr.length} in TBR` },
        { value: "tbr", label: "My TBR", detail: String(data.tbr.length), disabled: data.tbr.length === 0 },
        { value: "open-library", label: "Open Library" },
      ]}
      selected={source}
      onSelect={changeSource}
    />
    {source !== "tbr" && (
      <form className="catalog-search" onSubmit={submitSearch}>
        <label htmlFor="book-search">Optional detail to narrow the pool</label>
        <div>
          <input id="book-search" onChange={(event) => setQuery(event.target.value)} placeholder="A trope, author, setting, or mood" value={query} />
          <button className="button button-primary" type="submit">Refine <span aria-hidden="true">⌕</span></button>
        </div>
      </form>
    )}
    <div className="sealed-pick" aria-live="polite" aria-busy={loading}>
      <span className="sealed-mark" aria-hidden="true">✳</span>
      <p className="eyebrow">{loading ? "CURATING YOUR SHORTLIST" : error ? "THE SHELF IS QUIET" : "YOUR PICK IS SEALED"}</p>
      <h2>{loading ? "Finding the right kind of mystery…" : error ? "We couldn’t reach the book shelf." : "A surprise is waiting."}</h2>
      <p>{error || (loading ? "Matching your genres, mood, and chosen book sources." : `${genres.length ? genres.join(" + ") : "All genres"} · ${mode} · ${books.length} hidden ${books.length === 1 ? "pick" : "picks"} in the shortlist`)}</p>
    </div>
    {error && <p aria-live="polite" className="catalog-message catalog-error">{error}</p>}
    {!loading && !error && books.length === 0 && (
      <p className="catalog-message">{source === "tbr" ? "No matching books in this TBR. Choose TBR + Open Library to widen the pool." : "No books found in this theme. Try a different genre or broader detail."}</p>
    )}
    {hasMore && <button className="button button-secondary" disabled={loading} onClick={loadMore} type="button">Widen the surprise pool</button>}
    <div className="pick-actions">
      <button className="button button-secondary" disabled={books.length < 2 || loading} onClick={surpriseAgain} type="button">Surprise me again <span aria-hidden="true">⟳</span></button>
      <button className="button button-primary" disabled={!selectedKey || loading} onClick={onReveal} type="button">Reveal my book <span aria-hidden="true">↗</span></button>
    </div>
  </>;
}

export function BookRevealPage({ data, selectedBook, onChooseBook }: { data: LocalReadingData; selectedBook: OpenLibraryBook | null; onChooseBook: () => void }) {
  if (!selectedBook) return <><SectionHeading detail="Choose a mystery from your TBR or Open Library before opening your reveal." eyebrow="YOUR MYSTERY REVEAL" title="Your book is still waiting." /><button className="button button-primary" onClick={onChooseBook} type="button">Choose a mystery <span aria-hidden="true">↗</span></button></>;
  const title = selectedBook.title;
  const author = selectedBook.authors.join(", ") || "Author unknown";
  const reasons = selectedBook.recommendationReasons ?? selectedBook.subjects.slice(0, 3);
  return <><SectionHeading detail={selectedBook.source === "tbr" ? "A mystery from your own to-be-read list, selected for this month’s mood." : "Your selected mystery from Open Library. This pick and your TBR stay in this browser."} eyebrow="YOUR MYSTERY REVEAL" title="A mystery picked for you." /><section className="reveal-layout"><div className="reveal-cover-wrap">{selectedBook.coverUrl ? <Image alt={`Cover of ${title}`} className="reveal-api-cover" height={365} src={selectedBook.coverUrl} unoptimized width={245} /> : <BookCover author={author} revealed title={title} />}<span className="cover-caption">{selectedBook.source === "tbr" ? "FROM YOUR TBR" : `OPEN LIBRARY · ${data.monthlyMode.toUpperCase()}`}</span></div><div className="reveal-copy"><span className="large-match match-score">✳<small>{selectedBook.source === "tbr" ? "your shelf, your choice" : "selected from Open Library"}</small></span><p className="eyebrow">THE {data.monthlyMode.toUpperCase()} PICK</p><h2>{title}</h2><p className="reveal-author">{author}{selectedBook.firstPublished ? ` · ${selectedBook.firstPublished}` : ""}{selectedBook.pageCount ? ` · ${selectedBook.pageCount} pages` : ""}</p>{selectedBook.firstSentence && <p className="body-copy">{selectedBook.firstSentence}</p>}<ul className="reason-list">{reasons.map((reason) => <li key={reason}><span aria-hidden="true">✳</span>{reason}</li>)}</ul>{selectedBook.source !== "tbr" && <p className="setting-note">OPEN LIBRARY WORK <strong>{selectedBook.key}</strong></p>}</div></section></>;
}