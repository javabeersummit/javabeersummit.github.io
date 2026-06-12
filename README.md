# Java Beer Summit — website

Static site for **javabeersummit.github.io**. No build step, no npm, no framework —
plain HTML/CSS/JS. All content lives in JSON files that developers edit directly.

## How it works

```
index.html          ← current edition (whatever data/manifest.json says is latest)
2025/index.html     ← archive shell (identical copy of index.html)
2024/index.html     ← archive shell
data/manifest.json  ← which editions exist + which is latest
data/<year>.json    ← ALL content for one edition (dates, venue, schedule, sponsors, gallery…)
assets/site.css     ← design (light + dark theme via CSS variables)
assets/site.js      ← reads the JSON for the year in the URL and renders the page
sponsors/*.svg      ← sponsor logos
gallery/<year>/     ← photos for that edition
```

Every `index.html` is **byte-identical** — the JS figures out the year from the URL
(`/` = latest, `/2025/` = archive) and loads the matching JSON.

**Upcoming vs. past is automatic:** the page compares the event `date` to today in the
browser. Up to and including the event day it shows the countdown, CFP and Registration;
from the next day it switches to archive mode (no CTAs, "view photos" instead). You never
have to flip a switch — but `statusOverride: "upcoming" | "past"` in the JSON exists if
you ever need to force it.

## Preview locally

Browsers block `fetch()` from `file://`, so serve the folder over HTTP:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

(Any static server works; run it from the repo root so `/data/...` paths resolve.)

## Common tasks

### Update content for the upcoming event
Edit `data/2026.json` and push. Things you'll likely touch:

- `cfp.url` (speakers — submit a subject + description) / `registration.url`
  (attendees) / `sponsorPackages.formUrl` (partners) — the three **Microsoft Forms
  links**. The CFP + registration cards render in their own "Be part of it" section
  just before the sponsors.
- `cfp.deadline` — after this date the CFP button shows as closed automatically
- `schedule` — empty array shows a "schedule is brewing" placeholder; add entries as
  `{"time": "18:15", "type": "talk" | "lightning" | "break", "title": "...", "speaker": "...", "abstract": "..."}`
- `sponsors` — drop the logo in `/sponsors/` and reference it. `tier` is optional
  (`"gold" | "silver" | "community"`); sponsors without a tier render as one plain grid
  with no tier headings (like 2025).
- `organizers` — same shape as sponsors (name/url/logo); shown as an
  "Organized by" row in the About section.
- `sponsorPackages` — the pricing cards in the Sponsors section. **To hide them once the
  sponsor line-up is settled, just set `"show": false`** (the generic "become a sponsor"
  line takes their place). They only ever appear on upcoming editions, so archives are
  never affected. `"featured": true` on a package gives it the amber border and the
  "most poured" flag. Each card's button points to `sponsorPackages.formUrl` (the
  partners Microsoft Form) if set, otherwise it opens a pre-filled email to
  `sponsorContact`.

### Add a new edition (e.g. 2027)
1. Copy `data/2026.json` → `data/2027.json`, update everything inside.
2. Add `2027` to `data/manifest.json` (`years` array, newest first) and set `"latest": 2027`.
3. Create a folder for the year that just became an archive — it needs a shell so its URL
   works: `mkdir 2026 && cp index.html 2026/index.html`.
4. Push. `/` now shows 2027, `/2026/` is the archive.

### Add photos / videos after an event
1. Export photos at **max ~1600px on the long edge** (there is no build step to resize
   them — what you commit is what people download) and put them in `gallery/<year>/`.
2. List them in that year's JSON under `gallery.photos`; add YouTube videos as
   `{"title": "...", "youtubeId": "abc123"}` in `gallery.videos`.
3. Years without a `gallery` (or with an empty photo list) simply don't show the section.

## Publishing

GitHub Pages for an org site (`javabeersummit/javabeersummit.github.io` repo) serves the
root of the default branch — push to `main` and it's live a minute later. There is
deliberately no CI/build pipeline: what's in the repo is the site.

## Placeholders to replace before launch

- [x] `cfp.url`, `registration.url` and `sponsorPackages.formUrl` in `data/2026.json`
      (Microsoft Forms links) — wired
- [ ] All of `data/2026.json` content except organizers/contact (date, venue, schedule
      and sponsors are dummy), and everything in `data/2024.json` (entirely dummy)
- [ ] `youtubeId` in `data/2025.json`
- [ ] Photos in `gallery/` (SVG placeholders)
- [ ] Sponsor logos: the 2025 set in `/sponsors/` was pulled from the old site/brandfetch
      CDN as stand-ins — swap in the official files when available.
      `bytebrew/hopworks/jvmlabs/cloudkeg/devhive.svg` are
      fake sample logos for the 2026/2024 dummy data.
- [ ] Venue coordinates in the `mapEmbed`/`mapLink` URLs if the venue changes
