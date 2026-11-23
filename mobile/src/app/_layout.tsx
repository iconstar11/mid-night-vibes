import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColors } from "@/theme/tokens";

export default function RootLayout() {
  const c = useColors();
  // Fonts live in assets/fonts, not node_modules: Cloudflare Pages drops any uploaded folder named node_modules
  const [loaded] = useFonts({
    InstrumentSerif_400Regular: require("../../assets/fonts/InstrumentSerif_400Regular.ttf"),
    InstrumentSerif_400Regular_Italic: require("../../assets/fonts/InstrumentSerif_400Regular_Italic.ttf"),
    Figtree_400Regular: require("../../assets/fonts/Figtree_400Regular.ttf"),
    Figtree_600SemiBold: require("../../assets/fonts/Figtree_600SemiBold.ttf"),
    Figtree_800ExtraBold: require("../../assets/fonts/Figtree_800ExtraBold.ttf"),
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: c.bg } }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
