// Built-in card id → original text (with {target} still in it, so no player names), built on first use.
import { cardId } from "./cards";
import { COUPLE, EXTRA, GROUP, WHEELS } from "./content";

let index: Map<string, string> | null = null;

export function builtInText(id: string): string | undefined {
  if (!index) {
    index = new Map();
    for (const deck of [COUPLE, GROUP, EXTRA.girls, EXTRA.boys]) {
      if (!deck) continue;
      for (const t of ["truth", "dare"] as const) deck[t].flat().forEach((x) => index!.set(cardId(x), x));
    }
    for (const g of ["couple", "group"] as const) WHEELS[g].forEach(([, texts]) => texts.forEach((x) => index!.set(cardId(x), x)));
  }
  return index.get(id);
}
