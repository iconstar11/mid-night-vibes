// Words some players may not know (British slang, game terms). On cards they get a dotted underline:
// tap to see the meaning. Each entry: a pattern (whole words, case ignored) and a short meaning.
// Longer phrases come first so "never have I ever" wins over "ever".

const ENTRIES: [string, string][] = [
  ["never have i ever", "A game: say something you've never done. Anyone who has done it stands up (or drinks)."],
  ["hot sauce challenge", "Taste a little hot sauce and try not to react."],
  ["hot seat", "You sit in the middle and answer everyone's questions."],
  ["wild card", "A surprise: you choose who it goes to."],
  ["free pass", "Lets you skip one dare or forfeit later in the game."],
  ["pickup lines?", "A cheesy line used to start flirting with someone."],
  ["camera roll", "The photos saved on your phone."],
  ["lap dance", "A teasing dance done close to someone sitting down."],
  ["strip-tease", "A teasing dance as if taking clothes off."],
  ["runway walk", "Walking like a model on a fashion show stage."],
  ["guilty[- ]pleasure", "Something you enjoy but feel a bit embarrassed about."],
  ["turn-offs?", "Something that makes you lose interest in someone."],
  ["turns? (?:you )?on", "Makes you feel attracted or excited."],
  ["set you up", "Arrange a date for you with someone."],
  ["in your corner", "On your side, supporting you."],
  ["top up", "Fill a glass again."],
  ["lose a layer", "Take off one piece of clothing or an accessory."],
  ["dating profile", "Your page on a dating app."],
  ["the lads", "Your group of male friends."],
  ["lads", "Male friends (British slang)."],
  ["bum", "Bottom, buttocks (British)."],
  ["cheeky", "A bit naughty, in a playful way."],
  ["flustered", "Nervous and blushing."],
  ["sultry", "Hot and seductive."],
  ["seduce|seductive(?:ly)?", "Trying to attract someone in a sexy way."],
  ["serenade", "Sing a love song to someone."],
  ["impressions?", "Copying how someone talks and acts, for fun."],
  ["accents?", "A way of speaking from a place, like British or American."],
  ["forfeits?", "A small punishment you do because you lost or had bad luck."],
  ["catwalk", "Walk like a model at a fashion show."],
  ["vlogger", "Someone who makes video blogs (YouTube, TikTok)."],
  ["royalty", "Kings and queens."],
  ["jawline", "The edge of the jaw, from ear to chin."],
  ["blindfold(?:ed)?", "Eyes covered with a cloth so you can't see."],
  ["accessory|accessories", "Small things you wear, like a watch, earrings or a belt."],
  ["scandalous", "Shocking, the kind of thing people would gossip about."],
  ["pettiest|petty", "Small and silly, not really important."],
  ["fantasy|fantasies", "Something you imagine and wish would happen."],
  ["spanks?|spanked", "A light slap on the bottom, playful, never to hurt."],
  ["servant", "Someone who serves others: bring drinks, snacks, do what they ask."],
  ["wardrobes?", "All your clothes."],
  ["heartbreak", "Deep sadness when a relationship ends."],
  ["squats", "Exercise: bend your knees down and stand up again."],
  ["holiday", "A trip away, a vacation."],
  ["toast", "Raise your glass and say something nice before drinking."],
];

export type Gloss = { word: string; meaning: string } | string;

const RE = new RegExp(`\\b(${ENTRIES.map(([p]) => `(?:${p})`).join("|")})\\b`, "gi");
const MEANINGS = ENTRIES.map(([p, m]) => [new RegExp(`^(?:${p})$`, "i"), m] as const);

/** The text split into plain parts and glossary words (each word once per text, the first time it appears). */
export function glossParts(text: string): Gloss[] {
  const out: Gloss[] = [];
  const seen = new Set<string>();
  let last = 0;
  for (const m of text.matchAll(RE)) {
    const word = m[0];
    const meaning = MEANINGS.find(([re]) => re.test(word))?.[1];
    if (!meaning || seen.has(meaning)) continue;
    seen.add(meaning);
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push({ word, meaning });
    last = m.index! + word.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
