// Calls the AI for the mood. In production this is the Supabase Edge Function `ideas`.
// During development it can point at the legacy Node server instead (EXPO_PUBLIC_AI_URL).
import { ensureSession, supabase, supabaseReady } from "./supabase";

export type AiRequest = {
  game: "tod" | "wheel";
  vibe: string;
  heat: number;
  group: string;
  pair: string;
  players: number;
};
export type AiResponse = {
  truths?: string[];
  dares?: string[];
  wedges?: { label: string; text: string }[];
};

const legacyUrl = process.env.EXPO_PUBLIC_AI_URL;

export async function askAI(req: AiRequest): Promise<AiResponse> {
  if (supabaseReady) {
    await ensureSession();
    const { data, error } = await supabase!.functions.invoke<AiResponse & { error?: string }>("ideas", { body: req });
    if (error) {
      // FunctionsHttpError carries the function's JSON body with a friendly message
      const ctx = (error as { context?: Response }).context;
      const body = ctx && typeof ctx.json === "function" ? await ctx.json().catch(() => null) : null;
      throw new Error(body?.error ?? "");
    }
    return data ?? {};
  }
  if (legacyUrl) {
    const r = await fetch(legacyUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? "");
    return j;
  }
  throw new Error("");
}
