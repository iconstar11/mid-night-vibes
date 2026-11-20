import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";
import type { PropsWithChildren } from "react";

// Web only: the HTML shell for every page of the static export.
// Adds the PWA manifest, icons and theme colour so the site can be installed like an app.
export default function Root({ children }: PropsWithChildren) {
  // Expo SDK 58: the app's scripts, styles and fonts arrive as head/body nodes and must be rendered here
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Midnight Vibes</title>
        <meta name="description" content="Free adult party games for couples, friends, girls' night and boys' night: truth or dare and spin the wheel, tailored by AI to your mood. No download, no sign-up." />
        <link rel="canonical" href="https://midnightvibes.online/" />
        <meta property="og:title" content="Midnight Vibes" />
        <meta property="og:url" content="https://midnightvibes.online/" />
        <meta name="theme-color" content="#7A1F3D" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Midnight Vibes" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: "body{background:#F7E6E4}@media (prefers-color-scheme: dark){body{background:#1F0A14}}" }} />
        {/* Chrome can offer installing before the app's code loads: keep the offer for the Install button */}
        <script dangerouslySetInnerHTML={{ __html: "addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__mvInstall=e;dispatchEvent(new Event('mv-installable'))})" }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
