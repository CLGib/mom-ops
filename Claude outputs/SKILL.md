---
name: mary-b-austin-pta-materials
description: "Create Mary B. Austin Elementary PTA branded materials as print-ready PDFs and graphics (SOPs, tri-fold pamphlets, recruitment brochures, volunteer flyers, one-page handouts, board reports, sign-up sheets, print-and-cut badges, membership thermometers). Use whenever a Mary B. Austin / MBA PTA parent or committee lead asks to make any PTA document, flyer, pamphlet, brochure, SOP, handout, badge, board report, or membership graphic, even if they don't say 'branded' or name a file type."
---

# Mary B. Austin PTA Materials

This skill makes polished, on-brand, print-ready materials for the Mary B. Austin
Elementary PTA. Everything is built as HTML/CSS and rendered to PDF (or PNG) so it
looks designed, prints cleanly on a normal school printer, and stays consistent
no matter which parent asks for it.

The goal is that any volunteer can describe what they need in plain words ("I need
a Fall Festival volunteer flyer," "an SOP for the book fair," "a tri-fold to
recruit committee members") and get back something that looks like it came from
the same design studio as everything else the PTA hands out.

## How to work

1. **Get the content first.** Ask the volunteer for the real details (dates,
   steps, who to contact, what the event is). If they dictate rough notes, that
   is fine; tighten the wording yourself into warm, clear, parent-friendly copy.
2. **Pick the document type** from the recipes below.
3. **Build the HTML** using the shared brand CSS, then render to PDF with
   Playwright (or to PNG for a share graphic like a thermometer).
4. **Verify** (page count, no em dashes) and deliver the file.

Do not read the skill top to bottom before starting. Skim, find the recipe that
matches, and go.

## The brand system

Put this exact palette and these fonts on every piece. This is what makes
everything feel like one family.

**Colors (CSS custom properties):**
```
--navy:#1F3864;  --blue:#2E5496;  --red:#a14a3f;  --red-deep:#7a3830;
--gold:#E1A93B;  --gold-deep:#b9841f;  --ink:#23231f;  --soft:#54504a;
--muted:#8a8579;  --line:#e5e2dc;  --cream:#faf8f4;
```
Navy is the primary (headlines, key numbers). Gold is the accent (rules, dots,
highlights, the "goal" flag). Clay red is the eyebrow/label color. Cream is the
only fill tint. Backgrounds stay white.

**Fonts (Google Fonts):** Fraunces (serif, for headlines and big numbers), Inter
(body), JetBrains Mono (labels, eyebrows, small caps details). Load with:
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Inter:wght@300..700&family=JetBrains+Mono:wght@400..600&display=swap" rel="stylesheet">
```

**Tagline (footer of most pieces):** `Rooted in Excellence · Buzzing with Innovation`

**The tricolor cap.** A thin red/gold/navy stripe across the very top of every
page ties the brand together:
```css
.cap3{position:absolute;top:0;left:0;right:0;height:9px;
  background:linear-gradient(90deg,var(--red) 0 33.3%,var(--gold) 33.3% 66.6%,var(--navy) 66.6% 100%);}
```

**Logos and mascot.** Two images belong to this brand: the official MBA PTA
**tree logo** and the friendly **bee mascot**. The skill cannot ship them, so ask
the volunteer to upload them once, then embed each as a base64 data URI so the PDF
is self-contained. If they are not available, use a clean text-only masthead (the
tricolor cap plus the eyebrow and Fraunces headline still reads as on-brand). Keep
a copy of whatever they send for reuse.

**Shared contact.** The PTA volunteer email is `marybaustinvolunteer@gmail.com`.
Put it on recruitment and volunteer pieces.

## Hard rules

These are the things that quietly break the "designed" feeling if you miss them:

- **No em dashes anywhere.** Use commas, periods, or the word "and." After
  building, check with `grep -c "—" file.html` and confirm it returns 0. (Em
  dashes are the number-one tell that copy was not hand-finished.)
- **Printer-friendly: white backgrounds, no solid color fields behind big areas.**
  The school's color printer is weak, so heavy ink coverage looks muddy and wastes
  toner. Use thin accent stripes, outlines, and small cream tints instead of full
  color blocks.
- **QR codes are pure black on white** so they always scan after printing.
- **Warm, human copy.** Short sentences, encouraging tone, second person ("you").
  These go home to busy families; make them feel welcomed, not managed.

## Building and rendering

Author each piece as one self-contained HTML file, then render with Playwright.
This Python pattern works for every letter-size PDF:

```python
from playwright.sync_api import sync_playwright
import pathlib
src = pathlib.Path("piece.html").resolve().as_uri()
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.goto(src); pg.wait_for_timeout(2500)   # let Google Fonts load
    pg.pdf(path="out.pdf", prefer_css_page_size=True, print_background=True)
    b.close()
```

For a share graphic (thermometer, social image), screenshot a `.card` element
instead of printing, at `device_scale_factor=2` for crispness. If Playwright or a
font is missing, install it (`pip install playwright --break-system-packages` then
`playwright install chromium`). Build the HTML as a Python f-string and double the
CSS braces (`{{ }}`) so they survive formatting.

**Base CSS to start every letter-size piece** (tune paddings per piece):
```css
:root{--navy:#1F3864;--blue:#2E5496;--red:#a14a3f;--red-deep:#7a3830;--ink:#23231f;
  --soft:#54504a;--muted:#8a8579;--gold:#E1A93B;--gold-deep:#b9841f;--line:#e5e2dc;--cream:#faf8f4;}
*{box-sizing:border-box;margin:0;padding:0;}
@page{size:8.5in 11in;margin:0;}
body{font-family:'Inter',sans-serif;color:var(--ink);background:#fff;}
.page{width:8.5in;height:11in;padding:0.6in 0.72in 0.5in 0.72in;position:relative;}
.cap3{position:absolute;top:0;left:0;right:0;height:9px;
  background:linear-gradient(90deg,var(--red) 0 33.3%,var(--gold) 33.3% 66.6%,var(--navy) 66.6% 100%);}
.masthead{display:flex;align-items:center;gap:15px;border-bottom:2px solid var(--line);
  padding-bottom:11px;margin-bottom:14px;}
.masthead img{width:1.05in;flex:0 0 auto;}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:7.6pt;letter-spacing:0.15em;
  text-transform:uppercase;color:var(--red);font-weight:600;}
h1{font-family:'Fraunces',serif;font-weight:600;font-size:22pt;line-height:1.02;
  letter-spacing:-0.02em;color:var(--navy);margin-top:3px;}
.lab{font-family:'JetBrains Mono',monospace;font-size:7.8pt;letter-spacing:0.14em;
  text-transform:uppercase;color:var(--gold-deep);font-weight:600;margin:15px 0 7px 0;
  display:flex;align-items:center;gap:8px;}
.lab:before{content:"";width:16px;height:2px;background:var(--gold);}
p{font-size:9.8pt;line-height:1.48;color:var(--soft);} p b{color:var(--ink);font-weight:700;}
ul{list-style:none;margin-top:4px;}
ul li{font-size:9.6pt;line-height:1.4;color:var(--soft);padding-left:16px;position:relative;margin-bottom:6px;}
ul li:before{content:"";position:absolute;left:0;top:5px;width:7px;height:7px;background:var(--gold);border-radius:50%;}
ul li b{color:var(--ink);font-weight:700;}
.callout{background:var(--cream);border-left:4px solid var(--gold);border-radius:6px;padding:11px 15px;margin-top:8px;}
.foot{position:absolute;left:0.72in;right:0.72in;bottom:0.42in;border-top:1.5px solid var(--line);
  padding-top:9px;display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;
  font-size:7.2pt;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);}
```

Reusable pieces: `.masthead` (logo + eyebrow + h1), `.lab` (gold section label),
numbered `.step` circles, `.callout` (cream note), simple tables with a navy
header rule. Keep pieces to one or two pages; verify with a page count.

## Document recipes

### One-page SOP / handout / flyer
Masthead, a one-line "the idea" callout, then the content as numbered steps or
gold-labeled sections. Good for committee SOPs, volunteer training flyers, event
one-pagers. A numbered step:
```html
<div class="step"><div class="n">1</div><h3>Title</h3><p>What to do.</p></div>
```
with `.step{position:relative;padding-left:40px;margin-bottom:12px;}` and
`.step .n{position:absolute;left:0;top:-2px;width:27px;height:27px;border-radius:50%;
background:var(--navy);color:#fff;font-family:'Fraunces',serif;font-weight:600;font-size:12pt;
display:flex;align-items:center;justify-content:center;}`. Close with a bee "the
heart of it" note when it is a volunteer-facing piece.

### Tri-fold pamphlet (recruitment / event brochure)
Landscape letter, three panels per side, printed double-sided:
```css
@page{size:11in 8.5in;margin:0;}
.sheet{display:flex;}
.panel{width:3.66in;height:8.5in;padding:0.42in 0.34in;position:relative;overflow:hidden;}
.panel.fold{border-right:1px dashed var(--line);}
```
Build two `.sheet` blocks (outside and inside). Front cover: bee mascot + tree
logo + big Fraunces title. Inside panels: "what the PTA does," steps to join, and
a QR row. Back cover: a "sign up / join" QR to the membership store. Each panel
gets a small tricolor cap at the top for rhythm.

### Two-QR row (volunteer flyers and pamphlets)
Standard on volunteer pieces: one QR to **join the PTA** (membership store), one
to **sign up / survey**, with the shared email beneath. Generate QR codes pure
black-on-white with the `qrcode` Python library:
```python
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask
img = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=2)
img.add_data("https://mbaustin.givebacks.com/shop"); img.make(fit=True)
img.make_image(image_factory=StyledPilImage, module_drawer=RoundedModuleDrawer(),
  color_mask=SolidFillColorMask(front_color=(31,56,100), back_color=(255,255,255))).save("qr.png")
```
Ask the volunteer for the exact store and survey URLs.

### Board report / internal proposal
Masthead, a bordered "the ask" box up top, gold-labeled sections (why now, why it
matters, what we are asking), a simple table if there are options or prices, and a
cream "motion" box for anything the board votes on. Keep it to one page.

### Membership thermometer / rally graphic
A share graphic (render to PNG). Draw a classic thermometer in inline SVG: a
rounded tube plus a bulb, a cream empty track, a navy-to-blue gradient fill, a
gold "GOAL" flag at the top, and scale ticks. Fill height maps the current count
to the goal. Pair it with a big Fraunces number, a "N to go" gold pill, and an
encouraging line. To compute the fill: pick a top and bottom Y for the tube, and
`fillTopY = bottomY - (current/goal) * (bottomY - topY)`. Always compute counts
from the real membership export (count active rows; a CSV read with
`encoding='utf-8-sig'` handles the byte-order mark).

## Deliver

Send the finished PDF (or PNG). Keep the wording warm and the layout calm: this is
for tired parents at pickup, not a corporate audience. Offer one or two natural
follow-ups (a matching badge sheet, a candy-donation flyer, a print-poster size).