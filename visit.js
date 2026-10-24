/*
  VoiceWord website visit count. One small file, the same on every page (loaded with
  <script src="visit.js" defer>). Private by design:
    - It sends only three short things: the page name, the time zone name (the admin page turns it
      into a country, and the zone itself is never kept) and the website the visitor came from
      (the site name only, never the full link). The same is sent when someone clicks a Download
      or Microsoft Store button, with the page name "download:website" or "download:store".
    - No cookies. No ID. Nothing is stored on the visitor's device, except one switch for the
      site owner: open any page with ?count=off and that browser is never counted (?count=on
      turns counting back on).
    - Nothing is sent from a saved copy of the page (file://) or from localhost.

  These four were filled in (2026-10-24) after the admin page made the "VoiceWord website visits" form
  (the admin page's "Links for Claude" box shows them). If they are emptied, this sends nothing.
*/
(function () {
  'use strict';
  var VISITS_POST_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfY_hS5OhHw3l7CbfhsXiZV3dXQ3jRR4GANgVBLyGAdwkT8XQ/formResponse';
  var PAGE_FIELD = 'entry.329016753';
  var ZONE_FIELD = 'entry.971048350';
  var FROM_FIELD = 'entry.931955995';

  var OFF_KEY = 'vw-no-count';

  // ?count=off / ?count=on: the owner's switch to leave his own browsers out. Storage can be blocked, so it is wrapped.
  try {
    var wanted = new URLSearchParams(window.location.search).get('count');
    if (wanted === 'off') window.localStorage.setItem(OFF_KEY, '1');
    else if (wanted === 'on') window.localStorage.removeItem(OFF_KEY);
  } catch (e) { /* no storage: nothing to switch */ }

  function countingOff() {
    try { return window.localStorage.getItem(OFF_KEY) === '1'; } catch (e) { return false; }
  }

  function canSend() {
    if (!VISITS_POST_URL || !PAGE_FIELD) return false;
    var host = window.location.hostname;
    if (window.location.protocol === 'file:' || !host || host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') return false;
    return !countingOff();
  }

  function pageName() {
    var last = window.location.pathname.split('/').pop() || '';
    last = last.replace(/\.html?$/i, '');
    return last || 'index';
  }

  function zoneName() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; }
  }

  // Only the site's name: "google.com", never the full link. Another page of this site is "This site".
  function fromSite() {
    try {
      if (!document.referrer) return '';
      var host = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, '');
      var here = window.location.hostname.toLowerCase().replace(/^www\./, '');
      return host === here ? 'This site' : host;
    } catch (e) { return ''; }
  }

  function send(page) {
    if (!canSend()) return;
    try {
      var body = new URLSearchParams();
      body.set(PAGE_FIELD, page);
      if (ZONE_FIELD) body.set(ZONE_FIELD, zoneName());
      if (FROM_FIELD) body.set(FROM_FIELD, fromSite());
      var text = body.toString();
      if (navigator.sendBeacon && navigator.sendBeacon(VISITS_POST_URL, new Blob([text], {type: 'application/x-www-form-urlencoded'}))) return;
      fetch(VISITS_POST_URL, {method: 'POST', mode: 'no-cors', keepalive: true,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: text});
    } catch (e) { /* counting must never get in the way of the page */ }
  }

  // Which kind of download a link is, if it is one: VoiceWord's GitHub releases, or its Microsoft Store page.
  function downloadKind(href) {
    if (/github\.com\/VoiceWordApp\/VoiceWord-releases\/releases/i.test(href)) return 'download:website';
    if (/(apps\.microsoft\.com|microsoft\.com\/store|ms-windows-store:)[^\s]*9NC94Z5SJ9FV/i.test(href)) return 'download:store';
    return '';
  }

  function onClick(event) {
    var node = event.target;
    while (node && node !== document && !(node.tagName === 'A' && node.getAttribute('href'))) node = node.parentNode;
    if (!node || node === document) return;
    var kind = downloadKind(node.getAttribute('href'));
    if (kind) send(kind);   // never waits, never stops the click
  }

  if (!canSend()) return;
  send(pageName());
  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', onClick, true);
})();
