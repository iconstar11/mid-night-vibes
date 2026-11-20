import { useColorScheme } from "react-native";

// Same palette as the web version (legacy/index.html :root tokens)
const light = {
  bg: "#F7E6E4", surface: "#FFF5F3", ink: "#3B0D1C", muted: "#8A5A66",
  wine: "#7A1F3D", rose: "#D9667B", brass: "#B8892B", plum: "#4E1D3A",
  onAccent: "#FFF5F3", line: "#E7C9C9", scrim: "rgba(20,4,12,0.45)",
};
const dark: typeof light = {
  bg: "#1F0A14", surface: "#2E1220", ink: "#F7E1E4", muted: "#C29AA6",
  wine: "#A33256", rose: "#E07A8C", brass: "#D9AE4B", plum: "#6B2A50",
  onAccent: "#FFF5F3", line: "#4A2235", scrim: "rgba(8,2,6,0.6)",
};
export type Colors = typeof light;

export const font = {
  display: "InstrumentSerif_400Regular",
  displayItalic: "InstrumentSerif_400Regular_Italic",
  body: "Figtree_400Regular",
  semibold: "Figtree_600SemiBold",
  heavy: "Figtree_800ExtraBold",
};

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}

/** Darken/blend helper for gradients: mix(a, b, t) with hex colours. */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export const HEAT_NAMES = ["Flirty", "Steamy", "Spicy"] as const;
export const FLAMES = ["●○○", "●●○", "●●●"] as const;
