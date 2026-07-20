# Site guard — domain lock + remote kill-switch

This site ships with `guard.js`, a small transparent protection layer that
targets one scenario: **someone copies these files and serves them from their
own domain.** It is loaded first on every page.

It does two things:

1. **Domain lock** — the site refuses to run on any hostname that isn't yours.
2. **Remote kill-switch** — a flag you host and can flip to take the site (and
   any clone still pointing at your flag) dark on demand.

## Honest limits — read this

`guard.js` runs in the visitor's browser. Anyone who has the stolen source can
open the file and delete the check. So this is **deterrence, not access
control.** It stops:

- casual clones and scrapers who rehost your files unmodified,
- an ex-contractor / anyone who grabbed the folder and put it online as-is.

It does **not** stop a determined thief who edits the JavaScript. There is no
way to truly prevent that for a static site — the real, enforceable remedy for
a stolen site is a **copyright / DMCA takedown** to the clone's web host. Keep a
copy of your source with dates as proof of ownership.

There is no "hidden login." A secret login embedded in browser-visible code
would be readable by anyone and would be a security hole, not a protection.

## Setup (required to turn it on)

**Out of the box the guard is OFF** — it only prints a console warning and never
blocks anything, so it cannot accidentally lock you out of your own site. To
enable it, edit the CONFIG block at the top of `guard.js`:

1. **`ALLOWED_HOSTS`** — replace `'REPLACE_WITH_YOUR_DOMAIN.com'` with your real
   domain. Include both apex and www if you use both, e.g.:
   ```js
   var ALLOWED_HOSTS = ['commonplatehg.com', 'www.commonplatehg.com'];
   ```
   `localhost`, `127.0.0.1`, and local file previews are always allowed for dev.
   Subdomains of an allowed host (e.g. `staging.commonplatehg.com`) also pass.

2. **`CONTACT_EMAIL`** — the address shown on the block screen. Set it to a real
   inbox.

3. **`CANONICAL_URL`** *(optional)* — set to your real URL (e.g.
   `'https://www.commonplatehg.com'`) to *redirect* unauthorized clones there
   instead of showing a notice. Leave `''` to show the notice.

**Double-check the domain before deploying.** If you enable enforcement with the
wrong domain, your own live site will block itself.

## Remote kill-switch (optional)

To be able to take the site down remotely:

1. Host `status.json` somewhere you control at a stable URL. It can live on your
   own domain, or on any static host / gist you own. Contents:
   ```json
   { "enabled": true, "title": "Temporarily unavailable", "message": "..." }
   ```
2. Set **`STATUS_URL`** in `guard.js` to that URL.
3. To take the site dark, change `"enabled"` to `false` and re-upload
   `status.json`. To bring it back, set it to `true`.

Behavior on your allowed domain is **fail-open**: if the flag can't be fetched,
the site keeps working. It only goes dark when the flag explicitly says
`"enabled": false`. Because a clone that still points at your `STATUS_URL` reads
the same flag, flipping it also kills those clones.

## Files

- `guard.js` — the guard (edit the CONFIG block at the top).
- `status.json` — sample remote flag; host your own copy and set `STATUS_URL`.
- guard is loaded via `<script src="guard.js?...">` in the `<head>` of every page.
