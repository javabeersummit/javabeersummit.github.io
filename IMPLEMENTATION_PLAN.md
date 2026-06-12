# JavaBeerSummit site — architecture decisions

(Original plan proposed Astro + Tailwind with a GitHub Actions pipeline. Superseded by
the decisions below; `README.md` is the living doc for how the site works.)

## Decisions

1. **No build step / no framework.** Plain HTML + CSS + vanilla JS. Astro was considered
   and rejected as overkill: the team wanted zero toolchain maintenance, no CI pipeline,
   and direct JSON editing. Trade-offs accepted: content is rendered client-side (brief
   empty-page flash, JS required), gallery photos must be resized by hand before commit,
   and JSON typos surface only in the browser.

2. **Org page, no base path.** Hosted as `javabeersummit/javabeersummit.github.io`;
   absolute URLs (`/assets/...`, `/data/...`) everywhere. Pages serves the repo root of
   the default branch — push = deploy.

3. **One JSON per edition** (`data/<year>.json`) holds all per-year content: date, venue,
   schedule, sponsors, CFP/registration links, gallery. `data/manifest.json` lists the
   editions and which is latest.

4. **Year routing via identical shells.** `/` is the latest edition; `/<year>/` are
   archives. Every `index.html` is a byte-identical copy; `assets/site.js` derives the
   year from the URL path. Adding a year = new JSON + manifest entry + copied folder.

5. **Upcoming/past computed in the browser** from the event date (with a
   `statusOverride` escape hatch), so the site flips to archive mode the day after the
   event without anyone touching it. Upcoming editions show countdown + CFP +
   Registration (Microsoft Forms links); past editions show an archive banner and the
   gallery CTA instead.

6. **Theming:** light ("summer afternoon") / dark ("evening at the bar") via CSS custom
   properties, `prefers-color-scheme` default, manual toggle persisted in localStorage,
   no-flash inline script in `<head>`.

7. **Media:** photos committed per year under `gallery/<year>/` (pre-resized, ≤1600px);
   videos are YouTube embeds referenced by ID in the JSON. Editions without media simply
   omit the gallery section.

## Possible later iterations

Speaker profiles, BG/EN language toggle, `.ics` download, newsletter signup, a tiny
optional script to resize photos, JSON schema check as a pre-commit hook.
