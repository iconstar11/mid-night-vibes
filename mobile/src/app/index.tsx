import { Redirect, router, useLocalSearchParams } from "expo-router";

import { GateView } from "@/components/Gate";
import { safeNext } from "@/components/Guard";
import { useGame } from "@/state/store";

/** 18+ age gate: the app's start page. Asked once per device; after that it goes straight on. */
export default function Gate() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const hydrated = useGame((g) => g.hydrated);
  const adult = useGame((g) => g.adult);
  const hasGame = useGame((g) => g.players.length >= 2);
  const go = safeNext(next) ?? (hasGame ? "/home" : "/group");
  if (!hydrated) return null;
  if (adult) return <Redirect href={go as never} />;
  return <GateView onConfirm={() => router.replace(go as never)} />;
}
