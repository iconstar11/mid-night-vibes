"""Draws the 1200x630 share image (mobile/public/og.png) shown when the site is linked on WhatsApp, X, Facebook etc."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent / "mobile"
F = ROOT / "assets" / "fonts"
W, H = 1200, 630
BG, INK, MUTED, WINE, ROSE, BRASS = "#1F0A14", "#F7E1E4", "#C29AA6", "#A33256", "#E07A8C", "#D9AE4B"

img = Image.new("RGB", (W, H), BG)
glow = Image.new("RGB", (W, H), BG)
g = ImageDraw.Draw(glow)
g.ellipse((-200, -380, 900, 420), fill="#5A1832")
g.ellipse((760, 300, 1500, 900), fill="#3E1028")
img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(140)), 1)
d = ImageDraw.Draw(img)

serif = ImageFont.truetype(str(F / "InstrumentSerif_400Regular.ttf"), 150)
italic = ImageFont.truetype(str(F / "InstrumentSerif_400Regular_Italic.ttf"), 150)
heavy = ImageFont.truetype(str(F / "Figtree_800ExtraBold.ttf"), 26)
body = ImageFont.truetype(str(F / "Figtree_600SemiBold.ttf"), 38)
small = ImageFont.truetype(str(F / "Figtree_400Regular.ttf"), 28)

x = 90
# 18+ seal
d.ellipse((x, 70, x + 84, 154), outline=BRASS, width=3)
tw = d.textlength("18+", font=heavy)
d.text((x + 42 - tw / 2, 97), "18+", font=heavy, fill=BRASS)
d.text((x + 110, 98), "PARTY GAMES FOR ADULTS", font=heavy, fill=BRASS)

d.text((x - 6, 170), "Midnight", font=serif, fill=INK)
d.text((x - 6, 300), "Vibes", font=italic, fill=ROSE)

d.text((x, 470), "Truth or Dare  ·  Spin the Wheel  ·  Wheel of Misfortune", font=body, fill=INK)
d.text((x, 528), "Free for couples, friends and parties. No download.  midnightvibes.online", font=small, fill=MUTED)

# a small wheel on the right
cx, cy, r = 980, 250, 150
cols = [WINE, "#6B2A50", ROSE, "#4E1D3A"]
for i in range(8):
    d.pieslice((cx - r, cy - r, cx + r, cy + r), i * 45 - 90, (i + 1) * 45 - 90, fill=cols[i % 4], outline=BG, width=4)
d.ellipse((cx - 26, cy - 26, cx + 26, cy + 26), fill=BRASS)
d.polygon([(cx - 16, cy - r - 30), (cx + 16, cy - r - 30), (cx, cy - r + 6)], fill=BRASS)

out = ROOT / "public" / "og.png"
img.save(out, optimize=True)
print(out, out.stat().st_size // 1024, "KB")
