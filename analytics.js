(function () {
  'use strict';
  const ID = 'G-8GYZN8Z85Y';
  const KEY = 'cao-analytics-consent-v1';
  let consent = 'unknown', loaded = false;
  try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved && Date.now() - saved.time < 180 * 86400000 && ['accepted', 'rejected'].includes(saved.choice)) consent = saved.choice; } catch (_) {}
  window['ga-disable-' + ID] = consent !== 'accepted';
  function gtag() { (window.dataLayer = window.dataLayer || []).push(arguments); }
  function pagePath() {
    const route = location.hash.split('?')[0];
    return location.pathname + (['#/', '#/colleges', '#/categories', '#/calculator', '#/saved'].includes(route) ? route : '');
  }
  function pageView() {
    if (consent !== 'accepted' || !loaded) return;
    let referrer = ''; try { if (document.referrer) referrer = new URL(document.referrer).origin; } catch (_) {}
    gtag('event', 'page_view', { page_location: location.origin + pagePath(), page_path: pagePath(), page_title: document.title, page_referrer: referrer });
  }
  function start() {
    if (consent !== 'accepted' || loaded || !/^https?:$/.test(location.protocol)) return;
    loaded = true;
    window['ga-disable-' + ID] = false;
    gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('js', new Date());
    gtag('config', ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: 15552000, cookie_update: false, page_location: location.origin + pagePath(), page_referrer: '', ignore_referrer: false });
    const script = document.createElement('script'); script.async = true; script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID; script.id = 'cao-google-analytics'; document.head.appendChild(script);
    pageView();
  }
  const allowed = new Set(['course_search', 'filter_change', 'course_view', 'course_save', 'course_unsave', 'college_course_click', 'college_directory_click', 'calculator_complete']);
  window.caoTrack = function (name, values) {
    if (consent !== 'accepted' || !loaded || !allowed.has(name)) return;
    const data = { page_location: location.origin + pagePath(), page_referrer: '' };
    for (const [key, value] of Object.entries(values || {})) {
      if (['course_code', 'college_id', 'filter_name', 'category'].includes(key) && typeof value === 'string') data[key] = value.slice(0, 80);
      if (['result_count', 'selection_count'].includes(key) && Number.isFinite(value)) data[key] = value;
    }
    gtag('event', name, data);
  };
  function clearCookies() {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (!/^_ga($|_)/.test(name)) continue;
      for (const domain of ['', location.hostname, '.' + location.hostname, '.caofinder.com']) document.cookie = name + '=; Max-Age=0; path=/' + (domain ? '; domain=' + domain : '') + '; SameSite=Lax';
    }
  }
  function choose(choice) {
    consent = choice;
    try { localStorage.setItem(KEY, JSON.stringify({ choice, time: Date.now() })); } catch (_) {}
    document.getElementById('cao-consent').hidden = true;
    if (choice === 'accepted') start();
    else { window['ga-disable-' + ID] = true; clearCookies(); if (loaded) location.reload(); }
  }
  function show() { const panel = document.getElementById('cao-consent'); panel.hidden = false; panel.querySelector('button').focus(); }
  function init() {
    const panel = document.createElement('section'); panel.id = 'cao-consent'; panel.className = 'cao-consent'; panel.setAttribute('aria-label', 'Optional analytics'); panel.hidden = consent !== 'unknown';
    panel.innerHTML = '<div><strong>Help make CAO Finder better?</strong><p>Allow optional Google Analytics cookies to measure visits, searches and course saves. We do not send your typed searches, grades or name. Your choice won’t affect course search. <a href="/privacy.html">Privacy details</a></p></div><div class="consent-actions"><button type="button" data-consent="rejected">Reject analytics</button><button type="button" data-consent="accepted">Allow analytics</button></div>';
    panel.querySelectorAll('button').forEach(button => button.addEventListener('click', () => choose(button.dataset.consent)));
    document.body.appendChild(panel);
    const settings = document.createElement('button'); settings.type = 'button'; settings.className = 'privacy-settings'; settings.textContent = 'Cookie settings'; settings.addEventListener('click', show); document.body.appendChild(settings);
    start();
  }
  window.addEventListener('hashchange', pageView);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
