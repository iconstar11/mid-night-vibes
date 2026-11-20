import { Figtree_400Regular, Figtree_600SemiBold, Figtree_800ExtraBold } from "@expo-google-fonts/figtree";
import { InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColors } from "@/theme/tokens";

export default function RootLayout() {
  const c = useColors();
  const [loaded] = useFonts({ InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic, Figtree_400Regular, Figtree_600SemiBold, Figtree_800ExtraBold });
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
