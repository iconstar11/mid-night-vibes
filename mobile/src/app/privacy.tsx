import { CONTACT, LegalPage, OPERATOR, type LegalSection } from "@/components/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    h: "Who is responsible",
    body: [
      `Midnight Vibes is run by ${OPERATOR}, which is responsible for your personal data. We follow the data protection laws that apply to us, including Kenya's Data Protection Act, 2019, where the app is run. Contact: ${CONTACT}.`,
    ],
  },
  {
    h: "What we collect",
    body: [
      [
        "Account: your email address and, if you choose, your name. Passwords are stored by our sign-in provider in scrambled (hashed) form; we never see them. If you use Google sign-in, Google shares your email and name with us.",
        "Profile, if you fill it in: he/she and who you're into. This only fills in game setup faster.",
        "Saved players, if you add them: their name and, if you choose, he/she and who they're into. Only people you add yourself are saved.",
        "Moods you type: sent to an AI service to write cards for you (see below). We keep a copy of popular moods and the AI's answer so the same mood can be served quickly, without linking it to you.",
        "Game stats: which built-in or AI cards were shown, skipped, done or starred, the heat level, group type and size, how long a card was on screen, when the heat rose, which link you arrived from (for example a social media post) and, if you answer it, where you found us. Stats are linked to your account's random ID, never contain names, emails, the moods you type or card text, and are deleted after 400 days. You can switch them off in Account → Privacy.",
        "Payments: Paystack handles your card or M-Pesa details; we never receive your card number or M-Pesa PIN. We keep a payment reference, the plan, the amount, the date and whether it succeeded.",
        "On your device: your current game, players and settings are kept on your phone or browser so you don't have to type them again.",
      ],
    ],
  },
  {
    h: "What we use it for",
    body: [
      [
        "To run the games, your account and Premium.",
        "To write AI cards for the moods you set.",
        "To learn which cards people enjoy, and improve the deck.",
        "To send you emails you need, such as confirming your email address, and messages about your account or Premium. We don't send marketing without asking.",
        "To keep the app safe and stop abuse.",
      ],
      "We never sell your data, show ads, or post anything on your behalf.",
    ],
  },
  {
    h: "Who helps us run the app",
    body: [
      "These services process data for us, only for the purposes above. Some of them store or process data in other countries, with safeguards such as contracts and encryption.",
      [
        "Supabase: database, sign-in and server functions.",
        "Cloudflare: hosting the website.",
        "Paystack: payments by card and M-Pesa.",
        "Resend: sending account emails.",
        "AI services (Anthropic, Mistral and Venice AI): writing cards from the moods you set. They receive the mood, the heat level and the group type, not your name or email.",
        "Google: only if you choose Google sign-in.",
      ],
    ],
  },
  {
    h: "Live games",
    body: [
      "When you share a live game, people with the link see player names, whose turn it is and the cards, in real time. This isn't stored as a record, and the game ends after 12 hours.",
    ],
  },
  {
    h: "How long we keep it",
    body: [
      [
        "Account, profile and saved players: until you delete them or ask us to delete your account.",
        "Game stats: 400 days.",
        "Payment records: as long as tax and accounting law requires.",
        "Live games: 12 hours.",
      ],
    ],
  },
  {
    h: "Your rights",
    body: [
      "Wherever you live, you can ask to see the personal data we hold about you, correct it, delete it, get a copy, or object to how we use it. You can also turn off game stats at any time in Account.",
      `To make a request, email ${CONTACT} from the email address on your account. We reply within 30 days. If you're unhappy with our answer, you can complain to the data protection authority where you live, or to Kenya's Office of the Data Protection Commissioner (odpc.go.ke).`,
    ],
  },
  {
    h: "Adults only",
    body: ["Midnight Vibes is for people aged 18 and over. We don't knowingly collect data from anyone under 18; if you think we have, tell us and we'll delete it."],
  },
  {
    h: "Security and changes",
    body: [
      "Data is sent over encrypted connections, and each account can only read its own data. No system is perfect, so we will tell you and the regulator as the law requires if something goes wrong.",
      "We may update this policy. The date at the top shows the latest version, and we will tell you about important changes.",
    ],
  },
];

export default function Privacy() {
  return <LegalPage here="/privacy" title="Privacy policy" intro="What Midnight Vibes collects, why, and the choices you have." sections={SECTIONS} />;
}
