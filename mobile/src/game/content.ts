// Built-in content, copied from legacy/index.html. Decks: type -> heat level (0 Flirty, 1 Steamy, 2 Spicy).
// {target} in a dare is filled with a matching player (see match.ts).
import type { Deck, GroupId, PairId, Wedge } from "./types";
import { wedgeText } from "./wheel";

export const COUPLE: Deck = {
 "truth": [
  [
   "What was your first impression of me?",
   "What's one thing I do that instantly makes you smile?",
   "When did you first want to kiss me?",
   "Which outfit of mine is your favourite?",
   "What's the most romantic thing you've imagined us doing?",
   "What song reminds you of us?",
   "What's a small thing I did that you still think about?",
   "What did you think the first time you heard my voice?",
   "What's your favourite way to spend a lazy morning with me?",
   "Which of my habits do you secretly find cute?",
   "What's a compliment from me you've never forgotten?",
   "If we had a date tonight anywhere in the world, where would it be?",
   "What's one thing you'd love me to do more often?",
   "When do you feel most attracted to me on an ordinary day?",
   "What was going through your head on our first date?",
   "What's the last lie you told me?"
  ],
  [
   "Where's the most daring place you've wanted to kiss me?",
   "What's a fantasy date you've never told me about?",
   "What's something I do that drives you wild?",
   "When did you find me most attractive?",
   "What's a secret wish for our next night in?",
   "What's the most attractive thing I've ever worn?",
   "Describe the best kiss we've ever had.",
   "When did you want me but couldn't say so?",
   "What's a text from me that got you flustered?",
   "Which part of me do you find hardest to stop looking at?",
   "Where would you love to be alone with me?",
   "What's something I whisper that gets to you?",
   "Which romantic movie scene would you want us to recreate?",
   "How do you like to be touched when you're stressed?",
   "What's the first thing you notice when I walk into a room?"
  ],
  [
   "What's one thing you've wanted to try with me but never asked?",
   "Where do you most love being kissed?",
   "What should I wear next date night?",
   "What's the boldest text you'd send me right now?",
   "What's your favourite memory of us alone?",
   "What's a fantasy you'd want to try with me this year?",
   "What's the most daring thing you'd do with me on holiday?",
   "What do you think about when you miss me at night?",
   "What could I say that would instantly turn you on?",
   "Which of our nights together would you replay?",
   "What would you like me to take charge of?",
   "What outfit would you like me to surprise you in?",
   "What's your favourite way for me to wake you up?",
   "What's something new you'd like us to explore together?",
   "Describe your ideal night with me, from start to finish."
  ]
 ],
 "dare": [
  [
   "Give your partner a 30-second shoulder massage.",
   "Whisper three things you love about them. Ideas: smile · laugh · touch.",
   "Slow dance together to the next song.",
   "Kiss their hand like royalty.",
   "Hold eye contact for 30 seconds without laughing.",
   "Give your partner a slow forehead kiss.",
   "Sing one line of a love song to your partner.",
   "Draw a heart on your partner's palm with your fingertip.",
   "Act out the moment you first met, in 30 seconds. Can't remember? Act out how you wish it went.",
   "Give your partner the longest hug you can manage.",
   "Tell your partner your favourite thing about their face without looking away.",
   "Feed your partner a bite of something sweet.",
   "Play with your partner's hair for one minute.",
   "Finish this love poem and read it aloud: 'Roses are red, violets are blue…'",
   "Give your partner your best flirty look."
  ],
  [
   "Kiss your partner's neck slowly.",
   "Sit on your partner's lap until your next turn.",
   "Describe your next kiss before you give it.",
   "Give a 1-minute massage wherever they choose, above the waist.",
   "Blindfold your partner and kiss them somewhere unexpected.",
   "Kiss your partner's wrist, then their cheek, then their lips.",
   "Trace a word on your partner's back and let them guess it.",
   "Kiss your partner slowly without using your hands.",
   "Whisper the first thing you'll do when we're alone tonight.",
   "Hold eye contact while your partner runs their fingers through your hair.",
   "Kiss your partner's shoulder for ten seconds.",
   "Give your partner a one-minute foot massage.",
   "Dance close for one song, no talking.",
   "Close your eyes and find your partner's lips.",
   "Leave three kisses along your partner's jawline."
  ],
  [
   "Remove one item of clothing.",
   "Let your partner choose where you kiss them.",
   "Seduce your partner using only your voice for 30 seconds.",
   "Give your partner a 20-second kiss.",
   "Trade one item of clothing with your partner.",
   "Let your partner remove one item of your clothing.",
   "Kiss your partner wherever they point, slowly.",
   "Describe exactly how you'd undress your partner.",
   "Kiss your partner for 30 seconds without stopping.",
   "Lie back and let your partner kiss you anywhere they like for 30 seconds.",
   "Give your partner a massage with your shirt off.",
   "Whisper your wildest idea for tonight.",
   "Stay blindfolded until your next turn.",
   "Show your partner exactly how you like to be kissed.",
   "Slowly undo one button or zip on your partner's clothes."
  ]
 ]
};

// Shared deck for every group; girls' and boys' nights add their own extras on top
export const GROUP: Deck = {
 "truth": [
  [
   "Who in this room would you call at 3am in an emergency?",
   "What's the most embarrassing thing you've done to impress a crush?",
   "What's the worst date you've ever been on?",
   "Who was your first celebrity crush?",
   "What's a secret talent nobody here knows about?",
   "What's the pettiest reason you've stopped talking to someone?",
   "Which player here would survive longest in a zombie film?",
   "What's the last lie you told?"
  ],
  [
   "Who here has the best smile?",
   "What's the most daring thing you've done on a night out?",
   "What's the worst pickup line that actually worked on you?",
   "Have you ever had a crush on someone in this room? No names needed.",
   "What's the boldest text you've ever sent?",
   "Who here would you trust to set you up on a date?",
   "What's your biggest turn-off?",
   "What's the wildest place you've been kissed?"
  ],
  [
   "Who here do you think is the best kisser?",
   "What's a fantasy you'd admit out loud tonight?",
   "Rate your last kiss out of ten.",
   "What's the boldest thing you've done to get someone's attention?",
   "Who here would you kiss if you had to pick right now?",
   "What's the most scandalous thing on your phone right now?",
   "What's the most memorable night-out story you'd actually share?",
   "What's something you've done that you'd never tell your parents?"
  ]
 ],
 "dare": [
  [
   "Do an impression of another player until someone guesses who.",
   "Describe this party like a TV news reporter for 30 seconds.",
   "Let the group choose your phone wallpaper for the night.",
   "Do ten squats while saying the alphabet backwards.",
   "Give every player a genuine compliment.",
   "Show the group the last photo in your camera roll.",
   "Sing the chorus of a song the group picks.",
   "Do a 10-second runway walk across the room.",
   "Hold eye contact with {target} for 20 seconds without laughing."
  ],
  [
   "Give {target} a 20-second shoulder massage, if they're up for it.",
   "Read your last sent text out loud.",
   "Let the group scroll your camera roll for 10 seconds.",
   "Whisper something flirty to {target}.",
   "Swap a piece of clothing with {target}.",
   "Do your most seductive dance for 15 seconds.",
   "Let another player style your hair however they like.",
   "Serenade {target} for 20 seconds.",
   "Slow dance with {target} for 20 seconds, if they're up for it.",
   "Give {target} your best pickup line, delivered with total confidence."
  ],
  [
   "Kiss {target} on the cheek, if they're up for it.",
   "Remove one accessory or item of clothing.",
   "Sit on {target}'s lap until your next turn, if they're up for it.",
   "Let the player on your left choose your next dare.",
   "Give a chair your best 20-second lap dance.",
   "Text your crush 'thinking of you' and show the group the reply.",
   "Let the group read your last three searches.",
   "Strike your most sultry pose and hold it for 10 seconds.",
   "Kiss {target}'s hand, then their neck, if they're up for it.",
   "Hold eye contact with {target} for 20 seconds, as close as they'll let you."
  ]
 ]
};

export const EXTRA: Partial<Record<GroupId, Deck>> = {
 "girls": {
  "truth": [
   [
    "Which player here would you swap wardrobes with?",
    "What's the worst haircut you've ever had?"
   ],
   [
    "Who's your most regrettable ex, and why?",
    "What's the most romantic thing a date has done for you?"
   ],
   [
    "What's the boldest move you've ever made on someone?",
    "What's your guilty-pleasure fantasy?"
   ]
  ],
  "dare": [
   [
    "Do your best catwalk and finish with a pose.",
    "Narrate another player's look like a beauty vlogger."
   ],
   [
    "Send a flirty emoji to the last person you texted.",
    "Let the group pick a new look for your next selfie."
   ],
   [
    "Show the group your best seductive dance move.",
    "Read your flirtiest text conversation out loud."
   ]
  ]
 },
 "boys": {
  "truth": [
   [
    "What's the most embarrassing film you've cried at?",
    "Which player here would you want in your corner in a fight?"
   ],
   [
    "What's the worst thing you've done to impress someone?",
    "Who was your first real heartbreak?"
   ],
   [
    "What's the most daring thing you've done on a date?",
    "What's something you've never admitted to the boys?"
   ]
  ],
  "dare": [
   [
    "Do 15 push-ups while the group counts.",
    "Let the group pick your nickname for the night."
   ],
   [
    "Give your best romantic movie speech to another player.",
    "Show the group the last message you sent your crush."
   ],
   [
    "Do your best strip-tease dance, keeping everything on.",
    "Let the group write your dating profile bio and read it aloud."
   ]
  ]
 }
};

// Wheels: label, then text per heat level (one entry = same at every level)
export const WHEELS: Record<"couple" | "group", Wedge[]> = {
 "couple": [
  [
   "Kiss",
   [
    "Kiss your partner's hand, then their cheek.",
    "Kiss your partner anywhere above the shoulders they point to.",
    "Kiss your partner anywhere they point to."
   ]
  ],
  [
   "Massage",
   [
    "Give a 1-minute shoulder massage.",
    "Give a 2-minute massage wherever they choose, above the waist.",
    "Give a 2-minute massage wherever they choose."
   ]
  ],
  [
   "Whisper",
   [
    "Whisper something you love about them.",
    "Whisper what you'd like to do after this game.",
    "Whisper something you've never said out loud."
   ]
  ],
  [
   "Compliment",
   [
    "Give three compliments, each bolder than the last. Ideas: smile · style · voice.",
    "Give three compliments about how they look tonight. Ideas: eyes · outfit · lips.",
    "Tell your partner three things about them that turn you on."
   ]
  ],
  [
   "Slow dance",
   [
    "Slow dance until the song ends.",
    "Slow dance until the song ends, no space between you.",
    "Slow dance until the song ends, no space and no talking."
   ]
  ],
  [
   "Their call",
   [
    "Your partner picks a sweet dare for you, like the one below.",
    "Your partner picks a dare for you, like the one below.",
    "Your partner picks any dare for you, like the one below. You can still skip."
   ],
   {"kind": "suggest"}
  ],
  [
   "Eye contact",
   [
    "Hold eye contact for 30 seconds without laughing.",
    "Hold eye contact for 30 seconds, then kiss.",
    "Hold eye contact while you slowly undo one of their buttons."
   ]
  ],
  [
   "Hot seat",
   [
    "Your partner asks you three questions, like the one below. Answer honestly.",
    "Your partner asks you three flirty questions, like the one below.",
    "Your partner asks you three bold questions, like the one below. Answer honestly."
   ],
   {"kind": "suggest"}
  ]
 ],
 "group": [
  [
   "Hot seat",
   [
    "Everyone asks you one question, like the one below. Answer honestly.",
    "Everyone asks you one flirty question, like the one below.",
    "Everyone asks you one bold question, like the one below. Answer honestly."
   ],
   {"kind": "suggest"}
  ],
  [
   "Group's call",
   [
    "The group picks a silly dare for you, like the one below.",
    "The group picks a dare for you, like the one below.",
    "The group picks any dare for you, like the one below. You can still skip."
   ],
   {"kind": "suggest"}
  ],
  [
   "Pass left",
   [
    "The player on your left takes this turn and does the dare below."
   ],
   {"kind": "suggest"}
  ],
  [
   "Compliment",
   [
    "Give every player a compliment. Ideas: smile · style · laugh.",
    "Give every player a flirty compliment. Ideas: eyes · outfit · voice.",
    "Tell each player what you find most attractive about them."
   ]
  ],
  [
   "Accent",
   [
    "Talk in an accent the group picks until your next turn."
   ]
  ],
  [
   "Never have I",
   [
    "Say something you've never done, like 'Never have I ever been on a blind date.' Anyone who has done it stands up.",
    "Say a cheeky one, like 'Never have I ever texted the wrong person.' Anyone who has done it stands up.",
    "Say a spicy one, like 'Never have I ever kissed someone I'd just met.' Anyone who has done it stands up."
   ]
  ],
  [
   "Wild card",
   [
    "Pick any player to answer the truth below.",
    "Pick any player to do the dare below.",
    "Pick two willing players to do the dare below together."
   ],
   {"kind": "suggest"}
  ]
 ]
};

export const GROUPS: Record<GroupId, { name: string; moods: string[] }> = {
 "couple": {
  "name": "Couple",
  "moods": [
   "Kissing",
   "Massage",
   "Date night",
   "Anniversary",
   "Getting to know you"
  ]
 },
 "friends": {
  "name": "Friends",
  "moods": [
   "Kissing",
   "Pre-drinks",
   "Birthday",
   "New people",
   "Deep talk"
  ]
 },
 "girls": {
  "name": "Girls' night",
  "moods": [
   "Crush talk",
   "Pre-drinks",
   "Hen party",
   "Sleepover",
   "Deep talk"
  ]
 },
 "boys": {
  "name": "Boys' night",
  "moods": [
   "Dating stories",
   "Pre-drinks",
   "Stag do",
   "Game night",
   "Deep talk"
  ]
 }
};

export const PAIRS: Record<PairId, [string, string]> = {"mf":["Him","Her"],"ff":["Her","Her"],"mm":["Him","Him"],"any":["You","Your partner"]};

// Wheel of Misfortune: bad luck when it lands on you. Forfeits, not dares; you can always skip.
// Food and consent are in the wording (skip if allergic, you can say stop, if they're up for it).
export const MISFORTUNE: Record<"couple" | "group", Wedge[]> = {
 couple: [
  ["Chilli", [
   "Eat a small piece of chilli or a drop of hot sauce. Skip if you can't have it.",
   "Eat a slice of chilli and keep a straight face for 10 seconds. Skip if you can't have it.",
   "Hot sauce challenge: your partner picks how many drops (1 to 3) you taste off a spoon. Skip if you can't have it.",
  ]],
  ["Lemon", [
   "Bite into a lemon wedge without pulling a face.",
   "Bite a lemon wedge, then tell your partner something sweet with a straight face.",
   "Suck a lemon wedge, then give your partner a 10-second kiss.",
  ]],
  ["Spank", [
   "Your partner gives you a playful tap on the bum.",
   "Your partner gives you three playful spanks. You can say stop.",
   "Your partner spanks you as many times as they like. You can say stop any time.",
  ]],
  ["Ice", [
   "Hold an ice cube in your hand until it starts to melt.",
   "Your partner slides an ice cube along the back of your neck.",
   "Your partner traces an ice cube wherever they choose. You can say stop.",
  ]],
  ["Servant", [
   "Be your partner's servant until your next turn: snacks, drinks, compliments.",
   "Do whatever your partner says until your next turn (within reason).",
   "Your partner gives you three orders. You must obey (you can say stop). Ideas: kiss · dance · massage.",
  ]],
  ["Silence", [
   "No talking until your next turn. Every word costs a kiss.",
   "No talking until your next turn, but your partner can try to make you laugh.",
   "Stay silent while your partner whispers in your ear for 30 seconds. If you smile, lose a layer.",
  ]],
  ["Lose a layer", [
   "Take off your shoes or socks.",
   "Take off an accessory or one item of clothing.",
   "Take off one item of clothing your partner chooses.",
  ]],
  ["Double trouble", [
   "Do your next dare two times in a row.",
   "Your partner picks your next dare, and you do it twice. Ideas: kiss · massage · dance.",
   "Your partner picks your next two dares. Ideas: kiss · massage · undress.",
  ]],
 ],
 group: [
  ["Chilli", [
   "Eat a small piece of chilli or a drop of hot sauce. Skip if you can't have it.",
   "Eat a slice of chilli and keep a straight face for 10 seconds. Skip if you can't have it.",
   "Hot sauce challenge: the group picks how many drops (1 to 3) you taste off a spoon. Skip if you can't have it.",
  ]],
  ["Lemon", [
   "Bite into a lemon wedge without pulling a face.",
   "Bite a lemon wedge, then give everyone a compliment with a straight face.",
   "Bite a lemon wedge and do your best seductive look while you do.",
  ]],
  ["Spank", [
   "{target} gives you a playful tap on the shoulder, if they're up for it.",
   "{target} gives you a playful spank, if you're both up for it. You can say stop.",
   "{target} gives you three playful spanks, if you're both up for it. You can say stop.",
  ]],
  ["Ice", [
   "Hold an ice cube in your hand until it starts to melt.",
   "Hold an ice cube against the back of your neck for 15 seconds.",
   "{target} slides an ice cube down your back, if you're both up for it.",
  ]],
  ["Royal servant", [
   "Serve every player a drink or a snack, and bow as you hand it over.",
   "Be the group's servant until your next turn.",
   "Be {target}'s servant until your next turn, if they're up for it.",
  ]],
  ["Embarrass", [
   "Do your most embarrassing dance for 15 seconds.",
   "Do your best impression of someone in the room until they guess who.",
   "Do your most seductive dance for 20 seconds.",
  ]],
  ["Phone forfeit", [
   "Let the group choose your phone wallpaper for the night.",
   "Hand the group your phone: they read out the last three emojis you sent.",
   "Let the group post an emoji on your status (they pick it).",
  ]],
  ["Bad luck", [
   "You also take the next player's turn.",
   "You take the next player's turn, and they pick your dare.",
   "Spin the misfortune wheel again.",
  ]],
 ],
};

// With "Drinks in Misfortune" on, these replace the last two wedges of the misfortune wheel.
export const MISFORTUNE_DRINKS: Record<"couple" | "group", Wedge[]> = {
 couple: [
  ["Sip", ["Take a sip and toast to your partner.", "Take two sips of your drink without making a face.", "Finish your drink."]],
  ["Pour up", ["Pour your partner a drink and serve it like a waiter.", "Take a sip from your partner's glass, then kiss them.", "Link arms and both finish your drinks."]],
 ],
 group: [
  ["Sip", ["Take a sip of your drink.", "Take two sips of your drink without making a face.", "Finish your drink."]],
  ["Pour up", ["Top up everyone's glass.", "Choose someone to take a sip with you.", "Everyone drinks, you pick who goes first."]],
 ],
};

// On every wheel: two thin wedges, rarely landed on. Free pass is kept by that player (skip a dare or forfeit later).
export const SPIN_AGAIN: Wedge = ["Spin again", ["Lucky you: spin again!"], { w: 0.2, kind: "again" }];
export const FREE_PASS: Wedge = ["Free pass", ["You win a free pass! Use it to skip any dare or forfeit later."], { w: 0.2, kind: "pass" }];

/** Puts Spin again and Free pass in, away from each other. */
export function withSpecials(base: Wedge[]): Wedge[] {
 const w = [...base];
 w.splice(Math.round(w.length * 0.75), 0, FREE_PASS);
 w.splice(Math.round(w.length * 0.25), 0, SPIN_AGAIN);
 return w;
}

const wheelCache = new Map<string, Wedge[]>();
const aiIds = new WeakMap<Wedge[], number>();
let nextAiId = 1;
/** Same inputs give the same array (the wheel redraws whenever it gets a new array). */
function cached(key: string, make: () => Wedge[]): Wedge[] {
 let w = wheelCache.get(key);
 if (!w) {
  w = make();
  if (wheelCache.size > 40) wheelCache.clear();
  wheelCache.set(key, w);
 }
 return w;
}
const idOf = (ai: Wedge[]) => {
 if (!aiIds.has(ai)) aiIds.set(ai, nextAiId++);
 return aiIds.get(ai);
};

/** How many built-in wedges a wheel shows; bigger pools give a different mix each game. */
export const WHEEL_SIZE = 8;

/** `n` wedges from the pool, the same ones for the same seed (so the wheel doesn't change mid-game). */
export function drawPool(pool: Wedge[], n: number, seed: number): Wedge[] {
 if (pool.length <= n) return pool;
 let x = (Math.floor(seed * 2 ** 31) ^ 0x9e3779b9) >>> 0 || 1;
 const rand = () => ((x = (Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0) / 2 ** 32);
 const a = [...pool];
 for (let i = a.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [a[i], a[j]] = [a[j], a[i]];
 }
 return a.slice(0, n);
}

/** Built-in dares to top up a short pasted list: plain wedges only (no "their call"-style ones), at one heat. */
export function fillWedges(deck: "couple" | "group", kind: "spin" | "misfortune", heat: number, n: number, seed: number, taken: string[] = []): Wedge[] {
 if (n <= 0) return [];
 const pool = (kind === "misfortune" ? MISFORTUNE : WHEELS)[deck].filter((w) => !w[2]?.kind && !taken.includes(w[0]));
 return drawPool(pool, pool.length, seed).slice(0, n).map((w): Wedge => [w[0], [wedgeText(w[1], heat)], { fill: true }]);
}

/** Spin the Wheel: AI wedges for the mood when there are some, else the built-in ones; with the thin wedges. */
export function spinWheel(deck: "couple" | "group", ai?: Wedge[] | null, seed = 0): Wedge[] {
 return cached(ai?.length ? `spin-ai${idOf(ai)}` : `spin-${deck}-${seed}`, () => withSpecials(ai?.length ? ai : drawPool(WHEELS[deck], WHEEL_SIZE, seed)));
}

/** The misfortune wheel: AI forfeits for the mood when there are some, else the built-in ones for the deck,
 *  with the drink wedges swapped in when drinks are on, and the thin wedges. */
export function misfortuneWheel(deck: "couple" | "group", drinks: boolean, ai?: Wedge[] | null, seed = 0): Wedge[] {
 const extra = drinks ? MISFORTUNE_DRINKS[deck] : [];
 const base = ai?.length ? (drinks ? ai.slice(0, ai.length - 2) : ai) : drawPool(MISFORTUNE[deck], WHEEL_SIZE - extra.length, seed);
 return cached(`mis-${ai?.length ? "ai" + idOf(ai) : deck}-${deck}-${drinks}-${seed}`, () => withSpecials([...base, ...extra]));
}
