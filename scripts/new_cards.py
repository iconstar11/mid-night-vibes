"""New cards (about double the deck, with ideas from public party-game lists), written by Claude for the owner to rate before they go live.

    .venv/Scripts/python scripts/new_cards.py     # writes data/new-cards.xlsx

Rate in your_rating (1-5). decision: keep / remove / change (put the new text in rewrite).
Then: .venv/Scripts/python scripts/import_new_cards.py adds the kept ones to the app.
Written to the owner's ratings: concrete actions (no "be creative" cards), one-word ideas where a choice is needed,
consent in every group contact dare, plain words (no British slang).
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
from openpyxl import load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
H = {1: "Flirty", 2: "Steamy", 3: "Spicy"}

# (deck, heat): [(rating, text, reason)]
TRUTHS = {
    ("couple", 1): [
        (5, "What's one thing about me you'd never change?", "Sweet, easy to answer, makes the partner smile."),
        (4, "What's the first gift you wanted to buy me?", "Light memory, often funny."),
        (5, "Which day with me would you live again?", "Memory question the owner rates highly."),
        (4, "What do you tell your friends about me?", "Flattering, a little revealing."),
        (4, "What's my most attractive habit?", "Compliment in disguise."),
        (3, "Which song would you play at our wedding (or our next party)?", "Fun but can stall."),
        (4, "When did you know you really liked me?", "Classic, works for new and old couples."),
        (5, "What's one thing I do that makes you feel safe?", "Warm, builds closeness."),
        (4, "What nickname would you secretly love me to call you?", "Playful, gives a follow-up."),
        (4, "What's the cutest thing I've done without noticing?", "Sweet and specific."),
    ],
    ("couple", 2): [
        (5, "Where on your body do you love being kissed the most?", "Direct, leads to a dare."),
        (5, "What's the sexiest thing I've ever said to you?", "Steamy without being explicit."),
        (4, "What outfit of mine makes you want to skip the party?", "Flirty compliment."),
        (5, "When did you last think about kissing me, and where were you?", "Specific and teasing."),
        (4, "What's a kiss you want that we haven't tried yet?", "Leads straight into the next dare."),
        (4, "Which of my body parts do you think about most?", "Bold for Steamy, still clean."),
        (4, "What's one thing I do in bed… or on the couch… that you love?", "Cheeky double meaning."),
        (3, "What's the most romantic message you've almost sent me?", "Good, some won't have one."),
        (5, "What do you want me to do the moment we're alone tonight?", "Strong tension builder."),
        (4, "What's your favourite way for me to touch you when we cuddle?", "Sensual, safe."),
    ],
    ("couple", 3): [
        (5, "What's a fantasy you've had about me this week?", "Spicy, personal, owner likes fantasy cards."),
        (5, "Describe the perfect way I could undress you.", "Matches the owner's 5-rated undressing dares."),
        (4, "What's the boldest place you'd want us to be alone?", "Daring but not explicit."),
        (5, "What's one thing you'd love me to do to you tonight?", "Direct, the core of Spicy."),
        (4, "Which of my outfits would you most like to take off me?", "Playful and bold."),
        (4, "What do you think about when you look at my lips?", "Teasing."),
        (5, "What's the most daring thing you'd let me do to you tonight?", "Consent built into the question."),
        (4, "What word or sound from me drives you wild?", "Fun follow-up."),
        (4, "What's a new rule you'd like for our bedroom?", "Bold, playful."),
        (3, "Rate our chemistry tonight out of ten, and say what would make it a ten.", "Good, a bit long."),
    ],
    ("group", 1): [
        (5, "Who here would you trust with your phone unlocked?", "Funny group dynamics."),
        (4, "What's the most embarrassing song on your playlist?", "Easy laugh."),
        (4, "Who here gives the best advice?", "Kind, quick."),
        (5, "What's the worst text you've sent to the wrong person?", "Great stories."),
        (4, "Who in this room do you think has the most secrets?", "Gets everyone talking."),
        (4, "What's a rumor about you that was actually true?", "Good reveal."),
        (3, "What's your most irrational fear?", "Fine, less party energy."),
        (4, "Who here would you take to meet your parents?", "Light, flirty edge."),
        (4, 'Who here would survive longest on a desert island, and who would go first?', 'Banter, everyone reacts.'),
        (4, "What's the most childish thing you still do?", 'Light, relatable.'),
    ],
    ("group", 2): [
        (5, "Who here would you go on a date with tonight?", "Bold, owner likes 'who here' truths."),
        (5, "What's the most flirty thing you've done to get a free drink?", "Good stories."),
        (4, "Who here do you think is the best dressed tonight?", "Kind and flirty."),
        (4, "What's your type, and does anyone here fit it?", "Gets the room going."),
        (4, "What's the longest you've gone without a kiss?", "Funny, revealing."),
        (5, "Have you ever kissed someone and regretted it the next day?", "Classic party truth."),
        (4, "Who here has the most kissable lips?", "Steamy, harmless."),
        (3, "What's the cheesiest thing you've said to a crush?", "Fine."),
        (5, 'Who here is the biggest flirt?', "Gets the room going; owner likes 'who here' truths."),
        (4, 'Who here would you text first if you were bored at midnight?', 'Flirty, quick to answer.'),
    ],
    ("group", 3): [
        (5, "What's the wildest thing you've done that nobody here knows?", "Big reveal."),
        (5, "Who here would you want to be stuck in an elevator with?", "Classic, bold."),
        (4, "What's your biggest turn-on?", "Pairs with the turn-off card."),
        (4, "What's the most daring place you've kissed someone?", "Spicy story."),
        (5, "Have you ever had a crush on a friend's partner? No names needed.", "Bold, the no-names part keeps it safe."),
        (4, "What's a fantasy you've never told anyone?", "Owner rated fantasy truths 5."),
        (4, "What's the most flirty message on your phone right now?", "Owner liked phone truths."),
        (3, "What's the boldest outfit you've worn on a night out?", "Fine."),
        (5, 'Who here would you kiss if no one would ever find out?', 'Spicy group classic.'),
        (4, "What's the boldest move you've made on someone you just met?", 'Spicy story.'),
    ],
    ("girls", 1): [
        (4, "What's the worst date outfit you've ever worn?", "Girls' night fun."),
        (4, "Which celebrity would you leave the party for?", "Easy laugh."),
        (4, "What's the nicest thing a guy has ever done for you?", "Sweet."),
        (4, "Which player here would you call for a breakup emergency?", "Bonding."),
        (3, "What's a beauty trend you regret?", "Light."),
        (4, 'Which girl here would you trust to pick your next date?', 'Bonding, makes someone smile.'),
        (4, "What's the most embarrassing thing in your bag right now? Show it.", 'Concrete, quick laugh.'),
    ],
    ("girls", 2): [
        (5, "Who was your best kiss ever, and what made it good?", "Juicy story."),
        (4, "What's the flirtiest thing you've done on a night out?", "Good stories."),
        (4, "What's your secret move when you like someone?", "Fun reveal."),
        (4, "Have you ever slid into someone's DMs? How did it go?", "Very current."),
        (3, "What's the worst pickup line a guy has used on you?", "Funny."),
        (5, "What's a text to an ex you almost sent? What did it say?", 'Juicy; owner likes text truths.'),
        (4, "What's the first thing you notice when a guy walks in?", 'Easy, revealing.'),
    ],
    ("girls", 3): [
        (5, "What's the most daring thing you've done for a crush?", "Spicy story."),
        (5, "What's something you'd only try on vacation?", "Daring, harmless."),
        (4, "What's your biggest turn-on in a partner?", "Bold."),
        (4, "Have you ever kissed two people in one night?", "Classic party truth."),
        (4, "What's a secret you'd only share with the girls?", "Fits the night."),
        (5, "What's the boldest thing you've done on a date?", 'Spicy story.'),
        (4, "What's one thing you've never told a partner you want?", 'Bold, personal.'),
    ],
    ("boys", 1): [
        (4, "What's the worst gift you've ever given someone?", "Easy laugh."),
        (4, "Which of the boys would you want as your wingman?", "Bonding."),
        (4, "What's the most romantic thing you've done for someone?", "Shows a soft side."),
        (4, "What's your worst sports moment?", "Relatable."),
        (3, "What's a song you secretly know every word of?", "Light."),
        (4, "What's the worst haircut you've ever had?", 'Easy laugh.'),
        (4, 'Which of the boys would you call first if you got arrested, and why?', 'Banter, bonding.'),
    ],
    ("boys", 2): [
        (5, "What's your best and worst pickup story?", "Great stories."),
        (4, "Who was your first kiss, and how did it go?", "Fun."),
        (4, "What's the most embarrassing thing you've done in front of a crush?", "Funny."),
        (4, "What's the longest you've waited for someone to text back?", "Relatable."),
        (3, "Which player here gets the most attention on a night out?", "Banter."),
        (5, "What's the most embarrassing way you've been turned down?", 'Great stories.'),
        (4, "Who's the one that got away? Describe them in one word.", 'Revealing; the one word keeps it easy.'),
    ],
    ("boys", 3): [
        (5, "What's the wildest night out you've ever had?", "Big story."),
        (4, "What's a fantasy you'd only admit to the boys?", "Bold."),
        (4, "Have you ever been caught kissing somewhere you shouldn't?", "Spicy story."),
        (4, "What's the boldest message you've ever sent?", "Owner liked bold texts."),
        (4, "What's something about dating you've never admitted?", "Revealing."),
        (4, "What's a turn-on you've never admitted?", 'Bold.'),
        (4, "What's something you did on a night out that you'd never tell your mom?", "Spicy story."),
    ],
}

DARES = {
    ("couple", 1): [
        (5, "Give your partner a slow kiss on each cheek.", "Owner rated gentle kisses 5."),
        (5, "Hold your partner's hand and tell them one thing you love about it.", "Concrete, sweet."),
        (4, "Rest your head on your partner's shoulder until your next turn.", "Simple, cosy."),
        (4, "Give your partner a 30-second back scratch.", "Physical, easy."),
        (5, "Pick up your partner's hand and kiss each fingertip.", "Concrete and romantic."),
        (4, "Hug your partner from behind for 20 seconds.", "Cosy, physical."),
        (4, "Say 'I love you' (or 'I like you') in three different voices.", "Funny and sweet."),
        (4, "Dance with your partner for 30 seconds, no music.", "Silly and close."),
        (4, "Give your partner a 1-minute hand massage.", "Owner rated massages 5."),
        (3, "Feed your partner a sip of their drink.", "Fine."),
        (4, "Whisper your partner's name like it's a secret.", "Short and flirty."),
        (4, "Rub noses with your partner for 10 seconds.", "Cute and silly."),
    ],
    ("couple", 2): [
        (5, "Kiss your partner behind the ear, slowly.", "Owner rated neck/jaw kisses 5."),
        (5, "Give your partner a 1-minute back massage.", "Owner rated massages 5."),
        (5, "Kiss your partner's neck for ten seconds.", "Steamy, clear."),
        (4, "Sit face to face with your partner, knees touching, for one minute.", "Tension builder."),
        (5, "Kiss your partner for 15 seconds with your hands behind your back.", "Like the no-hands kiss (owner 5)."),
        (4, "Trace your partner's lips with your fingertip.", "Sensual, clean."),
        (4, "Let your partner sit on your lap and stay there until your next turn.", "Owner rated lap dares 5."),
        (4, "Kiss your partner's collarbone three times.", "Concrete."),
        (4, "Blow gently on your partner's neck, then kiss it.", "Teasing."),
        (5, "Pull your partner close and slow dance for one song.", "Owner liked slow dances."),
        (4, "Whisper exactly where you want to kiss them next.", "Concrete version of 'whisper'."),
        (4, "Give your partner a 30-second scalp massage.", "Easy and relaxing."),
    ],
    ("couple", 3): [
        (5, "Take off one item of your partner's clothing, slowly.", "Owner rated undressing dares 5."),
        (5, "Kiss your partner anywhere below the neck that they choose.", "Owner rated 'kiss where they point' 5."),
        (5, "Give your partner a slow 2-minute massage with lotion or oil.", "Owner rated massages 5."),
        (4, "Kiss your partner's stomach three times.", "Bold, clear."),
        (5, "Let your partner blindfold you and kiss you for 20 seconds.", "Owner rated blindfold dares 4-5."),
        (4, "Unbutton your partner's top one button at a time, kissing after each.", "Slow tease."),
        (5, "Kiss your partner for one minute without stopping.", "Owner rated long kisses 5."),
        (4, "Give your partner a slow lap dance for 30 seconds.", "Bold, fun."),
        (4, "Swap one item of clothing with your partner and keep it on.", "Owner rated trades 5."),
        (4, "Lie down and let your partner kiss a line from your neck to your waist.", "Spicy, clean wording."),
        (4, "Show your partner the move you'd use to seduce them, right now.", "Bold, concrete."),
        (4, "Take off your shirt and keep it off until your next turn.", "Clear, Spicy."),
    ],
    ("group", 1): [
        (5, "Do your best runway walk to the kitchen and back.", "Owner liked catwalk dares."),
        (4, "Let the player on your right give you a new hairstyle with their hands.", "Funny, harmless."),
        (4, "Speak only in questions until your next turn.", "Simple rule, funny."),
        (4, "Do 10 jumping jacks while singing the chorus of any song.", "Silly, active."),
        (4, "Tell a joke. If nobody laughs, do 5 squats.", "Clear rule."),
        (4, "Hug every player in the room.", "Warm, quick."),
        (3, "Show the group your best dance move for 10 seconds.", "Fine."),
        (4, "Let {target} draw a small heart on your hand with a pen, if they're up for it.", "Light contact, consent."),
        (4, 'Talk in an accent the group picks until your next turn. Ideas: cowboy · robot · news anchor.', 'One-word ideas, as the owner asked.'),
        (4, "Say the alphabet backwards from M in 20 seconds, or do 5 squats.", "Clear rule, funny."),
    ],
    ("group", 2): [
        (5, "Give {target} a 30-second hand massage, if they're up for it.", "Owner rated massages 5."),
        (5, "Dance with {target} for 20 seconds, as close as they're comfortable with.", "Owner rated slow dances with {target} 5."),
        (4, "Whisper your best pickup line in {target}'s ear.", "Flirty, contact-free."),
        (4, "Let the group give you a dare in one word. You act it out.", "One-word idea, as the owner asked."),
        (5, "Swap one accessory with {target} until the end of the game.", "Owner rated swaps 5."),
        (4, "Give {target} a hug that lasts 10 seconds, if they're up for it.", "Light contact, consent."),
        (4, "Do your sexiest walk across the room and wink at {target}.", "Flirty."),
        (4, "Read out the last emoji you sent and act it out.", "Funny, owner liked phone dares."),
        (4, "Whisper a compliment in {target}'s ear. Ideas: eyes · smile · outfit.", 'Owner wanted one-word ideas on compliments.'),
        (4, "Feed {target} a snack without using your hands, if they're up for it.", 'Playful contact, consent.'),
    ],
    ("group", 3): [
        (5, "Sit on {target}'s lap for one round, if they're up for it.", "Owner rated lap dares 5."),
        (5, "Kiss {target} on the neck, if they're up for it.", "Bold with consent."),
        (5, "Remove one item of clothing (an accessory counts).", "Owner rated this 5."),
        (4, "Give {target} a 20-second shoulder massage with your eyes closed, if they're up for it.", "Teasing, consent."),
        (4, "Let {target} choose a spot for you to kiss them (above the shoulders), if they're up for it.", "Their choice, safe."),
        (4, "Do a 15-second dance for {target} while they sit still.", "Bold, no touching."),
        (4, "Tell {target} what you'd do on a date with them, in three sentences.", "Clear length."),
        (4, "Swap tops with {target} for one round, if they're up for it.", "Owner rated swaps 5."),
        (5, "Give {target} a 15-second lap dance, if they're up for it.", 'Owner rated lap dances 5.'),
        (4, "Take off one of {target}'s accessories using only your teeth, if you're both up for it.", 'Spicy, consent built in.'),
    ],
    ("girls", 1): [
        (4, "Do your best model pose for a photo the group takes (for your eyes only).", "Fun, private."),
        (4, "Let another player do your makeup with one product only.", "Girls' night classic."),
        (4, "Walk like your favourite celebrity across the room.", "Funny."),
        (4, "Give every girl here a compliment about her outfit.", "Warm."),
        (3, "Sing the first line of a love song to the player on your left.", "Fine."),
        (4, 'Do a 15-second runway walk; the girls score you out of 10.', 'Owner liked catwalks; clear scoring.'),
        (4, 'Swap one accessory with the girl on your right for the rest of the game.', 'Owner rated swaps 5.'),
    ],
    ("girls", 2): [
        (5, "Show the group how you'd flirt with your crush, using the player on your left.", "Bold, funny."),
        (4, "Read out the last flirty message you received.", "Owner liked text dares."),
        (4, "Do your best sexy dance move for 10 seconds.", "Owner rated seductive dances 5."),
        (4, "Let the group choose your lipstick or top for the rest of the night.", "Fun."),
        (4, "Show the group your best 'come here' look.", "Short, flirty."),
        (5, "Give the girl on your left a 10-second lap dance, if she's up for it.", 'Owner rated lap dances 5; consent built in.'),
        (4, 'Order a drink from the player on your right in your sexiest voice.', 'Short, funny.'),
    ],
    ("girls", 3): [
        (4, "Teach the group your best flirty dance move in 20 seconds.", "Owner rated dance dares 5."),
        (4, "Show your best seductive walk across the room.", "Owner rated seductive moves 5."),
        (4, "Read your flirtiest message ever out loud.", "Owner rated this 5."),
        (4, "Tell the group the most daring thing on your bucket list.", "Bold."),
        (4, "Let the group pick an outfit for your next date.", "Fun."),
        (4, "Show how you'd kiss someone, using the back of your hand, for 10 seconds.", 'Spicy and funny, no contact needed.'),
        (4, 'Take off one accessory or item of clothing until your next turn.', 'Owner rated removing clothing 5.'),
    ],
    ("boys", 1): [
        (4, "Hold a plank while the group counts slowly to 30.", "Owner liked push-ups; a new exercise."),
        (4, "Arm wrestle the player on your left.", "Classic boys' night."),
        (4, "Show the group your best goal celebration.", "Funny."),
        (4, "Talk like a sports commentator about the next player's turn.", "Concrete, funny."),
        (3, "Let the group pick a nickname for you; everyone uses it until the game ends.", "Fine."),
        (4, 'Do 15 squats while saying the alphabet.', 'Concrete exercise dare.'),
        (4, 'Thumb wrestle the player on your right. The loser does 5 push-ups.', 'Clear rule, quick.'),
    ],
    ("boys", 2): [
        (5, "Propose to the player on your left like it's a movie, on one knee.", "Owner liked romantic speeches; this one is concrete."),
        (4, "Say who your celebrity crush is and do your best impression of them.", "Funny reveal."),
        (4, "Show your best dance move for 15 seconds.", "Fun."),
        (4, "Do your smoothest pickup line on the player on your right.", "Banter."),
        (4, "Let the group write a pickup line; say it to the player on your right.", "Bold, keeps it in the room (texting a crush was flagged weak)."),
        (4, 'Sing one line of a love song to the player on your left, on one knee.', 'Funny, concrete.'),
        (4, "Show your best move to get someone's attention across a room, for 10 seconds.", 'Banter.'),
    ],
    ("boys", 3): [
        (4, "Do 10 push-ups with your shirt off.", "Bold, boys' night energy."),
        (4, "Take off your shirt until your next turn.", "Bold, simple."),
        (4, "Let the group write your dating profile and read it in a sexy voice.", "Owner rated profile dares 5."),
        (4, "Show the group your best seductive look for 10 seconds.", "Funny, bold."),
        (4, "Tell the group the wildest dare you've ever done.", "Story."),
        (4, 'Make your best movie-star entrance through the door; the boys rate it out of 10.', 'Funny, concrete, nobody dragged in.'),
        (4, 'Let the player on your left draw a small tattoo on your arm with a pen.', 'Concrete, harmless.'),
    ],
}

# New wheel wedges: (deck, label, [flirty, steamy, spicy], rating, reason)
SPIN = [
    ("couple", "Neck kiss", ["Give your partner a soft kiss on the neck.", "Kiss your partner's neck slowly for 10 seconds.", "Kiss your partner's neck and collarbone for 20 seconds."], 5, "Owner rated neck kisses 5."),
    ("couple", "Lap", ["Sit on your partner's lap for one spin.", "Sit on your partner's lap, facing them, for one spin.", "Sit on your partner's lap and kiss them for 20 seconds."], 5, "Owner rated lap dares 5."),
    ("couple", "Lose a layer", ["Take off one sock; your partner keeps it until the game ends.", "Take off one accessory or item of clothing.", "Your partner takes off one item of your clothing."], 5, "Owner rated removing clothing 5."),
    ("couple", "Blindfold", ["Close your eyes and guess where your partner kisses you.", "Close your eyes while your partner kisses you three times.", "Stay blindfolded while your partner kisses you anywhere they like for 20 seconds."], 4, "Owner rated blindfold dares 4-5."),
    ("group", "Dance-off", ["Have a 15-second dance-off with {target}. The group picks the winner.", "Have a 20-second sexy dance-off with {target}. The group picks the winner.", "Have a 20-second seductive dance-off with {target}. The loser loses a layer."], 5, "Replaces Swap seats with something to do."),
    ("group", "Lap", ["Sit on {target}'s lap for one spin, if they're up for it.", "Sit on {target}'s lap and feed them a snack, if they're up for it.", "Give {target} a 15-second lap dance, if they're up for it."], 5, "Owner rated lap dares 5."),
    ("group", "Kiss", ["Kiss {target} on the hand, if they're up for it.", "Kiss {target} on the forehead, if they're up for it.", "Kiss {target} on the neck, if they're up for it."], 5, "Owner rated cheek kisses 5."),
    ("group", "Swap", ["Swap an accessory with {target} for the rest of the game.", "Swap one item of clothing with {target}, if they're up for it.", "Swap tops with {target}, if they're up for it."], 5, "Owner rated swaps 5."),
    ('couple', 'Back hug', ['Hug your partner from behind for 20 seconds.', 'Hug your partner from behind and kiss their shoulder.', 'Hug your partner from behind and kiss down their neck for 20 seconds.'], 4, 'Simple contact that builds up.'),
    ('couple', 'One word', ['Say one word that sums up your partner. Ideas: cute · safe · fun.', 'Say what you want to do later, in five words or fewer.', "Say the next thing you'll take off your partner, then do it."], 4, "One-word ideas, per the owner's notes."),
    ('couple', 'Kiss count', ['Give your partner 5 quick kisses on the cheek.', 'Give your partner 10 kisses, each in a place they choose.', 'Give your partner 10 kisses, each lower than the last. They can say stop.'], 5, 'Concrete count, builds up.'),
    ('couple', 'Feed me', ['Feed your partner a snack without using your hands.', 'Feed your partner a snack from your mouth.', 'Feed your partner a snack off your body; they pick where.'], 4, 'Physical, playful.'),
    ('couple', 'Hands on', ['Hold hands without letting go until your next spin.', "Keep your hands on your partner's waist until your next spin.", 'Let your partner hold your wrists while they kiss you for 20 seconds.'], 4, 'Clear rule.'),
    ('couple', 'Staring', ["Stare into your partner's eyes; the first to laugh owes a kiss.", "Stare into each other's eyes for 30 seconds, foreheads touching.", "Hold your partner's gaze while they undo one button or zip."], 4, 'Simple, builds tension.'),
    ('couple', 'Trace it', ["Write 'I like you' on your partner's palm with one finger; they guess the words.", "Spell your partner's name on their back with kisses.", 'Trace a line with your lips from their wrist to their shoulder.'], 4, 'Concrete, sensual.'),
    ('couple', 'Pick one', ['Pick one and do it: hug · kiss · compliment.', 'Pick one for 20 seconds: neck kiss · lap sit · massage.', 'Pick one, now: lose a layer · lap dance · blindfold kiss.'], 5, "One-word choices instead of 'their call'."),
    ('couple', 'Movie kiss', ['Copy a romantic movie pose with your partner.', 'Recreate your favorite kiss from a movie.', 'Recreate the steamiest movie scene you can think of, for 20 seconds.'], 4, 'Concrete, a story to pick.'),
    ('couple', 'Tickle', ['Tickle your partner for 10 seconds.', 'Your partner tickles you for 15 seconds. Laugh and you owe a kiss.', "Find your partner's most ticklish spot, then kiss it."], 4, 'Playful.'),
    ('group', 'Mirror', ['Copy every move {target} makes for 15 seconds.', "Mirror {target}'s flirty moves for 15 seconds, face to face.", "Mirror {target}'s sexiest moves for 20 seconds, as close as they're comfortable with."], 4, 'Clear rule, funny.'),
    ('group', 'Most likely', ["The group asks who's most likely to do something; you and {target} point at the same time. Ideas: be late · cry at a movie · get lost.", "The group asks who's most likely to do something flirty; you and {target} point. Ideas: flirt first · text an ex · kiss first.", "The group asks who's most likely to do something spicy; you and {target} point. Ideas: make the first move · kiss on a first date · skinny-dip."], 4, "Popular 'most likely to' format, with ideas."),
    ('group', 'Pickup line', ['Say a cheesy pickup line to {target}.', 'Say your best pickup line to {target} and hold eye contact.', "Say your boldest pickup line close to {target}'s ear, if they're up for it."], 4, 'Concrete, funny.'),
    ('group', 'Impression', ['Do an impression of a famous person; the group guesses who.', 'Do a flirty impression of another player; the group guesses who.', 'Act out another player trying to seduce someone; the group guesses who.'], 4, 'Classic, concrete.'),
    ('group', 'Ice cube', ['Hold an ice cube in your hand until it melts or your next spin.', "Rub an ice cube on {target}'s wrist, if they're up for it.", "Pass an ice cube to {target} mouth to mouth, if you're both up for it."], 4, 'Owner rated ice forfeits 4-5.'),
    ('group', 'Hug', ["Give {target} a bear hug, if they're up for it.", "Hug {target} from behind for 10 seconds, if they're up for it.", "Hold {target} close for 15 seconds, foreheads touching, if they're up for it."], 4, 'Simple contact with consent.'),
    ('group', 'Model walk', ['Strut across the room like a model; the group scores you out of 10.', 'Do a sexy strut across the room and stop to wink at {target}.', 'Strut across the room and drop one accessory or layer at the end.'], 4, 'Owner liked catwalk dares.'),
    ('group', 'Pen art', ['Let {target} draw a smiley on your hand with a pen.', 'Let {target} write their name on your arm with a pen.', 'Let {target} write one word anywhere on you they choose (you can say no).'], 4, 'Concrete, harmless.'),
    ('group', 'Truth or sip', ['Answer a truth from {target}, or take a sip (or do 10 squats).', 'Answer a flirty truth from {target}, or take two sips (or do 15 squats).', 'Answer a spicy truth from {target}, or finish your drink (or do 20 squats).'], 4, 'Popular truth-or-drink format, with a no-drink option.'),
]

MISFORTUNE = [
    ("couple", "Massage duty", ["Give your partner a 1-minute foot massage.", "Give your partner a 2-minute massage wherever they choose, above the waist.", "Give your partner a 2-minute massage with your shirt off."], 5, "Owner rated massages 5; a forfeit that's also a treat."),
    ("couple", "Ice kiss", ["Hold an ice cube in your mouth, then kiss your partner's hand.", "Hold an ice cube in your mouth, then kiss your partner's neck.", "Your partner traces an ice cube down your back. You can say stop."], 5, "Owner rated ice forfeits 4-5."),
    ("couple", "Freeze", ["Freeze in a funny pose until your partner says go (30 seconds max).", "Freeze while your partner kisses your neck. Move and you lose a layer.", "Freeze while your partner undoes one button or zip. Move and they pick your next dare."], 4, "Clear rule, playful."),
    ("group", "Sing it", ["Sing a nursery rhyme as dramatically as you can.", "Sing a love song to {target} for 15 seconds.", "Sing a sexy song to {target} while looking them in the eyes."], 4, "Embarrassing, harmless."),
    ("group", "Statue", ["Stand like a statue until your next turn. Every laugh costs a push-up.", "Hold a plank for 20 seconds while the group tries to make you laugh.", "Freeze while {target} gives you a 10-second shoulder massage, if you're both up for it. Laugh and lose a layer."], 4, "Clear rule."),
    ("group", "Hot seat", ["Answer one question from each player.", "Answer one flirty question from each player.", "Answer one spicy question from each player. Each one you skip costs a layer."], 4, "Owner liked hot seats."),
    ('couple', 'Squats', ['Do 10 squats while your partner counts.', 'Do 10 squats while your partner cheers you on from the sofa.', 'Do 10 squats with your shirt off.'], 4, 'Clear, short.'),
    ('couple', 'No hands', ['Keep your hands behind your back until your next turn.', 'Keep your hands behind your back while your partner kisses your neck for 10 seconds.', 'Keep your hands behind your back while your partner does what they like for 20 seconds. You can say stop.'], 5, 'Owner liked physical forfeits.'),
    ('couple', 'Pet name', ["Call your partner 'Your Majesty' until your next turn.", 'Call your partner a name they pick until the game ends. Ideas: baby · sexy · boss.', "Say 'yes, my love' to everything your partner says until your next turn."], 4, 'One-word ideas.'),
    ('couple', 'Serve them', ['Bring your partner a drink or a snack.', 'Feed your partner a snack and kiss them after each bite.', "Do your partner's next dare for them, whatever it is."], 4, 'Replaces Royal servant with a concrete action.'),
    ('couple', 'Dress up', ['Wear something silly your partner picks until the game ends.', "Wear one item of your partner's clothing until the game ends.", 'Swap one item of clothing with your partner until the game ends.'], 4, 'Owner rated swaps 5.'),
    ('couple', 'Silly voice', ['Talk in a baby voice until your next turn.', 'Say three sexy things to your partner in a robot voice.', 'Whisper the naughtiest thing you can think of in a cartoon voice.'], 4, 'Funny, concrete.'),
    ('couple', 'Kiss tax', ['Until your next turn, every laugh costs a kiss on the cheek.', 'Until your next turn, every laugh costs a kiss on the neck.', 'Until your next turn, every laugh costs a kiss wherever your partner points.'], 4, 'Clear rule.'),
    ('couple', 'Truth now', ['Answer a truth from the deck, no skipping.', 'Answer a steamy truth from the deck, no skipping.', 'Answer a spicy truth from the deck, then act it out for 10 seconds.'], 4, 'Uses the deck, so no one has to invent it.'),
    ('couple', 'Wall sit', ['Hold a wall sit for 20 seconds.', 'Hold a wall sit for 30 seconds while your partner kisses you.', 'Hold a wall sit while your partner sits on your lap for 10 seconds.'], 3, 'Physical; may be hard for some.'),
    ('couple', 'Plank', ['Hold a plank for 20 seconds while your partner counts.', 'Hold a plank while your partner tickles you for 15 seconds.', 'Hold a plank while your partner kisses your back for 15 seconds.'], 4, 'Clear rule, playful.'),
    ('couple', 'Photo pose', ['Pose like a model while your partner takes a photo (for your eyes only).', "Strike your sexiest pose for your partner's photo (for your eyes only).", 'Pose for a photo in only what your partner picks (for your eyes only, then delete it).'], 3, "Fun, but some won't like photos."),
    ('group', 'Push-ups', ['Do 10 push-ups while the group counts.', "Do 10 push-ups while {target} counts in your ear, if they're up for it.", 'Do 10 push-ups with your shirt off.'], 4, 'Owner liked push-ups.'),
    ('group', 'Funny voice', ['Talk like a robot until your next turn.', 'Talk in a sexy voice to everyone until your next turn.', 'Say something seductive to {target} in a cartoon voice.'], 4, 'Concrete.'),
    ('group', 'Nickname', ['The group gives you a nickname until the game ends. Ideas: Chef · Captain · Sweetie.', 'The group gives you a flirty nickname until the game ends. Ideas: Lover · Hot stuff · Charmer.', 'The group gives you a spicy nickname, and you answer to it until the game ends.'], 4, 'One-word ideas.'),
    ('group', 'Serve', ['Bring {target} a drink or a snack.', "Feed {target} a snack, if they're up for it.", "Feed {target} a snack from your mouth, if you're both up for it."], 4, 'Replaces Royal servant (owner rated 2) with a concrete action.'),
    ('group', 'Lose a layer', ['Take off one accessory until your next turn.', 'Take off one item of clothing the group picks.', 'Take off one item of clothing, slowly, while the group counts to 10.'], 5, 'Owner rated removing clothing 5.'),
    ('group', 'Truth now', ['Answer a truth from the deck, no skipping.', 'Answer a steamy truth from the deck, no skipping.', 'Answer a spicy truth from the deck, no skipping.'], 4, 'Uses the deck, so no one has to invent it.'),
    ('group', 'Ice cube', ['Hold an ice cube in your hand until your next turn.', 'Put an ice cube down your shirt and leave it there.', "Let {target} rub an ice cube on your neck, if you're both up for it."], 4, 'Owner rated ice forfeits 4-5.'),
    ('group', 'Laugh tax', ['Until your next turn, every laugh costs 5 squats.', 'Until your next turn, every laugh costs a sip (or 5 squats).', 'Until your next turn, every laugh costs an accessory or layer.'], 4, 'Clear rule.'),
    ('group', 'Solo dance', ['Dance alone for 15 seconds to a song the group picks.', 'Do a sexy dance in the middle of the room for 15 seconds.', 'Take off one accessory as slowly as you can while the group counts to 15.'], 5, 'Owner rated dances 5.'),
    ('group', 'Pose', ['Hold a superhero pose until your next turn.', 'Hold a sexy pose while the group counts to 20.', "Hold a seductive pose with {target} for 15 seconds, if you're both up for it."], 3, 'Simple, a bit plain.'),
]


def rows():
    out = {"Truths": [], "Dares": [], "Spin the Wheel": [], "Misfortune": []}
    for (sheet, data) in [("Truths", TRUTHS), ("Dares", DARES)]:
        for (deck, heat), items in data.items():
            for rating, text, reason in items:
                out[sheet].append({"deck": deck, "heat": H[heat], "text": text, "claude_rating": rating, "claude_reason": reason})
    for sheet, data in [("Spin the Wheel", SPIN), ("Misfortune", MISFORTUNE)]:
        for deck, label, texts, rating, reason in data:
            for i, t in enumerate(texts):
                out[sheet].append({"deck": deck, "heat": H[i + 1], "wedge": label, "text": t, "claude_rating": rating, "claude_reason": reason})
    return out


def main() -> None:
    path = ROOT / "data" / "new-cards.xlsx"
    if path.exists():
        raise SystemExit(f"{path.name} already exists: your ratings would be overwritten. Rename or delete it first.")
    sheets = rows()
    cols = ["your_rating", "decision", "rewrite", "notes"]
    help_rows = [
        ["What this is", "New cards to double the deck. Nothing here is in the app yet."],
        ["your_rating", "1 (bad) to 5 (great)."],
        ["decision", "keep (or leave empty) / remove / change. For change, write the new text in rewrite."],
        ["When done", "Save, close Excel, and tell Claude. Kept cards are added to the app (scripts/import_new_cards.py)."],
    ]
    with pd.ExcelWriter(path, engine="openpyxl") as xl:
        pd.DataFrame(help_rows, columns=["How to rate", ""]).to_excel(xl, sheet_name="How to rate", index=False)
        summary = [{"Sheet": k, "New cards": len(v)} for k, v in sheets.items()]
        pd.DataFrame(summary).to_excel(xl, sheet_name="Summary", index=False)
        for name, r in sheets.items():
            df = pd.DataFrame(r)
            for c in cols:
                df[c] = None
            df.to_excel(xl, sheet_name=name, index=False)
    wb = load_workbook(path)
    head = PatternFill("solid", fgColor="7A1F3D")
    mine = PatternFill("solid", fgColor="F6E7C1")
    for ws in wb.worksheets:
        for cell in ws[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = head
        ws.freeze_panes = "A2"
        for col in ws.columns:
            title = str(col[0].value or "")
            width = 70 if title in ("text", "rewrite", "Meaning", "") else 40 if title in ("claude_reason", "notes") else 14
            ws.column_dimensions[col[0].column_letter].width = width
            for c in col[1:]:
                c.alignment = Alignment(wrap_text=True, vertical="top")
                if title in cols:
                    c.fill = mine
        if ws.title in sheets:
            headers = [c.value for c in ws[1]]
            n = ws.max_row
            dv = DataValidation(type="whole", operator="between", formula1="1", formula2="5", allow_blank=True)
            dv2 = DataValidation(type="list", formula1='"keep,remove,change"', allow_blank=True)
            ws.add_data_validation(dv); ws.add_data_validation(dv2)
            dv.add(f"{ws.cell(1, headers.index('your_rating') + 1).column_letter}2:{ws.cell(1, headers.index('your_rating') + 1).column_letter}{n}")
            dv2.add(f"{ws.cell(1, headers.index('decision') + 1).column_letter}2:{ws.cell(1, headers.index('decision') + 1).column_letter}{n}")
            ws.auto_filter.ref = ws.dimensions
    wb.save(path)
    print(f"{sum(len(v) for v in sheets.values())} new cards -> {path.relative_to(ROOT)}")
    for k, v in sheets.items():
        print(f"  {k}: {len(v)}")


if __name__ == "__main__":
    main()
