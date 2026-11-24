import { Redirect, router, useLocalSearchParams } from "expo-router";

import { GateView } from "@/components/Gate";
import { safeNext } from "@/components/Guard";
import { useGame } from "@/state/store";

/** 18+ age gate and welcome page: the app's start page. Asked once per device; after that it goes straight on. */
export default function Gate() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const hydrated = useGame((g) => g.hydrated);
  const adult = useGame((g) => g.adult);
  const hasGame = useGame((g) => g.players.length >= 2);
  const go = safeNext(next) ?? (hasGame ? "/home" : "/group");
  // Before the saved game is read (and in the HTML built for search engines) this shows the welcome page.
  // Returning adults don't see it: the HTML shell hides it until they're sent on.
  if (hydrated && adult) return <Redirect href={go as never} />;
  return <GateView about onConfirm={() => router.replace(go as never)} />;
}
