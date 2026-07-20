/*
 * admin.js — site control console for admin.html
 * ----------------------------------------------
 * Flips status.json in the repo (the kill-switch flag that guard.js reads).
 * The "login" is a GitHub access token: it is the real credential that can
 * change the live site, so there is no secret hidden in this file — without a
 * valid token, every button here simply fails at GitHub's API.
 *
 * NOTE: admin.html deliberately does NOT load guard.js, so blanking the site
 * never blanks this page — you can always sign in and restore.
 */
(function () {
  'use strict';

  var OWNER = 'bud123567';
  var REPO = 'common-plate-group-preview';
  var BRANCH = 'main';
  var FILE = 'status.json';
  var API = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + FILE;
  var TOKEN_KEY = 'cpg_admin_token';

  var $ = function (id) { return document.getElementById(id); };

  /* ---- token storage ---- */
  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '';
  }
  function setToken(t, remember) {
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, t);
  }
  function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  /* ---- unicode-safe base64 ---- */
  function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64decode(b64) { return decodeURIComponent(escape(atob(b64.replace(/\s/g, '')))); }

  /* ---- GitHub API ---- */
  function headers(token) {
    return { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' };
  }

  // Returns { flag: {...}, sha: '...' } for the current status.json.
  function getStatus(token) {
    return fetch(API + '?ref=' + BRANCH + '&t=' + Date.now(), { cache: 'no-store', headers: headers(token) })
      .then(function (r) {
        if (!r.ok) throw httpError(r.status);
        return r.json();
      })
      .then(function (data) {
        var flag;
        try { flag = JSON.parse(b64decode(data.content)); }
        catch (e) { flag = { enabled: true }; }
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
        sha: sha,
        branch: BRANCH
      })
    }).then(function (r) {
      if (!r.ok) throw httpError(r.status);
      return r.json();
    });
  }

  function httpError(status) {
    var map = {
      401: 'Invalid or expired token.',
      403: 'Token rejected (check it has Contents: Read and write on this repo).',
      404: 'Repo or file not found for this token (check the repo permission).',
      409: 'The flag changed under you — try again.'
    };
    return new Error(map[status] || ('GitHub API error (' + status + ').'));
  }

  /* ---- views ---- */
  function showLogin(msg, isErr) {
    $('login').classList.remove('hidden');
    $('console').classList.add('hidden');
    setMsg('loginMsg', msg || '', isErr);
  }
  function showConsole() {
    $('login').classList.add('hidden');
    $('console').classList.remove('hidden');
    refreshBadge();
  }
  function setMsg(id, text, isErr) {
    var el = $(id);
    el.textContent = text;
    el.className = 'msg' + (text ? (isErr ? ' err' : ' ok') : '');
  }
  function setBadge(enabled) {
    var b = $('badge');
    if (enabled === false) { b.textContent = 'OFFLINE'; b.className = 'status-badge dark'; }
    else { b.textContent = 'LIVE'; b.className = 'status-badge live'; }
  }

  function refreshBadge() {
    var token = getToken();
    setBadge(true);
    getStatus(token).then(function (s) {
      setBadge(s.flag.enabled !== false);
      if (s.flag.message) $('message').value = s.flag.message;
    }).catch(function (e) {
      // Token no longer valid — bounce back to login.
      clearToken();
      showLogin(e.message, true);
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
      return putStatus(token, flag, s.sha,
        enabled ? 'Restore site (admin)' : 'Blank site (admin)');
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
    if (getToken()) { showConsole(); } else { showLogin(); }

    $('signin').addEventListener('click', function () {
      var t = $('token').value.trim();
      if (!t) { setMsg('loginMsg', 'Enter your access token.', true); return; }
      setMsg('loginMsg', 'Checking…', false);
      setToken(t, $('remember').checked);
      getStatus(t).then(function () {
        $('token').value = '';
        showConsole();
      }).catch(function (e) {
        clearToken();
        setMsg('loginMsg', e.message, true);
      });
    });

    $('token').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('signin').click();
    });

    $('blank').addEventListener('click', function () {
      if (confirm('Take the whole site offline for all visitors?')) apply(false);
    });
    $('restore').addEventListener('click', function () { apply(true); });

    $('signout').addEventListener('click', function () {
      clearToken();
      showLogin('Signed out.', false);
    });
  });
})();
