// Native apps are already installed: no Install button. The web build uses install.web.ts.
export function useInstall(): { canInstall: boolean; install: () => Promise<"prompted" | "ios-guide" | "safari-needed"> } {
  return { canInstall: false, install: async () => "prompted" };
}
