import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { FoundVia } from "@/components/FoundVia";
import { SeoHead } from "@/components/SeoHead";
import { trackSessionStart } from "@/lib/track";
import { useGame } from "@/state/store";
import { useColors } from "@/theme/tokens";

export default function RootLayout() {
  const c = useColors();
  const darkUi = c.bg === "#1F0A14";
  // Web: the page behind the app follows the chosen appearance too (the HTML shell only knows the device's)
  useEffect(() => { if (Platform.OS === "web") document.body.style.background = c.bg; }, [c.bg]);
  useEffect(() => { trackSessionStart(); }, []);
  // Web: show the page again once the saved game is read (the HTML shell hides the welcome page from returning adults)
  const hydrated = useGame((g) => g.hydrated);
  useEffect(() => {
    if (Platform.OS === "web" && hydrated) requestAnimationFrame(() => document.documentElement.classList.remove("mv-back"));
  }, [hydrated]);
  // Fonts live in assets/fonts, not node_modules: Cloudflare Pages drops any uploaded folder named node_modules
  const [loaded] = useFonts({
    InstrumentSerif_400Regular: require("../../assets/fonts/InstrumentSerif_400Regular.ttf"),
    InstrumentSerif_400Regular_Italic: require("../../assets/fonts/InstrumentSerif_400Regular_Italic.ttf"),
    Figtree_400Regular: require("../../assets/fonts/Figtree_400Regular.ttf"),
    Figtree_600SemiBold: require("../../assets/fonts/Figtree_600SemiBold.ttf"),
    Figtree_800ExtraBold: require("../../assets/fonts/Figtree_800ExtraBold.ttf"),
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.bg }}><SeoHead /></View>;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaProvider>
        <StatusBar style={darkUi ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: c.bg } }} />
        <FoundVia />
        <SeoHead />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
