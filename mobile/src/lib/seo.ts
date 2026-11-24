// What search engines and AI assistants read: the page title, the welcome-page FAQ and the structured data.
// The FAQ is shown on the welcome page AND sent as FAQPage data, so the two always match (Google requires it).

export const SITE = "https://midnightvibes.online";
export const TITLE = "Midnight Vibes: Free Truth or Dare, Spin the Wheel & Wheel of Misfortune for Couples & Parties";
export const DESCRIPTION =
  "Free adult party games for couples, friends, girls' night and boys' night: Truth or Dare, Spin the Wheel and Wheel of Misfortune, tailored by AI to your mood. No download, no sign-up.";
export const SHARE_IMAGE = `${SITE}/og.png`;

export const HEADLINE = "Free Truth or Dare, Spin the Wheel and Wheel of Misfortune for couples and parties";
export const INTRO =
  "Midnight Vibes is a party game for adults that runs in your browser. Pick your group, set the heat, and play Truth or Dare, Spin the Wheel or the Wheel of Misfortune on one phone.";

export const FAQ: { q: string; a: string }[] = [
  {
    q: "Is Midnight Vibes free?",
    a: "Yes. You can play as a guest with free cards every day. A free account unlocks more, such as AI moods and live games.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. It runs in your phone's browser, with no download and no sign-up. You can add it to your home screen to open it like an app.",
  },
  {
    q: "What games can we play?",
    a: "Truth or Dare, Spin the Wheel and the Wheel of Misfortune. Drinks are optional: switch them off and water works just as well.",
  },
  {
    q: "Who is it for?",
    a: "Adults aged 18 and over: couples, friends, girls' night and boys' night. Each group gets its own cards.",
  },
  {
    q: "How spicy does it get?",
    a: "You choose the heat: Flirty, Steamy or Spicy. It can rise slowly as you play, starting mild, and you can undo it or turn it off in settings.",
  },
  {
    q: "Can we use our own dares?",
    a: "Yes. Type a mood and the AI writes cards and wheels for it, or paste your own list of dares and it becomes a wheel.",
  },
  {
    q: "Is every dare optional?",
    a: "Always. Anyone can skip a card, say stop or leave at any time. Only do what everyone clearly agrees to.",
  },
];

/** JSON-LD for the welcome page: the app itself and its FAQ. */
export function structuredData() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Midnight Vibes",
      url: `${SITE}/`,
      description: DESCRIPTION,
      applicationCategory: "GameApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires JavaScript",
      inLanguage: "en",
      isFamilyFriendly: false,
      typicalAgeRange: "18-",
      image: SHARE_IMAGE,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
}
