# Social media routine and tracker

Same 3 pieces a day on **TikTok, Instagram, Facebook and YouTube**. Some are posted by hand in each platform's studio, some through the APIs (later, possibly scheduled for Claude to post). Everything comes back together in the Excel workbook.

## 1. Number every piece

- Each piece gets the next number: 1, 2, 3, and so on. It keeps that number on every platform.
- The **ref** is the platform plus the number: `tt-12`, `ig-12`, `fb-12`, `yt-12`.
- Write the **short link on the image or video**. Captions on TikTok, Instagram and Shorts can't hold clickable links, but people can type a short one:

| Platform | On the post | Opens |
|---|---|---|
| TikTok | midnightvibes.online/t/12 | `?ref=tt-12` |
| Instagram | midnightvibes.online/i/12 | `?ref=ig-12` |
| Facebook | midnightvibes.online/f/12 | `?ref=fb-12` |
| YouTube | midnightvibes.online/y/12 | `?ref=yt-12` |

- Also put the short link in the **caption** where you can. Then the tracker matches the post automatically.
- **Bio links:** use one per platform, `midnightvibes.online/tt`, `/ig`, `/fb` and `/yt`. They show up as `tt-bio`, `ig-bio` and so on.
- After sign-up, the app asks **"Where did you find us?"**. That catches people who typed the plain address.

## 2. Weekly routine

1. **Batch the week (Sunday):** make 21 pieces, mixing image, carousel and short video. Note the hook and the game featured in each.
2. **Schedule:**
   - **Meta Business Suite:** Facebook and Instagram together.
   - **TikTok Studio** (on the laptop): videos, up to about 10 days ahead. Its scheduler handles videos only, so post photo carousels from the phone.
   - **YouTube Studio:** Shorts. Image or carousel posts in the Shorts feed are still a test, so post them from the phone app.
3. Post at **fixed times** (for example 12:00, 18:00 and 21:00 Kenya time), so time slots can be compared.
4. Add each post to the **Posts** sheet:
   - Type the ref, how it was posted (studio, api or claude), the date and time, the format, the hook and the game.
   - Platform and piece fill in from the ref.

## 3. Weekly numbers (Monday)

1. Export from each platform on the laptop:
   - **TikTok Studio:** Analytics, then Content, then Export data. It only keeps 60 days, so don't skip more than a month.
   - **Meta Business Suite:** Insights, then Content, then Export data. Do Facebook and Instagram.
   - **YouTube Studio:** Analytics, then Advanced mode, then Export, then CSV. Use the `Table data.csv` inside the zip.
2. Put the files in **`data/social/`**. Any file names are fine. Old files can stay, and the newest copy of a post wins.
3. Run:

   ```
   .venv\Scripts\python scripts\export_analytics.py
   ```

   It needs the `.env` key. Use `--demo` to practise on made-up data.
4. Open `data/midnight-vibes-analytics.xlsx`:
   - **Posts:** your rows plus numbers. The grey columns are formulas: views to saves come from Social raw, people from By ref.
   - **Social summary:** results by platform, format, time slot, hook, game and how it was posted. Sort by **sign-ups per 1k views**, because that's what brings players.
   - **By piece:** the same piece side by side on the 4 platforms.
   - **Social raw:** every exported post. If the ref is empty, the post wasn't matched, so add it to Posts.
   - **Found via:** the "Where did you find us?" answers per week.

The script keeps a copy of the last workbook as `*.bak.xlsx`. Close Excel before running it.

## 4. Keep the accounts safe (18+ game)

- All four platforms limit sexual content, and quietly hide accounts that break the rules. **Tease, don't show:**
  - Use card text, reactions, couples laughing and the wheel spinning.
  - Avoid nudity, explicit wording and anything that looks under 18.
- Keep the spiciest cards for inside the app. Posts sell the mood, not the details.
- If a platform flags a post, note it in the Posts `notes` column, so we can learn what to avoid.

## 5. Later: API posting

Plan only for now. A queue file `data/social/queue.csv` lists piece, platform, file, caption and time. A poster script would publish due rows, write the link back into Posts (`posted via = api`) and pull the numbers by API. Each platform needs an app review first:

- **TikTok:** posts stay private until TikTok audits the app.
- **Meta:** needs a business account linked to a Facebook Page.
- **YouTube:** has a daily upload quota, and uploads stay private until Google verifies the app.
