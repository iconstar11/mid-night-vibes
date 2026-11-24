import { CONTACT, LegalPage, type LegalSection } from "@/components/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    h: "7 days to change your mind",
    body: [
      "If Premium isn't for you, ask for a refund within 7 days of your first purchase and we'll refund it in full. This covers your first purchase of any plan (Party pass, Monthly or Yearly), by card or M-Pesa.",
    ],
  },
  {
    h: "Mistakes are always refunded",
    body: [
      [
        "You were charged twice for the same purchase.",
        "You paid but Premium didn't switch on, and we can't fix it.",
        "You were charged after cancelling a renewal.",
      ],
      "These are refunded in full, whenever you notice them.",
    ],
  },
  {
    h: "Renewals and later purchases",
    body: [
      "Monthly and Yearly card plans renew automatically until you cancel. Cancel any time in Account → \"Update card or cancel renewal\"; Premium stays on until the end of the period you've paid for. We don't refund a period that has already started, or purchases after your first one, except for the mistakes above.",
      "Party passes and M-Pesa purchases don't renew, so there's nothing to cancel.",
    ],
  },
  {
    h: "How to ask",
    body: [
      `Email ${CONTACT} from the email address on your account. Say which purchase it is (the date and amount, or the Paystack receipt), and why. You don't need to give a long reason.`,
      "We reply within 3 working days. Approved refunds go back the way you paid: to your card, or to your M-Pesa number. Card refunds can take 5 to 10 working days to show, depending on your bank. When a purchase is refunded, its Premium days end.",
    ],
  },
  {
    h: "Your rights",
    body: ["This policy doesn't take away any rights you have under Kenyan consumer law."],
  },
];

export default function Refunds() {
  return <LegalPage here="/refunds" title="Refund policy" intro="When and how you can get your money back for Premium." sections={SECTIONS} />;
}
