// Built-in content, copied from legacy/index.html. Decks: type -> heat level (0 Flirty, 1 Steamy, 2 Spicy).
// {target} in a dare is filled with a matching player (see match.ts).
import type { CardType, Deck, GroupId, PairId, Wedge } from "./types";

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

// ---------- New cards (2026-11-24) ----------
// Picked by a model of the owner's earlier ratings, added before their own review (data/new-cards.xlsx, newCards.ts).
// Wheel sections that leave the dare to someone's imagination are dropped: the owner rated those low.
// (Written here by the script, not imported: scripts/dump_cards.mts loads this file with plain Node.)
// <new-cards>
// GENERATED by scripts/import_new_cards.py from data/new-cards.xlsx: edit the workbook, not this block.
const NEW_DECK: Record<string, Record<CardType, string[][]>> = {
 "couple": {
  "truth": [
   [
    "What's one thing about me you'd never change?",
    "What's the first gift you wanted to buy me?",
    "Which day with me would you live again?",
    "What do you tell your friends about me?",
    "When did you know you really liked me?",
    "What's one thing I do that makes you feel safe?",
    "What nickname would you secretly love me to call you?",
    "What's the cutest thing I've done without noticing?"
   ],
   [
    "Where on your body do you love being kissed the most?",
    "What's the sexiest thing I've ever said to you?",
    "What outfit of mine makes you want to skip the party?",
    "When did you last think about kissing me, and where were you?",
    "What's a kiss you want that we haven't tried yet?",
    "Which of my body parts do you think about most?",
    "What's one thing I do in bed… or on the couch… that you love?",
    "What's the most romantic message you've almost sent me?",
    "What do you want me to do the moment we're alone tonight?",
    "What's your favourite way for me to touch you when we cuddle?"
   ],
   [
    "What's a fantasy you've had about me this week?",
    "Describe the perfect way I could undress you.",
    "What's the boldest place you'd want us to be alone?",
    "What's one thing you'd love me to do to you tonight?",
    "Which of my outfits would you most like to take off me?",
    "What do you think about when you look at my lips?",
    "What's the most daring thing you'd let me do to you tonight?",
    "What word or sound from me drives you wild?",
    "What's a new rule you'd like for our bedroom?",
    "Rate our chemistry tonight out of ten, and say what would make it a ten."
   ]
  ],
  "dare": [
   [
    "Give your partner a slow kiss on each cheek.",
    "Hold your partner's hand and tell them one thing you love about it.",
    "Rest your head on your partner's shoulder until your next turn.",
    "Give your partner a 30-second back scratch.",
    "Pick up your partner's hand and kiss each fingertip.",
    "Hug your partner from behind for 20 seconds.",
    "Say 'I love you' (or 'I like you') in three different voices.",
    "Dance with your partner for 30 seconds, no music.",
    "Give your partner a 1-minute hand massage.",
    "Whisper your partner's name like it's a secret.",
    "Rub noses with your partner for 10 seconds."
   ],
   [
    "Kiss your partner behind the ear, slowly.",
    "Give your partner a 1-minute back massage.",
    "Kiss your partner's neck for ten seconds.",
    "Sit face to face with your partner, knees touching, for one minute.",
    "Kiss your partner for 15 seconds with your hands behind your back.",
    "Trace your partner's lips with your fingertip.",
    "Let your partner sit on your lap and stay there until your next turn.",
    "Kiss your partner's collarbone three times.",
    "Blow gently on your partner's neck, then kiss it.",
    "Pull your partner close and slow dance for one song.",
    "Whisper exactly where you want to kiss them next.",
    "Give your partner a 30-second scalp massage."
   ],
   [
    "Take off one item of your partner's clothing, slowly.",
    "Kiss your partner anywhere below the neck that they choose.",
    "Give your partner a slow 2-minute massage with lotion or oil.",
    "Kiss your partner's stomach three times.",
    "Let your partner blindfold you and kiss you for 20 seconds.",
    "Unbutton your partner's top one button at a time, kissing after each.",
    "Kiss your partner for one minute without stopping.",
    "Give your partner a slow lap dance for 30 seconds.",
    "Swap one item of clothing with your partner and keep it on.",
    "Lie down and let your partner kiss a line from your neck to your waist.",
    "Show your partner the move you'd use to seduce them, right now.",
    "Take off your shirt and keep it off until your next turn."
   ]
  ]
 },
 "group": {
  "truth": [
   [
    "Who here would you trust with your phone unlocked?",
    "What's the most embarrassing song on your playlist?",
    "Who here gives the best advice?",
    "What's the worst text you've sent to the wrong person?",
    "Who in this room do you think has the most secrets?",
    "What's a rumor about you that was actually true?",
    "What's your most irrational fear?",
    "Who here would you take to meet your parents?",
    "Who here would survive longest on a desert island, and who would go first?",
    "What's the most childish thing you still do?"
   ],
   [
    "Who here would you go on a date with tonight?",
    "What's the most flirty thing you've done to get a free drink?",
    "Who here do you think is the best dressed tonight?",
    "What's your type, and does anyone here fit it?",
    "What's the longest you've gone without a kiss?",
    "Have you ever kissed someone and regretted it the next day?",
    "Who here has the most kissable lips?",
    "What's the cheesiest thing you've said to a crush?",
    "Who here is the biggest flirt?",
    "Who here would you text first if you were bored at midnight?"
   ],
   [
    "What's the wildest thing you've done that nobody here knows?",
    "Who here would you want to be stuck in an elevator with?",
    "What's your biggest turn-on?",
    "What's the most daring place you've kissed someone?",
    "Have you ever had a crush on a friend's partner? No names needed.",
    "What's a fantasy you've never told anyone?",
    "What's the most flirty message on your phone right now?",
    "What's the boldest outfit you've worn on a night out?",
    "Who here would you kiss if no one would ever find out?",
    "What's the boldest move you've made on someone you just met?"
   ]
  ],
  "dare": [
   [
    "Do your best runway walk to the kitchen and back.",
    "Let the player on your right give you a new hairstyle with their hands.",
    "Speak only in questions until your next turn.",
    "Do 10 jumping jacks while singing the chorus of any song.",
    "Tell a joke. If nobody laughs, do 5 squats.",
    "Hug every player in the room.",
    "Show the group your best dance move for 10 seconds.",
    "Let {target} draw a small heart on your hand with a pen, if they're up for it.",
    "Talk in an accent the group picks until your next turn. Ideas: cowboy · robot · news anchor.",
    "Say the alphabet backwards from M in 20 seconds, or do 5 squats."
   ],
   [
    "Give {target} a 30-second hand massage, if they're up for it.",
    "Dance with {target} for 20 seconds, as close as they're comfortable with.",
    "Whisper your best pickup line in {target}'s ear.",
    "Let the group give you a dare in one word. You act it out.",
    "Swap one accessory with {target} until the end of the game.",
    "Give {target} a hug that lasts 10 seconds, if they're up for it.",
    "Do your sexiest walk across the room and wink at {target}.",
    "Read out the last emoji you sent and act it out.",
    "Whisper a compliment in {target}'s ear. Ideas: eyes · smile · outfit.",
    "Feed {target} a snack without using your hands, if they're up for it."
   ],
   [
    "Sit on {target}'s lap for one round, if they're up for it.",
    "Kiss {target} on the neck, if they're up for it.",
    "Remove one item of clothing (an accessory counts).",
    "Give {target} a 20-second shoulder massage with your eyes closed, if they're up for it.",
    "Let {target} choose a spot for you to kiss them (above the shoulders), if they're up for it.",
    "Do a 15-second dance for {target} while they sit still.",
    "Tell {target} what you'd do on a date with them, in three sentences.",
    "Swap tops with {target} for one round, if they're up for it.",
    "Give {target} a 15-second lap dance, if they're up for it.",
    "Take off one of {target}'s accessories using only your teeth, if you're both up for it."
   ]
  ]
 },
 "girls": {
  "truth": [
   [
    "What's the worst date outfit you've ever worn?",
    "Which celebrity would you leave the party for?",
    "What's the nicest thing a guy has ever done for you?",
    "Which player here would you call for a breakup emergency?",
    "What's a beauty trend you regret?",
    "Which girl here would you trust to pick your next date?",
    "What's the most embarrassing thing in your bag right now? Show it."
   ],
   [
    "Who was your best kiss ever, and what made it good?",
    "What's the flirtiest thing you've done on a night out?",
    "What's your secret move when you like someone?",
    "Have you ever slid into someone's DMs? How did it go?",
    "What's the worst pickup line a guy has used on you?",
    "What's a text to an ex you almost sent? What did it say?",
    "What's the first thing you notice when a guy walks in?"
   ],
   [
    "What's the most daring thing you've done for a crush?",
    "What's something you'd only try on vacation?",
    "What's your biggest turn-on in a partner?",
    "Have you ever kissed two people in one night?",
    "What's a secret you'd only share with the girls?",
    "What's the boldest thing you've done on a date?",
    "What's one thing you've never told a partner you want?"
   ]
  ],
  "dare": [
   [
    "Do your best model pose for a photo the group takes (for your eyes only).",
    "Let another player do your makeup with one product only.",
    "Walk like your favourite celebrity across the room.",
    "Give every girl here a compliment about her outfit.",
    "Sing the first line of a love song to the player on your left.",
    "Do a 15-second runway walk; the girls score you out of 10.",
    "Swap one accessory with the girl on your right for the rest of the game."
   ],
   [
    "Show the group how you'd flirt with your crush, using the player on your left.",
    "Read out the last flirty message you received.",
    "Do your best sexy dance move for 10 seconds.",
    "Let the group choose your lipstick or top for the rest of the night.",
    "Show the group your best 'come here' look.",
    "Give the girl on your left a 10-second lap dance, if she's up for it.",
    "Order a drink from the player on your right in your sexiest voice."
   ],
   [
    "Teach the group your best flirty dance move in 20 seconds.",
    "Show your best seductive walk across the room.",
    "Read your flirtiest message ever out loud.",
    "Tell the group the most daring thing on your bucket list.",
    "Let the group pick an outfit for your next date.",
    "Show how you'd kiss someone, using the back of your hand, for 10 seconds.",
    "Take off one accessory or item of clothing until your next turn."
   ]
  ]
 },
 "boys": {
  "truth": [
   [
    "What's the worst gift you've ever given someone?",
    "Which of the boys would you want as your wingman?",
    "What's the most romantic thing you've done for someone?",
    "What's your worst sports moment?",
    "What's a song you secretly know every word of?",
    "Which of the boys would you call first if you got arrested, and why?"
   ],
   [
    "What's your best and worst pickup story?",
    "Who was your first kiss, and how did it go?",
    "What's the most embarrassing thing you've done in front of a crush?",
    "What's the longest you've waited for someone to text back?",
    "Which player here gets the most attention on a night out?",
    "What's the most embarrassing way you've been turned down?",
    "Who's the one that got away? Describe them in one word."
   ],
   [
    "What's the wildest night out you've ever had?",
    "What's a fantasy you'd only admit to the boys?",
    "Have you ever been caught kissing somewhere you shouldn't?",
    "What's the boldest message you've ever sent?",
    "What's something about dating you've never admitted?",
    "What's a turn-on you've never admitted?",
    "What's something you did on a night out that you'd never tell your mom?"
   ]
  ],
  "dare": [
   [
    "Hold a plank while the group counts slowly to 30.",
    "Arm wrestle the player on your left.",
    "Show the group your best goal celebration.",
    "Talk like a sports commentator about the next player's turn.",
    "Let the group pick a nickname for you; everyone uses it until the game ends.",
    "Do 15 squats while saying the alphabet.",
    "Thumb wrestle the player on your right. The loser does 5 push-ups."
   ],
   [
    "Propose to the player on your left like it's a movie, on one knee.",
    "Say who your celebrity crush is and do your best impression of them.",
    "Show your best dance move for 15 seconds.",
    "Do your smoothest pickup line on the player on your right.",
    "Let the group write a pickup line; say it to the player on your right.",
    "Sing one line of a love song to the player on your left, on one knee.",
    "Show your best move to get someone's attention across a room, for 10 seconds."
   ],
   [
    "Do 10 push-ups with your shirt off.",
    "Take off your shirt until your next turn.",
    "Let the group write your dating profile and read it in a sexy voice.",
    "Show the group your best seductive look for 10 seconds.",
    "Tell the group the wildest dare you've ever done.",
    "Make your best movie-star entrance through the door; the boys rate it out of 10.",
    "Let the player on your left draw a small tattoo on your arm with a pen."
   ]
  ]
 }
};
const NEW_WHEELS: Record<"couple" | "group", Wedge[]> = {
 "couple": [
  [
   "Neck kiss",
   [
    "Give your partner a soft kiss on the neck.",
    "Kiss your partner's neck slowly for 10 seconds.",
    "Kiss your partner's neck and collarbone for 20 seconds."
   ]
  ],
  [
   "Lap",
   [
    "Sit on your partner's lap for one spin.",
    "Sit on your partner's lap, facing them, for one spin.",
    "Sit on your partner's lap and kiss them for 20 seconds."
   ]
  ],
  [
   "Lose a layer",
   [
    "Take off one sock; your partner keeps it until the game ends.",
    "Take off one accessory or item of clothing.",
    "Your partner takes off one item of your clothing."
   ]
  ],
  [
   "Blindfold",
   [
    "Close your eyes and guess where your partner kisses you.",
    "Close your eyes while your partner kisses you three times.",
    "Stay blindfolded while your partner kisses you anywhere they like for 20 seconds."
   ]
  ],
  [
   "Back hug",
   [
    "Hug your partner from behind for 20 seconds.",
    "Hug your partner from behind and kiss their shoulder.",
    "Hug your partner from behind and kiss down their neck for 20 seconds."
   ]
  ],
  [
   "One word",
   [
    "Say one word that sums up your partner. Ideas: cute · safe · fun.",
    "Say what you want to do later, in five words or fewer.",
    "Say the next thing you'll take off your partner, then do it."
   ]
  ],
  [
   "Kiss count",
   [
    "Give your partner 5 quick kisses on the cheek.",
    "Give your partner 10 kisses, each in a place they choose.",
    "Give your partner 10 kisses, each lower than the last. They can say stop."
   ]
  ],
  [
   "Feed me",
   [
    "Feed your partner a snack without using your hands.",
    "Feed your partner a snack from your mouth.",
    "Feed your partner a snack off your body; they pick where."
   ]
  ],
  [
   "Hands on",
   [
    "Hold hands without letting go until your next spin.",
    "Keep your hands on your partner's waist until your next spin.",
    "Let your partner hold your wrists while they kiss you for 20 seconds."
   ]
  ],
  [
   "Staring",
   [
    "Stare into your partner's eyes; the first to laugh owes a kiss.",
    "Stare into each other's eyes for 30 seconds, foreheads touching.",
    "Hold your partner's gaze while they undo one button or zip."
   ]
  ],
  [
   "Trace it",
   [
    "Write 'I like you' on your partner's palm with one finger; they guess the words.",
    "Spell your partner's name on their back with kisses.",
    "Trace a line with your lips from their wrist to their shoulder."
   ]
  ],
  [
   "Pick one",
   [
    "Pick one and do it: hug · kiss · compliment.",
    "Pick one for 20 seconds: neck kiss · lap sit · massage.",
    "Pick one, now: lose a layer · lap dance · blindfold kiss."
   ]
  ],
  [
   "Movie kiss",
   [
    "Copy a romantic movie pose with your partner.",
    "Recreate your favorite kiss from a movie.",
    "Recreate the steamiest movie scene you can think of, for 20 seconds."
   ]
  ],
  [
   "Tickle",
   [
    "Tickle your partner for 10 seconds.",
    "Your partner tickles you for 15 seconds. Laugh and you owe a kiss.",
    "Find your partner's most ticklish spot, then kiss it."
   ]
  ]
 ],
 "group": [
  [
   "Dance-off",
   [
    "Have a 15-second dance-off with {target}. The group picks the winner.",
    "Have a 20-second sexy dance-off with {target}. The group picks the winner.",
    "Have a 20-second seductive dance-off with {target}. The loser loses a layer."
   ]
  ],
  [
   "Lap",
   [
    "Sit on {target}'s lap for one spin, if they're up for it.",
    "Sit on {target}'s lap and feed them a snack, if they're up for it.",
    "Give {target} a 15-second lap dance, if they're up for it."
   ]
  ],
  [
   "Kiss",
   [
    "Kiss {target} on the hand, if they're up for it.",
    "Kiss {target} on the forehead, if they're up for it.",
    "Kiss {target} on the neck, if they're up for it."
   ]
  ],
  [
   "Swap",
   [
    "Swap an accessory with {target} for the rest of the game.",
    "Swap one item of clothing with {target}, if they're up for it.",
    "Swap tops with {target}, if they're up for it."
   ]
  ],
  [
   "Mirror",
   [
    "Copy every move {target} makes for 15 seconds.",
    "Mirror {target}'s flirty moves for 15 seconds, face to face.",
    "Mirror {target}'s sexiest moves for 20 seconds, as close as they're comfortable with."
   ]
  ],
  [
   "Most likely",
   [
    "The group asks who's most likely to do something; you and {target} point at the same time. Ideas: be late · cry at a movie · get lost.",
    "The group asks who's most likely to do something flirty; you and {target} point. Ideas: flirt first · text an ex · kiss first.",
    "The group asks who's most likely to do something spicy; you and {target} point. Ideas: make the first move · kiss on a first date · skinny-dip."
   ]
  ],
  [
   "Pickup line",
   [
    "Say a cheesy pickup line to {target}.",
    "Say your best pickup line to {target} and hold eye contact.",
    "Say your boldest pickup line close to {target}'s ear, if they're up for it."
   ]
  ],
  [
   "Impression",
   [
    "Do an impression of a famous person; the group guesses who.",
    "Do a flirty impression of another player; the group guesses who.",
    "Act out another player trying to seduce someone; the group guesses who."
   ]
  ],
  [
   "Ice cube",
   [
    "Hold an ice cube in your hand until it melts or your next spin.",
    "Rub an ice cube on {target}'s wrist, if they're up for it.",
    "Pass an ice cube to {target} mouth to mouth, if you're both up for it."
   ]
  ],
  [
   "Hug",
   [
    "Give {target} a bear hug, if they're up for it.",
    "Hug {target} from behind for 10 seconds, if they're up for it.",
    "Hold {target} close for 15 seconds, foreheads touching, if they're up for it."
   ]
  ],
  [
   "Model walk",
   [
    "Strut across the room like a model; the group scores you out of 10.",
    "Do a sexy strut across the room and stop to wink at {target}.",
    "Strut across the room and drop one accessory or layer at the end."
   ]
  ],
  [
   "Pen art",
   [
    "Let {target} draw a smiley on your hand with a pen.",
    "Let {target} write their name on your arm with a pen.",
    "Let {target} write one word anywhere on you they choose (you can say no)."
   ]
  ],
  [
   "Truth or sip",
   [
    "Answer a truth from {target}, or take a sip (or do 10 squats).",
    "Answer a flirty truth from {target}, or take two sips (or do 15 squats).",
    "Answer a spicy truth from {target}, or finish your drink (or do 20 squats)."
   ]
  ]
 ]
};
const NEW_MISFORTUNE: Record<"couple" | "group", Wedge[]> = {
 "couple": [
  [
   "Massage duty",
   [
    "Give your partner a 1-minute foot massage.",
    "Give your partner a 2-minute massage wherever they choose, above the waist.",
    "Give your partner a 2-minute massage with your shirt off."
   ]
  ],
  [
   "Ice kiss",
   [
    "Hold an ice cube in your mouth, then kiss your partner's hand.",
    "Hold an ice cube in your mouth, then kiss your partner's neck.",
    "Your partner traces an ice cube down your back. You can say stop."
   ]
  ],
  [
   "Freeze",
   [
    "Freeze in a funny pose until your partner says go (30 seconds max).",
    "Freeze while your partner kisses your neck. Move and you lose a layer.",
    "Freeze while your partner undoes one button or zip. Move and they pick your next dare."
   ]
  ],
  [
   "Squats",
   [
    "Do 10 squats while your partner counts.",
    "Do 10 squats while your partner cheers you on from the sofa.",
    "Do 10 squats with your shirt off."
   ]
  ],
  [
   "No hands",
   [
    "Keep your hands behind your back until your next turn.",
    "Keep your hands behind your back while your partner kisses your neck for 10 seconds.",
    "Keep your hands behind your back while your partner does what they like for 20 seconds. You can say stop."
   ]
  ],
  [
   "Pet name",
   [
    "Call your partner 'Your Majesty' until your next turn.",
    "Call your partner a name they pick until the game ends. Ideas: baby · sexy · boss.",
    "Say 'yes, my love' to everything your partner says until your next turn."
   ]
  ],
  [
   "Dress up",
   [
    "Wear something silly your partner picks until the game ends.",
    "Wear one item of your partner's clothing until the game ends.",
    "Swap one item of clothing with your partner until the game ends."
   ]
  ],
  [
   "Kiss tax",
   [
    "Until your next turn, every laugh costs a kiss on the cheek.",
    "Until your next turn, every laugh costs a kiss on the neck.",
    "Until your next turn, every laugh costs a kiss wherever your partner points."
   ]
  ]
 ],
 "group": [
  [
   "Sing it",
   [
    "Sing a nursery rhyme as dramatically as you can.",
    "Sing a love song to {target} for 15 seconds.",
    "Sing a sexy song to {target} while looking them in the eyes."
   ]
  ],
  [
   "Statue",
   [
    "Stand like a statue until your next turn. Every laugh costs a push-up.",
    "Hold a plank for 20 seconds while the group tries to make you laugh.",
    "Freeze while {target} gives you a 10-second shoulder massage, if you're both up for it. Laugh and lose a layer."
   ]
  ],
  [
   "Hot seat",
   [
    "Answer one question from each player.",
    "Answer one flirty question from each player.",
    "Answer one spicy question from each player. Each one you skip costs a layer."
   ]
  ],
  [
   "Push-ups",
   [
    "Do 10 push-ups while the group counts.",
    "Do 10 push-ups while {target} counts in your ear, if they're up for it.",
    "Do 10 push-ups with your shirt off."
   ]
  ],
  [
   "Funny voice",
   [
    "Talk like a robot until your next turn.",
    "Talk in a sexy voice to everyone until your next turn.",
    "Say something seductive to {target} in a cartoon voice."
   ]
  ],
  [
   "Nickname",
   [
    "The group gives you a nickname until the game ends. Ideas: Chef · Captain · Sweetie.",
    "The group gives you a flirty nickname until the game ends. Ideas: Lover · Hot stuff · Charmer.",
    "The group gives you a spicy nickname, and you answer to it until the game ends."
   ]
  ],
  [
   "Lose a layer",
   [
    "Take off one accessory until your next turn.",
    "Take off one item of clothing the group picks.",
    "Take off one item of clothing, slowly, while the group counts to 10."
   ]
  ],
  [
   "Truth now",
   [
    "Answer a truth from the deck, no skipping.",
    "Answer a steamy truth from the deck, no skipping.",
    "Answer a spicy truth from the deck, no skipping."
   ]
  ],
  [
   "Ice cube",
   [
    "Hold an ice cube in your hand until your next turn.",
    "Put an ice cube down your shirt and leave it there.",
    "Let {target} rub an ice cube on your neck, if you're both up for it."
   ]
  ],
  [
   "Laugh tax",
   [
    "Until your next turn, every laugh costs 5 squats.",
    "Until your next turn, every laugh costs a sip (or 5 squats).",
    "Until your next turn, every laugh costs an accessory or layer."
   ]
  ],
  [
   "Solo dance",
   [
    "Dance alone for 15 seconds to a song the group picks.",
    "Do a sexy dance in the middle of the room for 15 seconds.",
    "Take off one accessory as slowly as you can while the group counts to 15."
   ]
  ]
 ]
};
// </new-cards>
const VAGUE_SECTIONS = new Set(["Their call", "Hot seat", "Group's call", "Pass left", "Wild card", "Compliment", "Never have I", "Double trouble", "Royal servant"]);
const DROPPED_FORFEITS: Record<"couple" | "group", string[]> = { couple: ["Silence"], group: ["Spank"] }; // rated 2
for (const [g, d] of Object.entries(NEW_DECK)) {
 const target = g === "couple" ? COUPLE : g === "group" ? GROUP : EXTRA[g as GroupId];
 if (target) for (const t of ["truth", "dare"] as const) d[t].forEach((cards, l) => target[t][l].push(...cards));
}
for (const deck of ["couple", "group"] as const) {
 WHEELS[deck] = [...WHEELS[deck].filter((w) => !VAGUE_SECTIONS.has(w[0])), ...NEW_WHEELS[deck]];
 MISFORTUNE[deck] = [...MISFORTUNE[deck].filter((w) => !VAGUE_SECTIONS.has(w[0]) && !DROPPED_FORFEITS[deck].includes(w[0])), ...NEW_MISFORTUNE[deck]];
}

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
 return drawPool(pool, pool.length, seed).slice(0, n).map((w): Wedge => [w[0], [w[1][Math.min(heat, w[1].length) - 1]], { fill: true }]);
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
