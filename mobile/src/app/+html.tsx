import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";
import type { PropsWithChildren } from "react";

import { SHARE_IMAGE } from "@/lib/seo";

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
        {/* Each page sets its own title, description and canonical link (components/SeoHead) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Midnight Vibes" />
        <meta property="og:image" content={SHARE_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Midnight Vibes: Truth or Dare, Spin the Wheel and Wheel of Misfortune for adults" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="rating" content="adult" />
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
        {/* Someone who already said they're 18: hide the welcome page (in the HTML for search engines) until the app
            has loaded and sent them on, so it doesn't flash. The app removes the class once it has read the saved game. */}
        <style dangerouslySetInnerHTML={{ __html: "html.mv-back #root{visibility:hidden}" }} />
        <script dangerouslySetInnerHTML={{ __html: "try{if(/\"adult\":true/.test(localStorage.getItem('mv.game')||''))document.documentElement.classList.add('mv-back')}catch(e){}" }} />
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
