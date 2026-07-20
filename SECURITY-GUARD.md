# Site guard — domain lock

`guard.js` is a small, transparent script loaded first on every page. It has one
job: make the site refuse to run on any domain that isn't yours, so a casual
copy rehosted elsewhere doesn't just work.

## Honest limits — read this

`guard.js` runs in the visitor's browser. Anyone who has the stolen source can
open the file and delete the check. So this is **deterrence, not access
control.** It stops casual clones and scrapers who rehost your files unmodified.
It does **not** stop anyone who edits the code — and a site downloader captures
the finished page anyway. The real, enforceable remedy for a stolen site is a
**copyright / DMCA takedown** to the clone's web host. Keep dated source (your
git history works) as proof of ownership.

## Setup (required to turn it on)

Out of the box the guard is OFF — it only prints a console warning and never
blocks, so it can't accidentally lock you out of your own site. To enable it,
edit the CONFIG block at the top of `guard.js`:

1. **`ALLOWED_HOSTS`** — replace `'REPLACE_WITH_YOUR_DOMAIN.com'` with your real
   domain(s), e.g. `['bud123567.github.io']` for the GitHub Pages URL. Get this
   right before deploying, or the live site will block itself. `localhost`,
   `127.0.0.1`, and local file previews are always allowed for development.
2. **`CANONICAL_URL`** *(optional)* — set to your real URL to redirect
   unauthorized clones there instead of showing a notice.
3. **`CONTACT_EMAIL`** — shown on the block screen.

## Obfuscated JavaScript (a speed bump, not a lock)

The JavaScript published to the live site is **obfuscated** so it's hard to read.
This is not encryption — the browser has to run the code, so it can be reversed;
it only deters casual snooping. Your **readable source is the root `.js` files**
here — edit those, run `./obfuscate.sh`, then redeploy `dist/`'s output.

## Files

- `guard.js` — the domain-lock guard (edit the CONFIG block at the top).
- `obfuscate.sh` — scrambles the JS into `dist/` for deployment.
- guard is loaded via `<script src="guard.js?...">` in the `<head>` of every page.
