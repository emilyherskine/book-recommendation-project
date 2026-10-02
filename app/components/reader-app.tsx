"use client";

import { startTransition, useEffect, useState } from "react";
import type {
  LocalReadingData,
  OpenLibraryBook,
  ReadingHistoryEntry,
  ReadingMode,
} from "@/app/lib/reader-data";
import { deriveReaderDNA } from "@/app/lib/reader-data";
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
        const restored: LocalReadingData = {
          ...defaultData,
          ...parsed,
          dna: { ...defaultData.dna, ...parsed.dna },
          preferences: { ...defaultData.preferences, ...parsed.preferences },
          readingHistory: Array.isArray(parsed.readingHistory) ? parsed.readingHistory : [],
          tbr: Array.isArray(parsed.tbr) ? parsed.tbr : [],
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

  function importReadingData(source: "history" | "tbr", entries: ReadingHistoryEntry[]) {
    const nextHistory =
      source === "history" ? [...data.readingHistory, ...entries] : data.readingHistory;
    const nextTbr =
      source === "tbr"
        ? [
            ...new Map(
              [...data.tbr, ...entries].map((entry) => [entry.title.toLocaleLowerCase(), entry]),
            ).values(),
          ]
        : data.tbr;
    saveData({
      ...data,
      readingHistory: nextHistory,
      tbr: nextTbr,
      dna: deriveReaderDNA(nextHistory, data.dna),
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
