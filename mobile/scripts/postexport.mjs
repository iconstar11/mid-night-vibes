// After `expo export -p web`: give Cloudflare Pages a real 404 page.
// Without dist/404.html, Pages answers every missing path with the homepage (status 200). If that happens to a
// script during a deploy, the edge can cache the HTML under the script's name for a year (immutable), and the site
// breaks. With a 404 page, missing files get a 404 instead, which is never cached as immutable.
import { copyFileSync, existsSync } from "node:fs";

const src = "dist/+not-found.html";
if (!existsSync(src)) { console.error("postexport: dist/+not-found.html missing"); process.exit(1); }
copyFileSync(src, "dist/404.html");
console.log("postexport: wrote dist/404.html");
