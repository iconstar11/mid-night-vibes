// Social short links land here (midnightvibes.online/t/12 -> /go/tt-12). The code is read from the address when
// the app starts (trackSessionStart in lib/track.ts); this page just sends people on to the start.
import { Redirect } from "expo-router";

export default function Go() {
  return <Redirect href="/" />;
}
