/*
 * admin.js — site control console for admin.html
 * ----------------------------------------------
 * Flow:
 *   1. Username + password gate (caleb443 / hash below). This is a CONVENIENCE
 *      gate only: it lives in browser-visible code, so anyone technical can read
 *      or bypass it. It keeps casual people out, nothing more.
 *   2. A GitHub access token (entered once, saved on this device) is the REAL
 *      credential — it's the only thing GitHub will accept to change the live
 *      site. The token is never committed to the repo; it stays in your browser.
 *
 * To change the login password, replace PASS_SHA256 with the SHA-256 of the new
 * password:  printf '%s' 'yourNewPassword' | shasum -a 256
 *
 * admin.html deliberately does NOT load guard.js, so blanking the site never
 * blanks this page — you can always sign in and restore.
 */
(function () {
  'use strict';

  /* ---- login gate ---- */
  var USERNAME = 'caleb443';
  var PASS_SHA256 = '4a4526e21ca8db9f318f158116b7e2b56b0b816e556c0ac7f798dbc157c5e589'; // sha256('buddy123')

  /* ---- repo ---- */
  var OWNER = 'bud123567';
  var REPO = 'common-plate-group-preview';
  var BRANCH = 'main';
  var FILE = 'status.json';
  var API = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + FILE;
  var TOKEN_KEY = 'cpg_admin_token';
  var UNLOCK_KEY = 'cpg_admin_unlocked';

  var $ = function (id) { return document.getElementById(id); };

  /* ---- storage ---- */
  function getToken() { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(t, remember) { (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); }
  function isUnlocked() { return sessionStorage.getItem(UNLOCK_KEY) === '1'; }
  function setUnlocked(v) { v ? sessionStorage.setItem(UNLOCK_KEY, '1') : sessionStorage.removeItem(UNLOCK_KEY); }

  /* ---- helpers ---- */
  function sha256hex(str) {
    var bytes = new TextEncoder().encode(str);
    return crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    });
  }
  function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64decode(b64) { return decodeURIComponent(escape(atob(b64.replace(/\s/g, '')))); }
  function headers(token) { return { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' }; }

  function httpError(status) {
    var map = {
      401: 'Invalid or expired GitHub token.',
      403: 'GitHub token rejected (needs Contents: Read and write on this repo).',
      404: 'Repo or file not found for this token (check the repo permission).',
      409: 'The flag changed under you — try again.'
    };
    return new Error(map[status] || ('GitHub API error (' + status + ').'));
  }

  /* ---- GitHub API ---- */
  function getStatus(token) {
    return fetch(API + '?ref=' + BRANCH + '&t=' + Date.now(), { cache: 'no-store', headers: headers(token) })
      .then(function (r) { if (!r.ok) throw httpError(r.status); return r.json(); })
      .then(function (data) {
        var flag; try { flag = JSON.parse(b64decode(data.content)); } catch (e) { flag = { enabled: true }; }
        return { flag: flag, sha: data.sha };
      });
  }
  function putStatus(token, flag, sha, commitMsg) {
    return fetch(API, {
      method: 'PUT',
      headers: Object.assign(headers(token), { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        message: commitMsg,
        content: b64encode(JSON.stringify(flag, null, 2) + '\n'),
        sha: sha, branch: BRANCH
      })
    }).then(function (r) { if (!r.ok) throw httpError(r.status); return r.json(); });
  }

  /* ---- views ---- */
  function show(view) {
    ['login', 'setup', 'console'].forEach(function (v) {
      $(v).classList.toggle('hidden', v !== view);
    });
  }
  function setMsg(id, text, isErr) {
    var el = $(id); el.textContent = text || '';
    el.className = 'msg' + (text ? (isErr ? ' err' : ' ok') : '');
  }
  function setBadge(enabled) {
    var b = $('badge');
    if (enabled === false) { b.textContent = 'OFFLINE'; b.className = 'status-badge dark'; }
    else { b.textContent = 'LIVE'; b.className = 'status-badge live'; }
  }

  // Decide where to land after the password gate.
  function enter() {
    setUnlocked(true);
    if (getToken()) { show('console'); refreshBadge(); }
    else { show('setup'); }
  }

  function refreshBadge() {
    setBadge(true);
    getStatus(getToken()).then(function (s) {
      setBadge(s.flag.enabled !== false);
      if (s.flag.message) $('message').value = s.flag.message;
    }).catch(function (e) {
      // Token no longer works — send back to the connect step.
      clearToken(); setMsg('setupMsg', e.message, true); show('setup');
    });
  }

  /* ---- actions ---- */
  function apply(enabled) {
    var token = getToken();
    var message = $('message').value.trim() || 'This site is currently offline. Please check back soon.';
    setMsg('consoleMsg', 'Working…', false);
    $('blank').disabled = $('restore').disabled = true;

    getStatus(token).then(function (s) {
      var flag = s.flag || {};
      flag.enabled = enabled;
      flag.title = enabled ? 'Common Plate' : 'Temporarily unavailable';
      flag.message = message;
      return putStatus(token, flag, s.sha, enabled ? 'Restore site (admin)' : 'Blank site (admin)');
    }).then(function () {
      setBadge(enabled);
      setMsg('consoleMsg', enabled
        ? 'Site restored. Visitors will see it again within a few minutes.'
        : 'Site set to OFFLINE. It will go dark for visitors within a few minutes.', false);
    }).catch(function (e) {
      setMsg('consoleMsg', e.message, true);
    }).then(function () {
      $('blank').disabled = $('restore').disabled = false;
    });
  }

  /* ---- wire up ---- */
  document.addEventListener('DOMContentLoaded', function () {
    if (isUnlocked()) { enter(); } else { show('login'); }

    function doLogin() {
      var u = $('user').value.trim();
      var p = $('pass').value;
      if (!u || !p) { setMsg('loginMsg', 'Enter your username and password.', true); return; }
      setMsg('loginMsg', 'Checking…', false);
      sha256hex(p).then(function (h) {
        if (u === USERNAME && h === PASS_SHA256) {
          $('pass').value = '';
          setMsg('loginMsg', '', false);
          enter();
        } else {
          setMsg('loginMsg', 'Incorrect username or password.', true);
        }
      });
    }
    $('signin').addEventListener('click', doLogin);
    $('pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
    $('user').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('pass').focus(); });

    $('connect').addEventListener('click', function () {
      var t = $('token').value.trim();
      if (!t) { setMsg('setupMsg', 'Paste your GitHub token.', true); return; }
      setMsg('setupMsg', 'Connecting…', false);
      setToken(t, $('remember').checked);
      getStatus(t).then(function () {
        $('token').value = ''; setMsg('setupMsg', '', false); show('console'); refreshBadge();
      }).catch(function (e) { clearToken(); setMsg('setupMsg', e.message, true); });
    });
    $('token').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('connect').click(); });

    $('blank').addEventListener('click', function () {
      if (confirm('Take the whole site offline for all visitors?')) apply(false);
    });
    $('restore').addEventListener('click', function () { apply(true); });

    $('signout').addEventListener('click', function () {
      setUnlocked(false); show('login'); setMsg('loginMsg', 'Signed out.', false);
    });
    $('disconnect').addEventListener('click', function () {
      clearToken(); setMsg('setupMsg', 'GitHub token removed from this device.', false); show('setup');
    });
  });
})();
