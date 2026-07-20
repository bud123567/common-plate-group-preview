/*
 * guard.js — transparent domain-lock + remote kill-switch
 * -------------------------------------------------------
 * Goal: if someone copies these files and serves them from THEIR domain,
 * the site refuses to run there. And you keep a remote flag you can flip
 * to take a clone (or your own site) dark on demand.
 *
 * This is NOT a hidden backdoor and NOT real access control. It runs in the
 * browser, so a determined thief with the source can edit it out. It stops
 * casual clones, scrapers, and "someone rehosted my files" — nothing more.
 * The real remedy for theft is a copyright/DMCA takedown to their host.
 *
 * SAFE BY DEFAULT: while ALLOWED_HOSTS still contains the placeholder below,
 * the guard only WARNS in the console and never blocks anything — so it can't
 * accidentally lock you out of your own site. Enforcement turns on the moment
 * you replace the placeholder with your real domain(s).
 */
(function () {
  'use strict';

  /* ============================ CONFIG ============================ */

  // The domain(s) this site is allowed to run on. Replace the placeholder
  // with your real production domain. Add www + apex if you use both.
  // localhost / 127.0.0.1 / file previews are always allowed for development.
  var ALLOWED_HOSTS = [
    'REPLACE_WITH_YOUR_DOMAIN.com'
  ];

  // Optional: send unauthorized clones somewhere instead of showing a notice.
  // e.g. 'https://www.yourdomain.com'  — leave '' to just show the block screen.
  var CANONICAL_URL = '';

  // Optional remote kill-switch. Host a small JSON file somewhere you control
  // (see status.json). When it returns {"enabled": false} the site goes dark,
  // even on your allowed domain — and so does any clone that still points here.
  // Leave '' to disable the remote check.
  var STATUS_URL = '';

  // Shown on the block screen so real visitors can reach you.
  var CONTACT_EMAIL = 'info@commonplatehg.com';

  /* ========================== END CONFIG ========================= */

  var PLACEHOLDER = 'REPLACE_WITH_YOUR_DOMAIN.com';
  var enforcing = ALLOWED_HOSTS.indexOf(PLACEHOLDER) === -1 && ALLOWED_HOSTS.length > 0;

  var host = (location.hostname || '').toLowerCase();
  var isDev =
    location.protocol === 'file:' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '' ||
    host === '::1';

  var hostAllowed = isDev || ALLOWED_HOSTS.some(function (h) {
    h = String(h).toLowerCase();
    return host === h || host.slice(-(h.length + 1)) === '.' + h;
  });

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  // Hide page content immediately (before styles/paint) so a clone doesn't
  // flash the real site before the block screen appears.
  function hideNow() {
    try {
      var s = document.createElement('style');
      s.id = 'guard-hide';
      s.textContent = 'body{visibility:hidden !important}';
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  function block(title, message) {
    var hide = document.getElementById('guard-hide');
    if (hide) hide.remove();

    var overlay = document.createElement('div');
    overlay.setAttribute('role', 'alert');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:24px', 'background:#111', 'color:#f5f5f5',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      'text-align:center', 'line-height:1.5'
    ].join(';');

    var card = document.createElement('div');
    card.style.cssText = 'max-width:32rem';

    var h = document.createElement('h1');
    h.style.cssText = 'font-size:1.6rem;margin:0 0 .75rem;font-weight:600';
    h.textContent = title;

    var p = document.createElement('p');
    p.style.cssText = 'margin:0 0 1rem;opacity:.85';
    p.textContent = message;

    var mail = document.createElement('a');
    mail.href = 'mailto:' + CONTACT_EMAIL;
    mail.textContent = CONTACT_EMAIL;
    mail.style.cssText = 'color:#9ecbff';

    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(mail);
    overlay.appendChild(card);

    // Remove the real page so its content isn't in the DOM behind the overlay.
    if (document.body) {
      document.body.innerHTML = '';
      document.body.appendChild(overlay);
    } else {
      onReady(function () {
        document.body.innerHTML = '';
        document.body.appendChild(overlay);
      });
    }
    document.title = title;
  }

  // --- 1. Domain lock ---------------------------------------------------
  if (enforcing && !hostAllowed) {
    if (CANONICAL_URL) {
      location.replace(CANONICAL_URL);
      return;
    }
    hideNow();
    onReady(function () {
      block(
        'This site has moved',
        'This appears to be an unauthorized copy. Please visit the official Common Plate Hospitality Group website. If you believe this is a mistake, get in touch:'
      );
    });
    return;
  }

  if (!enforcing) {
    // Still in safe/report-only mode — remind whoever set this up to finish.
    try {
      console.warn(
        '[guard] Domain lock is OFF. Set ALLOWED_HOSTS in guard.js to your ' +
        'real domain to enable it. (Currently the site runs on any domain.)'
      );
    } catch (e) {}
  }

  // --- 2. Remote kill-switch -------------------------------------------
  // Fails OPEN on your allowed domain: if the flag can't be fetched, the site
  // keeps working. It only goes dark when the flag explicitly says disabled.
  if (STATUS_URL) {
    fetch(STATUS_URL, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.enabled === false) {
          onReady(function () {
            block(
              data.title || 'Temporarily unavailable',
              data.message || 'This site is currently offline. Please check back soon.'
            );
          });
        }
      })
      .catch(function () { /* fail open — do nothing */ });
  }
})();
