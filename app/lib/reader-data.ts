export type ReadingMode = "Comfort" | "Challenge" | "Festive" | "Wild card";
export type GenreGroup = "Fiction" | "Romance" | "Fantasy & speculative" | "Mystery & suspense" | "Horror & gothic" | "Historical" | "Other fiction";

export type GenreOption = {
  name: string;
  group: GenreGroup;
  query: string;
  terms: string[];
  field?: "subject";
};

export type ReaderDNA = {
  mood: string;
  pace: string;
  setting: string;
};

export type ReadingHistoryEntry = {
  title: string;
  author?: string;
  subjects: string[];
};

export type RecommendationSource = "all" | "tbr" | "open-library";

export const genreCatalog: GenreOption[] = [
  { name: "Contemporary", group: "Fiction", query: "contemporary fiction", terms: ["contemporary", "modern", "present day"] },
  { name: "Domestic fiction", group: "Fiction", query: "domestic fiction", terms: ["domestic fiction", "domestic life"] },
  { name: "Psychological fiction", group: "Fiction", query: "psychological fiction", terms: ["psychological fiction", "psychological"] },
  { name: "Satire", group: "Fiction", query: "satirical fiction", terms: ["satire", "satirical"] },
  { name: "Philosophical fiction", group: "Fiction", query: "philosophical fiction", terms: ["philosophical fiction", "philosophy"] },
  { name: "Epistolary", group: "Fiction", query: "epistolary fiction", terms: ["epistolary", "letters"] },
  { name: "LGBTQ+ fiction", group: "Fiction", query: "LGBTQ fiction", terms: ["lgbtq", "queer fiction", "lesbian fiction", "gay fiction"] },
  { name: "Inspirational fiction", group: "Fiction", query: "inspirational fiction", terms: ["inspirational", "inspiration"] },
  { name: "Christian fiction", group: "Fiction", query: "christian fiction", terms: ["christian fiction", "christian"] },
  { name: "Literary fiction", group: "Fiction", query: "literary fiction", terms: ["literary", "literature"] },
  { name: "General fiction", group: "Fiction", query: "fiction", field: "subject", terms: ["fiction", "novel"] },
  { name: "Coming of age", group: "Fiction", query: "coming of age fiction", terms: ["coming of age", "bildungsroman"] },
  { name: "Family saga", group: "Fiction", query: "family saga fiction", terms: ["family saga", "family life"] },
  { name: "Humor", group: "Fiction", query: "humorous fiction", terms: ["humor", "humorous", "comedy"] },
  { name: "Adventure", group: "Fiction", query: "adventure fiction", terms: ["adventure", "adventurer"] },
  { name: "Romance", group: "Romance", query: "romance", field: "subject", terms: ["romance", "romantic", "love story"] },
  { name: "Contemporary romance", group: "Romance", query: "contemporary romance", terms: ["contemporary romance", "modern romance"] },
  { name: "Historical romance", group: "Romance", query: "historical romance", terms: ["historical romance", "regency romance"] },
  { name: "Dark romance", group: "Romance", query: "dark romance fiction", terms: ["dark romance", "dark romantic", "gothic romance"] },
  { name: "Romantic suspense", group: "Romance", query: "romantic suspense", terms: ["romantic suspense", "romance suspense"] },
  { name: "Romantic comedy", group: "Romance", query: "romantic comedy fiction", terms: ["romantic comedy", "rom-com"] },
  { name: "Fantasy romance", group: "Romance", query: "fantasy romance romantasy", terms: ["fantasy romance", "romantasy", "romantic fantasy"] },
  { name: "LGBTQ+ romance", group: "Romance", query: "LGBTQ romance", terms: ["queer romance", "lgbtq romance", "lesbian romance", "gay romance"] },
  { name: "Sports romance", group: "Romance", query: "sports romance", terms: ["sports romance", "hockey romance", "football romance"] },
  { name: "Small-town romance", group: "Romance", query: "small town romance", terms: ["small-town romance", "small town romance"] },
  { name: "Billionaire romance", group: "Romance", query: "billionaire romance", terms: ["billionaire romance", "wealthy hero"] },
  { name: "Second chance romance", group: "Romance", query: "second chance romance", terms: ["second chance romance"] },
  { name: "Friends to lovers", group: "Romance", query: "friends to lovers romance", terms: ["friends to lovers", "friendship romance"] },
  { name: "Enemies to lovers", group: "Romance", query: "enemies to lovers romance", terms: ["enemies to lovers", "rivals to lovers"] },
  { name: "Paranormal romance", group: "Romance", query: "paranormal romance", terms: ["paranormal romance", "vampire romance"] },
  { name: "Fantasy", group: "Fantasy & speculative", query: "fantasy", field: "subject", terms: ["fantasy", "magic", "magical"] },
  { name: "Epic fantasy", group: "Fantasy & speculative", query: "epic fantasy", terms: ["epic fantasy", "high fantasy"] },
  { name: "Dark fantasy", group: "Fantasy & speculative", query: "dark fantasy", terms: ["dark fantasy", "grimdark"] },
  { name: "Cozy fantasy", group: "Fantasy & speculative", query: "cozy fantasy", terms: ["cozy fantasy", "cosy fantasy"] },
  { name: "Sword and sorcery", group: "Fantasy & speculative", query: "sword and sorcery fantasy", terms: ["sword and sorcery"] },
  { name: "Portal fantasy", group: "Fantasy & speculative", query: "portal fantasy", terms: ["portal fantasy", "worlds"] },
  { name: "Magical realism", group: "Fantasy & speculative", query: "magical realism", terms: ["magical realism"] },
  { name: "Superhero fiction", group: "Fantasy & speculative", query: "superhero fiction", terms: ["superhero", "superheroes"] },
  { name: "Post-apocalyptic", group: "Fantasy & speculative", query: "post-apocalyptic fiction", terms: ["post-apocalyptic", "post apocalyptic"] },
  { name: "Climate fiction", group: "Fantasy & speculative", query: "climate fiction cli-fi", terms: ["climate fiction", "cli-fi"] },
  { name: "Cyberpunk", group: "Fantasy & speculative", query: "cyberpunk fiction", terms: ["cyberpunk"] },
  { name: "Steampunk", group: "Fantasy & speculative", query: "steampunk fiction", terms: ["steampunk"] },
  { name: "Paranormal fiction", group: "Fantasy & speculative", query: "paranormal fiction", terms: ["paranormal", "supernatural"] },
  { name: "Urban fantasy", group: "Fantasy & speculative", query: "urban fantasy", terms: ["urban fantasy", "city fantasy"] },
  { name: "Fairy tales", group: "Fantasy & speculative", query: "fairy tales fantasy", terms: ["fairy tale", "fairy tales"] },
  { name: "Mythology", group: "Fantasy & speculative", query: "mythology fiction", terms: ["mythology", "mythological"] },
  { name: "Science fiction", group: "Fantasy & speculative", query: '"science fiction"', field: "subject", terms: ["science fiction", "sci-fi"] },
  { name: "Dystopian", group: "Fantasy & speculative", query: "dystopian fiction", terms: ["dystopian", "dystopia"] },
  { name: "Utopian", group: "Fantasy & speculative", query: "utopian fiction", terms: ["utopian", "utopia"] },
  { name: "Space opera", group: "Fantasy & speculative", query: "space opera science fiction", terms: ["space opera", "space travel"] },
  { name: "Time travel", group: "Fantasy & speculative", query: "time travel fiction", terms: ["time travel", "time loop"] },
  { name: "Alternate history", group: "Fantasy & speculative", query: "alternate history fiction", terms: ["alternate history", "alternative history"] },
  { name: "Mystery", group: "Mystery & suspense", query: "mystery", field: "subject", terms: ["mystery", "mysteries"] },
  { name: "Cozy mystery", group: "Mystery & suspense", query: "cozy mystery", terms: ["cozy mystery", "cosy mystery"] },
  { name: "Detective fiction", group: "Mystery & suspense", query: "detective fiction", terms: ["detective", "private investigator"] },
  { name: "Crime fiction", group: "Mystery & suspense", query: "crime fiction", terms: ["crime", "criminal"] },
  { name: "Thriller", group: "Mystery & suspense", query: "thriller", field: "subject", terms: ["thriller", "suspense"] },
  { name: "Psychological thriller", group: "Mystery & suspense", query: "psychological thriller", terms: ["psychological thriller", "psychological suspense"] },
  { name: "Domestic suspense", group: "Mystery & suspense", query: "domestic suspense", terms: ["domestic suspense", "domestic thriller"] },
  { name: "Legal thriller", group: "Mystery & suspense", query: "legal thriller", terms: ["legal thriller", "courtroom thriller"] },
  { name: "Medical thriller", group: "Mystery & suspense", query: "medical thriller", terms: ["medical thriller"] },
  { name: "Political thriller", group: "Mystery & suspense", query: "political thriller", terms: ["political thriller"] },
  { name: "Noir", group: "Mystery & suspense", query: "noir crime fiction", terms: ["noir", "hard-boiled"] },
  { name: "Historical mystery", group: "Mystery & suspense", query: "historical mystery", terms: ["historical mystery"] },
  { name: "Locked-room mystery", group: "Mystery & suspense", query: "locked room mystery", terms: ["locked-room", "locked room"] },
  { name: "Espionage", group: "Mystery & suspense", query: "spy fiction espionage", terms: ["espionage", "spy", "spies"] },
  { name: "Heist", group: "Mystery & suspense", query: "heist fiction", terms: ["heist", "robbery"] },
  { name: "Horror", group: "Horror & gothic", query: "horror", field: "subject", terms: ["horror", "terrifying"] },
  { name: "Cosmic horror", group: "Horror & gothic", query: "cosmic horror", terms: ["cosmic horror", "lovecraftian"] },
  { name: "Folk horror", group: "Horror & gothic", query: "folk horror", terms: ["folk horror"] },
  { name: "Body horror", group: "Horror & gothic", query: "body horror", terms: ["body horror"] },
  { name: "Psychological horror", group: "Horror & gothic", query: "psychological horror", terms: ["psychological horror"] },
  { name: "Vampires", group: "Horror & gothic", query: "vampire fiction", terms: ["vampire", "vampires"] },
  { name: "Witches", group: "Horror & gothic", query: "witch fiction", terms: ["witch", "witches"] },
  { name: "Gothic", group: "Horror & gothic", query: "gothic fiction", terms: ["gothic", "gothic fiction"] },
  { name: "Supernatural", group: "Horror & gothic", query: "supernatural fiction", terms: ["supernatural", "paranormal"] },
  { name: "Occult", group: "Horror & gothic", query: "occult fiction", terms: ["occult", "witchcraft"] },
  { name: "Ghost stories", group: "Horror & gothic", query: "ghost stories fiction", terms: ["ghost", "haunting", "haunted"] },
  { name: "Historical fiction", group: "Historical", query: '"historical fiction"', field: "subject", terms: ["historical fiction", "historical"] },
  { name: "Historical adventure", group: "Historical", query: "historical adventure fiction", terms: ["historical adventure"] },
  { name: "Historical romance", group: "Historical", query: "historical romance", terms: ["historical romance"] },
  { name: "Historical fantasy", group: "Historical", query: "historical fantasy", terms: ["historical fantasy"] },
  { name: "Biographical fiction", group: "Historical", query: "biographical fiction", terms: ["biographical fiction", "fictionalized biography"] },
  { name: "Ancient world", group: "Historical", query: "ancient historical fiction", terms: ["ancient", "classical antiquity"] },
  { name: "Medieval", group: "Historical", query: "medieval historical fiction", terms: ["medieval", "middle ages"] },
  { name: "Regency", group: "Historical", query: "regency fiction", terms: ["regency", "regency era"] },
  { name: "Victorian", group: "Historical", query: "victorian fiction", terms: ["victorian", "victorian era"] },
  { name: "War fiction", group: "Historical", query: "war fiction", terms: ["war fiction", "wartime"] },
  { name: "Western", group: "Other fiction", query: "western fiction", terms: ["western", "wild west"] },
  { name: "Travel fiction", group: "Other fiction", query: "travel fiction", terms: ["travel fiction", "journey"] },
  { name: "Nature writing", group: "Other fiction", query: "nature writing fiction", terms: ["nature writing", "natural world"] },
  { name: "Christian fantasy", group: "Other fiction", query: "christian fantasy", terms: ["christian fantasy"] },
  { name: "African American fiction", group: "Other fiction", query: "African American fiction", terms: ["african american fiction"] },
  { name: "Indigenous fiction", group: "Other fiction", query: "Indigenous fiction", terms: ["indigenous fiction", "native fiction"] },
  { name: "Literary suspense", group: "Other fiction", query: "literary suspense fiction", terms: ["literary suspense", "literary thriller"] },
  { name: "Short stories", group: "Other fiction", query: "short stories fiction", terms: ["short stories", "short story"] },
  { name: "Graphic novels", group: "Other fiction", query: "graphic novels fiction", terms: ["graphic novel", "comics"] },
  { name: "Young adult", group: "Other fiction", query: "young adult fiction", terms: ["young adult", "ya fiction"] },
  { name: "Middle grade", group: "Other fiction", query: "middle grade fiction", terms: ["middle grade", "juvenile fiction"] },
];

export type LocalReadingData = {
  dna: ReaderDNA;
  readingHistory: ReadingHistoryEntry[];
  tbr: ReadingHistoryEntry[];
  monthlyMode: ReadingMode;
};

export type OpenLibraryBook = {
  key: string;
  title: string;
  authors: string[];
  firstPublished?: number;
  coverUrl?: string;
  editionCount?: number;
  pageCount?: number;
  subjects: string[];
  firstSentence?: string;
  recommendationScore?: number;
  recommendationReasons?: string[];
  source?: "tbr" | "open-library";
};

export function deriveReaderDNA(
  history: ReadingHistoryEntry[],
  preferences: ReaderDNA,
): ReaderDNA {
  const tags = history.flatMap((entry) => entry.subjects).join(" ").toLowerCase();
  const titleText = history.map((entry) => entry.title).join(" ").toLowerCase();
  const text = `${tags} ${titleText}`;
  const pick = (candidates: Array<[string, string[]]>, fallback: string) =>
    candidates.find(([, terms]) => terms.some((term) => text.includes(term)))?.[0] ?? fallback;

  return {
    mood: pick([
      ["Atmospheric", ["gothic", "atmospheric", "haunting", "mood"]],
      ["Clever and cozy", ["cozy", "humor", "amateur sleuth", "village"]],
      ["Dark and twisty", ["psychological", "dark", "suspense", "thriller"]],
      ["Character-led", ["character", "family", "domestic"]],
    ], preferences.mood),
    pace: pick([
      ["Slow-burn", ["literary", "historical", "atmospheric"]],
      ["Page-turning", ["thriller", "suspense", "fast-paced"]],
      ["Steady clues", ["detective", "puzzle", "classic", "mystery"]],
    ], preferences.pace),
    setting: pick([
      ["Small towns", ["village", "small town", "country house", "cozy"]],
      ["Historic places", ["historical", "medieval", "victorian", "history"]],
      ["Big cities", ["city", "urban", "new york", "london"]],
    ], preferences.setting),
  };
}

export const modeSearchTerms: Record<ReadingMode, string> = {
  Comfort: "cozy amateur sleuth small town",
  Challenge: "historical literary detective puzzle",
  Festive: "christmas winter country house",
  "Wild card": "unusual experimental mystery",
};

export const readingModes: Array<{
  name: ReadingMode;
  descriptor: string;
  icon: string;
}> = [
  { name: "Comfort", descriptor: "A familiar kind of clever", icon: "⌂" },
  { name: "Challenge", descriptor: "Take the scenic route", icon: "↗" },
  { name: "Festive", descriptor: "Seasonal, with a twist", icon: "✳" },
  { name: "Wild card", descriptor: "Surprise me completely", icon: "✦" },
];


