import { CONTACT, LegalPage, OPERATOR, type LegalSection } from "@/components/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    h: "Who we are",
    body: [
      `Midnight Vibes is a party game app for adults: Truth or Dare, Spin the Wheel and Wheel of Misfortune. It is run by ${OPERATOR}. In these terms, "we" means Midnight Vibes and "you" means anyone who uses the app or the website.`,
      "By using Midnight Vibes you agree to these terms, our Privacy policy and our Refund policy. If you don't agree, please don't use the app.",
    ],
  },
  {
    h: "Adults only, and every dare is optional",
    body: [
      [
        "You must be 18 or older to use Midnight Vibes, and so must everyone you play with.",
        "Every truth, dare and forfeit is optional. Anyone can skip, say stop, or leave at any time, and nobody should be pressured.",
        "Only touch, kiss or undress with people who clearly agree, every time. Agreeing to play is not agreeing to every dare.",
        "Don't play with anyone who is too drunk or otherwise unable to agree.",
        "Drinks are optional and water works just as well. Food forfeits (chilli, lemon, hot sauce) are optional: skip them if you have an allergy or health reason.",
        "You are responsible for how you and your group play, and for following the law where you are.",
      ],
    ],
  },
  {
    h: "Accounts",
    body: [
      "You can play as a guest with a few free cards a day. A free account (email and password, or Google sign-in) unlocks more, such as AI moods and live games.",
      "Give accurate details and keep your password private. You are responsible for what happens on your account. Tell us at once if you think someone else is using it.",
    ],
  },
  {
    h: "AI cards and wheels",
    body: [
      `When you set a mood, an AI writes cards and wheel sections for it. AI can make mistakes or write something that doesn't suit your group. We filter what it writes, but you decide what to play: skip anything you don't like, and email us at ${CONTACT} about anything that shouldn't be there.`,
      "Don't type anything into the mood box that you wouldn't want an AI service to process (see our Privacy policy).",
    ],
  },
  {
    h: "Premium",
    body: [
      "Premium gives more AI moods each day and extra features. The plans, prices and what they include are shown in the app before you pay. Prices are in Kenyan shillings (KES) and payments are handled by Paystack.",
      [
        "Party pass: one payment for a fixed number of days. It does not renew.",
        "Monthly and Yearly by card: renew automatically at the end of each period until you cancel. Cancel any time in Account → \"Update card or cancel renewal\". Premium then stays on until the end of the period you paid for.",
        "M-Pesa: buys a fixed number of days (30 for Monthly, 365 for Yearly). It does not renew.",
      ],
      "If we change a price, the new price applies from your next purchase or renewal, and we will tell you before a renewal at a new price. Refunds are covered by our Refund policy.",
    ],
  },
  {
    h: "Live games",
    body: [
      "A live game lets others follow your game on their phones through a link. Anyone with the link can see player names, whose turn it is and the cards, so share it only with the people you're playing with. A live game ends after 12 hours.",
    ],
  },
  {
    h: "Using Midnight Vibes fairly",
    body: [
      [
        "Don't use the app to harass, threaten or embarrass anyone, or to share anything about a person without their permission.",
        "Don't type or share anything illegal, or anything involving minors.",
        "Don't try to break, overload or copy the app, get around its limits, or access other people's accounts.",
      ],
      "We may limit, suspend or close an account that breaks these rules.",
    ],
  },
  {
    h: "Our content",
    body: [
      "The cards, wheels, design and name of Midnight Vibes belong to us. You may use them to play, for yourself and your friends. Don't copy, sell or republish them.",
    ],
  },
  {
    h: "No guarantees, and limits on our responsibility",
    body: [
      "We work to keep Midnight Vibes available and safe, but we provide it \"as is\": it may sometimes be unavailable, change, or contain mistakes.",
      "As far as the law allows, we are not responsible for what players choose to do during a game, or for indirect losses. If we are found responsible for something, our total responsibility is limited to the amount you paid us in the 12 months before. Nothing in these terms removes rights you have under Kenyan consumer law.",
    ],
  },
  {
    h: "Ending",
    body: [
      `You can stop using Midnight Vibes at any time. To delete your account and its data, email ${CONTACT} from the email address on the account.`,
    ],
  },
  {
    h: "Changes and the law",
    body: [
      "We may update these terms. The date at the top shows the latest version, and we will tell you in the app or by email about important changes. These terms are governed by the laws of Kenya.",
      `Questions about these terms: ${CONTACT}.`,
    ],
  },
];

export default function Terms() {
  return <LegalPage here="/terms" title="Terms of use" intro="The rules for using Midnight Vibes, in plain words." sections={SECTIONS} />;
}
