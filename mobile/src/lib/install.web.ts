// PWA install: Android and desktop Chrome/Edge show their own prompt; iPhone gets an Add to Home Screen guide.
import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let saved: PromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  // The page head stores an early offer in window.__mvInstall (see src/app/+html.tsx)
  const w = window as unknown as { __mvInstall?: PromptEvent };
  const take = () => { if (w.__mvInstall) { saved = w.__mvInstall; listeners.forEach((f) => f()); } };
  take();
  window.addEventListener("mv-installable", take);
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); saved = e as PromptEvent; listeners.forEach((f) => f()); });
  window.addEventListener("appinstalled", () => { saved = null; listeners.forEach((f) => f()); });
  // This module loads lazily, often after the page's load event, so register right away if it has passed
  const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);
  }
}

const standalone = () =>
  typeof window !== "undefined" && (matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
const isIOS = () =>
  typeof navigator !== "undefined" && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
const isSafari = () => /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios|opios/i.test(navigator.userAgent);

export function useInstall() {
  const [, bump] = useState(0);
  useEffect(() => {
    const f = () => bump((n) => n + 1);
    listeners.add(f);
    f(); // re-check after the first client render (static HTML has no window)
    return () => { listeners.delete(f); };
  }, []);
  const canInstall = typeof window !== "undefined" && !standalone() && (!!saved || isIOS());
  async function install(): Promise<"prompted" | "ios-guide" | "safari-needed"> {
    if (saved) {
      await saved.prompt();
      const { outcome } = await saved.userChoice.catch(() => ({ outcome: "dismissed" as const }));
      if (outcome === "accepted") { saved = null; listeners.forEach((f) => f()); }
      return "prompted";
    }
    return isSafari() ? "ios-guide" : "safari-needed";
  }
  return { canInstall, install };
}
