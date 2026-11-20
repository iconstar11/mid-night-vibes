import { Redirect } from "expo-router";
import type { ReactNode } from "react";

import { useGame } from "@/state/store";

/** Screens after the age gate: send people back to the gate if they arrive by link or refresh. */
export function AdultOnly({ children, needPlayers }: { children: ReactNode; needPlayers?: boolean }) {
  const adult = useGame((g) => g.adult);
  const players = useGame((g) => g.players.length);
  if (!adult) return <Redirect href="/" />;
  if (needPlayers && players < 2) return <Redirect href="/group" />;
  return <>{children}</>;
}
