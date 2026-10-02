import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";
import type { LocalReadingData } from "@/app/lib/reader-data";
import { BookRevealPage, ImportReadsPage, MonthlyPickPage, ReaderDnaPage } from "./reader-pages";

const data: LocalReadingData = {
  dna: { mood: "Atmospheric", pace: "Steady clues", setting: "Small towns" },
  readingHistory: [],
  tbr: [],
  monthlyMode: "Comfort",
  preferences: { format: "Any format", length: "Any length", spiceLevel: 2 },
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, offset: 0, limit: 8, hasMore: false }),
    }),
  );
});

describe("reader pages", () => {
  it("shows the reader DNA", () => {
    render(<ReaderDnaPage data={data} />);
    expect(screen.getByText("Your story ingredients")).toBeInTheDocument();
  });

  it("prompts to choose a book when none is selected", () => {
    render(<BookRevealPage data={data} onChooseBook={() => {}} selectedBook={null} />);
    expect(screen.getByRole("button", { name: /Choose a mystery/ })).toBeInTheDocument();
  });

  it("reveals the selected book", () => {
    const book = { key: "/works/1", title: "Dracula", authors: ["Bram Stoker"], subjects: [] };
    render(<BookRevealPage data={data} onChooseBook={() => {}} selectedBook={book} />);
    expect(screen.getByRole("heading", { name: "Dracula" })).toBeInTheDocument();
  });

  it("imports a TBR file", async () => {
    const onImport = vi.fn();
    const { container } = render(<ImportReadsPage data={data} onImport={onImport} />);
    const file = new File(["Title,Author\nRebecca,du Maurier"], "tbr.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: async () => "Title,Author\nRebecca,du Maurier" });
    await userEvent.upload(container.querySelector<HTMLInputElement>("#reading-file")!, file);
    await waitFor(() =>
      expect(onImport).toHaveBeenCalledWith({ history: [], tbr: expect.any(Array) }),
    );
    expect(screen.getByText(/1 books added/)).toBeInTheDocument();
  });

  it("lets readers open the blind date form and requires consent", async () => {
    render(
      <MonthlyPickPage
        data={data}
        mode="Comfort"
        onModeSelect={() => {}}
        onOpenImport={() => {}}
        onPreferencesChange={() => {}}
        onReveal={() => {}}
        onSelectBook={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Arrange my surprise/ }));
    expect(screen.getByRole("button", { name: /Send my blind-date request/ })).toBeDisabled();
  });
});
