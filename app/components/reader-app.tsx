"use client";

import { startTransition, useEffect, useState } from "react";
import type {
  LocalReadingData,
  OpenLibraryBook,
  ReadingHistoryEntry,
  ReadingMode,
} from "@/app/lib/reader-data";
import { deriveReaderDNA } from "@/app/lib/reader-data";
import { applyEnrichment, fetchEnrichment } from "@/app/lib/enrich";
import {
  ReaderSidebar,
  ReaderTopbar,
  type View,
} from "@/app/components/navigation/reader-navigation";
import { FeedbackPage } from "@/app/components/pages/feedback-page";
import {
  BookRevealPage,
  ImportReadsPage,
  MonthlyPickPage,
  ReaderDnaPage,
} from "@/app/components/pages/reader-pages";

const STORAGE_KEY = "marginalia:reading-data";
const defaultData: LocalReadingData = {
  dna: { mood: "Atmospheric", pace: "Steady clues", setting: "Small towns" },
  readingHistory: [],
  tbr: [],
  monthlyMode: "Comfort",
  preferences: { format: "Any format", length: "Any length", spiceLevel: 2 },
};

export default function ReaderApp() {
  const [activeView, setActiveView] = useState<View>("Monthly pick");
  const [data, setData] = useState<LocalReadingData>(defaultData);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<OpenLibraryBook | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<LocalReadingData>;
        const restoredHistory = Array.isArray(parsed.readingHistory) ? parsed.readingHistory : [];
        const restoredTbr = Array.isArray(parsed.tbr) ? parsed.tbr : [];
        const restored: LocalReadingData = {
          ...defaultData,
          ...parsed,
          dna: deriveReaderDNA(restoredHistory, defaultData.dna, restoredTbr),
          preferences: {
            ...defaultData.preferences,
            ...parsed.preferences,
            spiceLevel: Math.min(5, Math.max(1, parsed.preferences?.spiceLevel ?? 2)),
          },
          readingHistory: restoredHistory,
          tbr: restoredTbr,
        };
        startTransition(() => setData(restored));
      }
    } catch (error) {
      console.error("Could not load local reading data", error);
      localStorage.removeItem(STORAGE_KEY);
    }
    startTransition(() => setHydrated(true));
  }, []);

  function saveData(nextData: LocalReadingData) {
    setData(nextData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
  }

  function navigate(view: View) {
    setActiveView(view);
    setMenuOpen(false);
  }

  async function importReadingData(lists: {
    history: ReadingHistoryEntry[];
    tbr: ReadingHistoryEntry[];
  }) {
    const nextHistory = [...data.readingHistory, ...lists.history];
    const nextTbr = [
      ...new Map(
        [...data.tbr, ...lists.tbr].map((entry) => [entry.title.toLocaleLowerCase(), entry]),
      ).values(),
    ];
    saveData({
      ...data,
      readingHistory: nextHistory,
      tbr: nextTbr,
      dna: deriveReaderDNA(nextHistory, defaultData.dna, nextTbr),
    });
    const found = await fetchEnrichment([...nextTbr, ...nextHistory]);
    if (!found.size) return;
    // Merge into the latest state so edits made during the lookup aren't lost.
    setData((current) => {
      const readingHistory = applyEnrichment(current.readingHistory, found);
      const tbr = applyEnrichment(current.tbr, found);
      const enriched = {
        ...current,
        readingHistory,
        tbr,
        dna: deriveReaderDNA(readingHistory, defaultData.dna, tbr),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
      return enriched;
    });
  }

  function selectMode(monthlyMode: ReadingMode) {
    saveData({ ...data, monthlyMode });
  }

  function savePreferences(preferences: LocalReadingData["preferences"]) {
    saveData({ ...data, preferences });
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <ReaderSidebar
        activeView={activeView}
        menuOpen={menuOpen}
        tbrCount={data.tbr.length}
        onNavigate={navigate}
      />
      <div className="main-column">
        <ReaderTopbar
          activeView={activeView}
          menuOpen={menuOpen}
          tbrCount={data.tbr.length}
          onToggleMenu={() => setMenuOpen(!menuOpen)}
        />
        <main className="main-content" id="main-content" tabIndex={-1}>
          {!hydrated ? (
            <p aria-live="polite">Opening your reading room…</p>
          ) : activeView === "Your reader DNA" ? (
            <ReaderDnaPage data={data} />
          ) : activeView === "Import your reads" ? (
            <ImportReadsPage data={data} onImport={importReadingData} />
          ) : activeView === "The reveal" ? (
            <BookRevealPage
              data={data}
              selectedBook={selectedBook}
              onChooseBook={() => navigate("Monthly pick")}
            />
          ) : activeView === "Feedback" ? (
            <FeedbackPage />
          ) : (
            <MonthlyPickPage
              data={data}
              mode={data.monthlyMode}
              onModeSelect={selectMode}
              onPreferencesChange={savePreferences}
              onOpenImport={() => navigate("Import your reads")}
              onReveal={() => navigate("The reveal")}
              onSelectBook={setSelectedBook}
            />
          )}
        </main>
        <footer className="site-footer">
          <span>Your reading lists are saved on this device.</span>
          <span>
            YOUR STORIES STAY YOURS <span aria-hidden="true">✳</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
