// Web only: each page's title, description and canonical link, plus the welcome page's structured data.
// React 19 moves <title>, <meta> and <link> into <head> by itself, also in the HTML built for search engines.
import { usePathname } from "expo-router";
import { Platform } from "react-native";

import { DESCRIPTION, SITE, TITLE, structuredData } from "@/lib/seo";

const PAGES: Record<string, { title: string; description: string }> = {
  "/terms": { title: "Terms of use · Midnight Vibes", description: "The rules for using Midnight Vibes, in plain words." },
  "/privacy": { title: "Privacy policy · Midnight Vibes", description: "What Midnight Vibes collects, why, and the choices you have." },
  "/refunds": { title: "Refund policy · Midnight Vibes", description: "When and how you can get your money back for Premium." },
};

// In the browser, React adds its own copies of these tags rather than taking over the ones in the built HTML,
// so drop the built ones first: otherwise the first page's title would stick after moving to another page.
if (Platform.OS === "web" && typeof document !== "undefined")
  document.head
    .querySelectorAll('title, link[rel="canonical"], meta[name="description"], meta[property="og:title"], meta[property="og:description"], meta[property="og:url"]')
    .forEach((n) => n.remove());

export function SeoHead() {
  const path = usePathname();
  if (Platform.OS !== "web") return null;
  const page = PAGES[path] ?? { title: TITLE, description: DESCRIPTION };
  // Game screens are behind the 18+ page and aren't in the sitemap: they all point search engines at the welcome page
  const canonical = PAGES[path] ? SITE + path : `${SITE}/`;
  return (
    <>
      <title>{page.title}</title>
      <meta name="description" content={page.description} />
      <meta property="og:title" content={page.title} />
      <meta property="og:description" content={page.description} />
      <meta property="og:url" content={canonical} />
      <link rel="canonical" href={canonical} />
      {path === "/" ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }} /> : null}
    </>
  );
}
