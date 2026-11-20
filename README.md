# Midnight Vibes

**https://midnightvibes.online**

18+ party game for couples and groups: Truth or Dare and Spin the Wheel at three heat levels, both tailored by AI to the mood you set.

## Run locally

Double-click `start.bat`, or:

```
npm install
node server.js
```

Then open http://localhost:5500

## AI mood

Set a mood (like "kissing") in either game and Claude writes new truths, dares and wheel wedges for it. This uses Claude through the server, so your API key never reaches the browser.
Create a file named `.env` next to `server.js`:

```
ANTHROPIC_API_KEY=your-key-here
```

`start.bat` loads it automatically. Without a key, or when `index.html` is opened directly,
the games use built-in cards that match the mood instead.

## Install as an app

The site is a Progressive Web App. On Android and desktop Chrome or Edge, the **Install** button on the
home screen adds it like a normal app. On iPhone, the button shows how to use Safari's
Share → Add to Home Screen. Installing needs HTTPS (or localhost).

When you change `index.html`, bump `VERSION` in `sw.js` so installed copies update.
