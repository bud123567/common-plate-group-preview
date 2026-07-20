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

There is no "hidden login." A secret password embedded in browser-visible code
would be readable by anyone and would be a security hole, not a protection. The
admin console (below) instead uses your GitHub access token as the credential —
a real key that only you hold — so nothing secret lives in the code.

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

## Admin console — blank / restore the site from a page

`admin.html` is a self-serve control panel that flips `status.json` for you, so
you don't have to edit files by hand. It's already wired to this repo.

Open it at:
`https://bud123567.github.io/common-plate-group-preview/admin.html`
(It's left out of the site navigation and marked `noindex`, but it is a public
URL — its security rests entirely on the token, not on the URL being secret.)

**Signing in — two steps.**

1. **Username + password.** Default: `caleb443` / `buddy123`. This is a
   *convenience gate* only — it lives in browser-visible code, so treat it as
   "keeps casual people out," not real security. The password is stored **hashed**
   (SHA-256) in `admin.js`, not in plain text. To change it, replace `PASS_SHA256`
   with the hash of your new password:
   `printf '%s' 'yourNewPassword' | shasum -a 256`
2. **Connect GitHub (one time).** After signing in, paste a GitHub access token —
   the *real* key that can change your live site. Create one at
   **GitHub → Settings → Developer settings → Fine-grained tokens** (only the
   `common-plate-group-preview` repo, permission **Contents → Read and write**).
   It's saved on your device and reused next time, so day to day you just enter
   the username and password. The token is never committed to the repo.

Use "Forget GitHub token on this device" on any machine that isn't yours.

**Using it.** "Blank the site" sets the kill-switch to offline; "Restore site"
turns it back on. `admin.html` does **not** load `guard.js`, so blanking the
site never blanks the admin page — you can always get back in to restore.

**Propagation.** `guard.js` reads the flag straight from the repo (via
`raw.githubusercontent.com`), so no Pages rebuild is needed. Changes reach fresh
visits within a couple of minutes (CDN caching) and already-open tabs within
`POLL_MS` (5 min by default).

**Blast radius.** Anyone with that token can blank/restore the site — that's the
whole login. If it ever leaks, revoke it on GitHub and generate a new one; the
old one instantly stops working.

## Obfuscated JavaScript (a speed bump, not a lock)

The JavaScript published to the live site is **obfuscated** (scrambled variable
names + base64-encoded strings) so it's hard to read at a glance. Be clear on
what this is and isn't:

- **It is not encryption.** The browser has to run the code, so anyone
  determined can reverse it. It only deters casual snooping.
- **Your readable source is the root `.js` files** here (`guard.js`, `admin.js`,
  `script.js`) — edit those. `obfuscate.sh` scrambles them into `dist/`, which is
  what gets deployed. To change the admin password or any config: edit the
  readable root file, run `./obfuscate.sh`, then redeploy `dist/`'s JS.
- **Keep this folder backed up.** The readable source is intentionally NOT in the
  public repo — only the obfuscated version is. Older commits in the repo history
  still contain the pre-obfuscation readable code; fully scrubbing that would mean
  rewriting git history and isn't worth it for the protection it (doesn't) add.

## Files

- `guard.js` — the guard + kill-switch reader (edit the CONFIG block at the top).
- `status.json` — the kill-switch flag; flipped by the admin page.
- `admin.html` / `admin.js` — the admin console (login + blank/restore).
- guard is loaded via `<script src="guard.js?...">` in the `<head>` of every page
  **except** `admin.html`.
