import { router } from "expo-router";

import { GateView } from "@/components/Gate";

/** 18+ age gate: the app's start page */
export default function Gate() {
  return <GateView onConfirm={() => router.replace("/group")} />;
}
