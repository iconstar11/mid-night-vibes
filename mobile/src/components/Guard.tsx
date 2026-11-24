import { Redirect, useGlobalSearchParams, usePathname } from "expo-router";
import type { ReactNode } from "react";

import { useGame } from "@/state/store";

/** Where they were going, as a path with its query (kept through the 18+ gate, e.g. /account?paid=1&ref=…). */
function useHere(): string {
  const path = usePathname();
  const params = useGlobalSearchParams();
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(Array.isArray(v) ? v[0] : String(v))}`)
    .join("&");
  return q ? `${path}?${q}` : path;
}

/** Screens after the age gate: wait for the saved game, then send people to the gate only if they never confirmed. */
export function AdultOnly({ children, needPlayers }: { children: ReactNode; needPlayers?: boolean }) {
  const hydrated = useGame((g) => g.hydrated);
  const adult = useGame((g) => g.adult);
  const players = useGame((g) => g.players.length);
  const here = useHere();
  if (!hydrated) return null; // a moment while the saved 18+ confirmation and players load
  if (!adult) return <Redirect href={{ pathname: "/", params: { next: here } }} />;
  if (needPlayers && players < 2) return <Redirect href="/group" />;
  return <>{children}</>;
}

/** A safe in-app path to continue to after the gate (never another site). */
export function safeNext(next: unknown): string | null {
  const n = Array.isArray(next) ? next[0] : next;
  return typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : null;
}
