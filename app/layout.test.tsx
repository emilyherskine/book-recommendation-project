import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import RootLayout, { metadata } from "./layout";

vi.mock("next/font/google", () => {
  const font = () => ({ variable: "font-var" });
  return { Geist: font, Geist_Mono: font, Cinzel_Decorative: font, Cormorant_Garamond: font };
});
vi.mock("@vercel/analytics/react", () => ({ Analytics: () => null }));

describe("RootLayout", () => {
  it("sets the document language and renders children", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>hello</p>
      </RootLayout>,
    );
    expect(html).toContain('lang="en"');
    expect(html).toContain("<p>hello</p>");
  });

  it("has the site title", () => {
    expect(metadata.title).toContain("Gloaming Shelf");
  });
});
