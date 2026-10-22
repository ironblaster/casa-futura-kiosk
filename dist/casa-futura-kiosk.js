/*!
 * Casa Futura Kiosk for Home Assistant
 * Small helpers for wall tablets, set from an invisible card:
 *   - status bar color: paints the strip the Android companion app keeps at the top, even in full screen
 *   - zoom: makes every card of the view smaller or bigger, only on wide screens if you like
 *   - return home: after some time without touches closes the open windows and goes back to the first view
 *
 * https://github.com/ironblaster/casa-futura-kiosk
 * Released under the MIT License.
 */
(function () {
  'use strict';

  var VERSION = '1.0.0';
  var REPO = 'https://github.com/ironblaster/casa-futura-kiosk';
  if (window.__casaFuturaKiosk) return;
  window.__casaFuturaKiosk = VERSION;

  /* ================================================================ helpers */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fire(node, type, detail) { node.dispatchEvent(new CustomEvent(type, { detail: detail, bubbles: true, composed: true })); }
  function langOf(hass) { return String((hass && ((hass.locale && hass.locale.language) || hass.language)) || navigator.language || 'en'); }
  function baseLang(l) { return String(l || 'en').toLowerCase().split(/[-_]/)[0]; }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  // '#rrggbb', 'r, g, b' or [r, g, b] -> '#rrggbb'
  function hex(v, fb) {
    var a = null;
    if (Array.isArray(v) && v.length >= 3) a = v;
    else if (typeof v === 'string') {
      var s = v.trim(), m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
      if (m) return '#' + (m[1].length === 3 ? m[1].replace(/(.)/g, '$1$1') : m[1]).toLowerCase();
      m = /^(?:rgba?\()?\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i.exec(s);
      if (m) a = [m[1], m[2], m[3]];
    }
    if (!a) return fb;
    return '#' + a.slice(0, 3).map(function (x) { return ('0' + clamp(Math.round(+x || 0), 0, 255).toString(16)).slice(-2); }).join('');
  }
  function rgbOf(h) { var m = /^#([0-9a-f]{6})$/i.exec(h || ''); return m ? [0, 2, 4].map(function (i) { return parseInt(m[1].substr(i, 2), 16); }) : [0, 0, 0]; }
  // the next node up the tree, crossing shadow roots
  function up(n) { var p = n.parentNode; return p && p.nodeType === 11 ? p.host : p; }

  /* ================================================================ translations */

  var T = {
    en: { title: 'Casa Futura Kiosk', off: 'Nothing switched on yet: open the editor.', hidden: 'Invisible on the dashboard: you see it only while editing.',
      status: 'status bar', zoom: 'zoom', home: 'back home after', min: 'min', s: 's', only: 'only for' },
    it: { title: 'Casa Futura Kiosk', off: 'Ancora niente di attivo: apri l’editor.', hidden: 'Non si vede sulla dashboard: compare solo in modifica.',
      status: 'barra di stato', zoom: 'zoom', home: 'torna alla home dopo', min: 'min', s: 's', only: 'solo per' },
    de: { title: 'Casa Futura Kiosk', off: 'Noch nichts aktiv: öffne den Editor.', hidden: 'Auf dem Dashboard unsichtbar: nur beim Bearbeiten zu sehen.',
      status: 'Statusleiste', zoom: 'Zoom', home: 'zurück zur Startseite nach', min: 'Min', s: 's', only: 'nur für' },
    fr: { title: 'Casa Futura Kiosk', off: 'Rien d’activé : ouvre l’éditeur.', hidden: 'Invisible sur le tableau de bord : visible seulement en modification.',
      status: 'barre d’état', zoom: 'zoom', home: 'retour à l’accueil après', min: 'min', s: 's', only: 'seulement pour' },
    es: { title: 'Casa Futura Kiosk', off: 'Nada activado todavía: abre el editor.', hidden: 'Invisible en el panel: solo se ve al editar.',
      status: 'barra de estado', zoom: 'zoom', home: 'vuelve al inicio tras', min: 'min', s: 's', only: 'solo para' }
  };
  function tr(hass, k) { var t = T[baseLang(langOf(hass))] || T.en; return t[k] != null ? t[k] : T.en[k]; }

  /* ================================================================ the manager: one for the whole page */

  var DEF = { users: [], status_bar: false, status_color: '#000000', zoom: 1, zoom_min_width: 0,
    return_home: false, timeout: 120, home: '', close_windows: true, scroll_top: true };

  var K = {
    card: null, cfg: null, hass: null, off: null,
    // status bar
    color: null, mo: null, md: null,
    // zoom
    zoomEl: null, mq: null, mqFn: null,
    // return home
    idle: null, bound: false, base: null
  };

  function userOk(c, h) {
    var users = (c.users || []).map(function (u) { return String(u).toLowerCase().trim(); }).filter(Boolean);
    if (!users.length) return true;
    var u = h && h.user; if (!u) return false;
    return users.indexOf(String(u.name || '').toLowerCase()) >= 0 || users.indexOf(String(u.id || '').toLowerCase()) >= 0;
  }

  // ---- status bar: the Android app reads --app-header-background-color on 'theme-update'
  function external(h) { return h && h.auth && h.auth.external && h.auth.external.fireMessage ? h.auth.external : null; }
  function themeUpdate() { var e = external(K.hass); if (e) { try { e.fireMessage({ type: 'theme-update' }); } catch (x) { /* ignore */ } } }
  function paint(force) {
    if (!K.color) return;
    var html = document.documentElement;
    var changed = html.style.getPropertyValue('--app-header-background-color').trim().toLowerCase() !== K.color;
    if (changed) html.style.setProperty('--app-header-background-color', K.color);
    if (changed || force) themeUpdate();
  }
  function statusOn(color) {
    var first = K.color !== color;
    K.color = color;
    paint(first);
    // Home Assistant rewrites the variable when it applies the theme: put it back
    if (!K.mo && window.MutationObserver) {
      K.mo = new MutationObserver(function () { clearTimeout(K.md); K.md = setTimeout(function () { paint(false); }, 200); });
      K.mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    }
  }
  function statusOff() {
    if (K.mo) { K.mo.disconnect(); K.mo = null; }
    if (!K.color) return;
    K.color = null;
    document.documentElement.style.removeProperty('--app-header-background-color');
    themeUpdate();
  }

  // ---- zoom: on the element of the view (the child of hui-view), so dialogs and more-info keep their size
  function viewOf(card) {
    var n = card, prev = null;
    while (n) {
      if (n.tagName === 'HUI-VIEW') return prev;
      prev = n; n = up(n);
    }
    return null;
  }
  function zoomOff() {
    if (K.mq && K.mqFn) { if (K.mq.removeEventListener) K.mq.removeEventListener('change', K.mqFn); else if (K.mq.removeListener) K.mq.removeListener(K.mqFn); }
    K.mq = null; K.mqFn = null;
    if (K.zoomEl) { K.zoomEl.style.removeProperty('zoom'); K.zoomEl = null; }
  }
  function zoomOn(card, z, minW) {
    var el = viewOf(card);
    if (!el) { zoomOff(); return; }
    if (K.zoomEl && K.zoomEl !== el) zoomOff();
    if (K.mq && K.zoomEl === el && K.mqZ === z && K.mqW === minW) return;
    zoomOff();
    K.zoomEl = el; K.mqZ = z; K.mqW = minW;
    var set = function () { if (!K.mq || K.mq.matches) el.style.zoom = String(z); else el.style.removeProperty('zoom'); };
    if (minW > 0 && window.matchMedia) {
      K.mq = window.matchMedia('(min-width: ' + minW + 'px)'); K.mqFn = set;
      if (K.mq.addEventListener) K.mq.addEventListener('change', set); else if (K.mq.addListener) K.mq.addListener(set);
    }
    set();
  }

  // ---- return home
  function schedule() {
    clearTimeout(K.idle);
    var c = K.cfg;
    if (!c || !c.return_home || K.editing) return;
    K.idle = setTimeout(goHome, clamp(num(c.timeout) || 120, 10, 86400) * 1000);
  }
  function homePath() {
    var c = K.cfg, h = String(c.home || '').trim();
    if (!h) return '/' + K.base + '/0';
    if (h.charAt(0) !== '/') h = '/' + K.base + '/' + h;
    return h;
  }
  function closeWindows() {
    // Casa Futura cards and panels
    try { window.dispatchEvent(new Event('casa-futura-close')); } catch (e) { /* ignore */ }
    // browser_mod popups
    var bm = window.browser_mod;
    if (bm && bm.service) { try { bm.service('close_popup', { all: true }); } catch (e) { /* ignore */ } }
    // the more-info dialog of Home Assistant
    var ha = document.querySelector('home-assistant');
    if (ha) fire(ha, 'hass-more-info', { entityId: null });
  }
  function goHome() {
    var c = K.cfg; if (!c || !K.base) return;
    if (location.pathname.indexOf('/' + K.base) !== 0) return;   // we left the dashboard
    if (c.close_windows !== false) closeWindows();
    var target = homePath();
    if (location.pathname !== target) {
      history.pushState(null, '', target);
      window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
    }
    if (c.scroll_top !== false) {
      setTimeout(function () {
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
        if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
      }, 400);
    }
  }
  function bindIdle() {
    if (K.bound) return;
    K.bound = true;
    ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(function (ev) { document.addEventListener(ev, schedule, { capture: true, passive: true }); });
  }

  function apply() {
    var card = K.card, c = K.cfg, h = K.hass;
    if (!card || !c || !h || !h.user) return;
    if (!userOk(c, h)) { teardown(); return; }
    clearTimeout(K.off);
    if (c.status_bar && external(h)) statusOn(hex(c.status_color, '#000000')); else statusOff();
    var z = clamp(num(c.zoom) || 1, 0.3, 3);
    if (z !== 1) zoomOn(card, z, num(c.zoom_min_width) || 0); else zoomOff();
    if (c.return_home) { bindIdle(); if (!K.idle) schedule(); } else { clearTimeout(K.idle); K.idle = null; }
  }
  function teardown() {
    statusOff(); zoomOff();
    clearTimeout(K.idle); K.idle = null;
  }

  /* ================================================================ the card */

  class CasaFuturaKioskCard extends HTMLElement {
    static getConfigElement() { return document.createElement('casa-futura-kiosk-card-editor'); }
    static getStubConfig() { return { status_bar: true, return_home: true }; }
    constructor() { super(); this.attachShadow({ mode: 'open' }); }
    setConfig(c) {
      this._config = Object.assign({}, DEF, c || {});
      this._render();
      if (K.card === this) { K.cfg = this._config; K.idle && schedule(); apply(); }
    }
    set hass(h) {
      var first = !this._hass, themes = this._hass && this._hass.themes; this._hass = h;
      if (K.card === this) { K.hass = h; if (first || h.themes !== themes) apply(); }
      else this._claim();
      if (first) this._render();
    }
    // visible only while editing the dashboard or in the card picker, and then it does nothing
    set preview(v) { this._preview = !!v; this._render(); if (this._preview && K.card === this) this._release(); else this._claim(); }
    set editMode(v) { this._edit = !!v; K.editing = !!v; this._render(); if (v) { clearTimeout(K.idle); K.idle = null; } else schedule(); }
    connectedCallback() { this._render(); this._claim(); }
    disconnectedCallback() { if (K.card === this) this._release(); }
    getCardSize() { return this._preview || this._edit ? 1 : 0; }
    getGridOptions() { return { columns: 12, rows: 1, min_rows: 1 }; }
    _claim() {
      if (!this._config || !this._hass || this._preview || !this.isConnected) return;
      K.card = this; K.cfg = this._config; K.hass = this._hass;
      // the dashboard is the first part of the address: home is its first view unless set
      K.base = location.pathname.split('/')[1] || K.base;
      apply();
    }
    // when the view changes the card of the next view takes over; without one, everything goes back to normal
    _release() {
      var me = this;
      clearTimeout(K.off);
      K.off = setTimeout(function () { if (K.card === me && !me.isConnected) { K.card = null; K.cfg = null; teardown(); } }, 1500);
      if (this._preview) { K.card = null; K.cfg = null; teardown(); }
    }
    _render() {
      var show = this._preview || this._edit;
      this.style.display = show ? 'block' : 'none';
      if (!show) { this.shadowRoot.innerHTML = ''; return; }
      var c = this._config || DEF, h = this._hass, bits = [];
      if (c.status_bar) bits.push('<span class="chip"><i style="background:' + esc(hex(c.status_color, '#000000')) + '"></i>' + esc(tr(h, 'status')) + '</span>');
      var z = num(c.zoom) || 1;
      if (z !== 1) bits.push('<span class="chip">' + esc(tr(h, 'zoom')) + ' ' + Math.round(z * 100) + '%' + (num(c.zoom_min_width) ? ' · ≥ ' + num(c.zoom_min_width) + 'px' : '') + '</span>');
      if (c.return_home) {
        var t = num(c.timeout) || 120;
        bits.push('<span class="chip">' + esc(tr(h, 'home')) + ' ' + (t % 60 ? t + ' ' + tr(h, 's') : t / 60 + ' ' + tr(h, 'min')) + '</span>');
      }
      var users = (c.users || []).filter(Boolean);
      if (users.length) bits.push('<span class="chip dim">' + esc(tr(h, 'only')) + ' ' + esc(users.join(', ')) + '</span>');
      this.shadowRoot.innerHTML = '<style>' +
        ':host{display:block}*{box-sizing:border-box}' +
        '.k{display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:var(--ha-card-border-radius,16px);color:var(--primary-text-color,#eef4ff);' +
        '  background:linear-gradient(155deg,rgba(95,243,255,.14),rgba(185,139,255,.10));border:1px dashed rgba(95,243,255,.45);font-family:var(--ha-font-family-body,system-ui,sans-serif)}' +
        '.ic{width:40px;height:40px;flex:none;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#5ff3ff;background:rgba(95,243,255,.14);--mdc-icon-size:24px}' +
        '.t{font-weight:600;font-size:15px}.s{font-size:12px;opacity:.65;margin-top:2px}' +
        '.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
        '.chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14)}' +
        '.chip i{width:10px;height:10px;border-radius:50%;border:1px solid rgba(255,255,255,.5)}.chip.dim{opacity:.7}' +
        '</style><div class="k"><div class="ic"><ha-icon icon="mdi:tablet-dashboard"></ha-icon></div><div style="min-width:0">' +
        '<div class="t">' + esc(tr(h, 'title')) + '</div><div class="s">' + esc(bits.length ? tr(h, 'hidden') : tr(h, 'off')) + '</div>' +
        (bits.length ? '<div class="chips">' + bits.join('') + '</div>' : '') + '</div></div>';
    }
  }

  /* ================================================================ the editor (Home Assistant forms) */

  var ET = {
    en: {
      s_status: 'Status bar (Android app)', s_zoom: 'Zoom', s_home: 'Return home', s_who: 'Who',
      status_bar: 'Paint the status bar', status_color: 'Color', status_h: 'The Android companion app keeps the space of the status bar at the top, even in full screen, and paints it with the header color of the theme. Pick the color of your background.',
      zoom: 'Zoom of the cards', zoom_min_width: 'Only on screens wider than', zoom_h: 'Like the zoom of the browser, for every card of the view. Windows and more-info keep their size. 0 px: on every screen.',
      return_home: 'Go back home when nobody touches the screen', timeout: 'After', home: 'Home view (path or number, empty: the first view)',
      close_windows: 'Close the open windows (more-info, browser_mod, Casa Futura)', scroll_top: 'Scroll to the top',
      users: 'Users (empty: everyone)', users_h: 'Names of the Home Assistant users this card works for, e.g. the user of the wall tablet. Everyone else sees the dashboard as it is.'
    },
    it: {
      s_status: 'Barra di stato (app Android)', s_zoom: 'Zoom', s_home: 'Ritorno alla home', s_who: 'Per chi',
      status_bar: 'Colora la barra di stato', status_color: 'Colore', status_h: 'L’app Android di Home Assistant lascia in cima lo spazio della barra di stato anche a schermo intero e lo colora con il colore dell’intestazione del tema. Scegli il colore del tuo sfondo.',
      zoom: 'Zoom delle card', zoom_min_width: 'Solo su schermi più larghi di', zoom_h: 'Come lo zoom del browser, per tutte le card della vista. Le finestre e i dettagli restano grandi uguali. 0 px: su tutti gli schermi.',
      return_home: 'Torna alla home quando nessuno tocca lo schermo', timeout: 'Dopo', home: 'Vista home (percorso o numero, vuoto: la prima vista)',
      close_windows: 'Chiudi le finestre aperte (dettagli, browser_mod, Casa Futura)', scroll_top: 'Torna in cima alla pagina',
      users: 'Utenti (vuoto: tutti)', users_h: 'Nomi degli utenti di Home Assistant per cui vale questa card, per esempio quello del tablet a muro. Gli altri vedono la dashboard come sempre.'
    },
    de: {
      s_status: 'Statusleiste (Android-App)', s_zoom: 'Zoom', s_home: 'Zurück zur Startseite', s_who: 'Für wen',
      status_bar: 'Statusleiste einfärben', status_color: 'Farbe', zoom: 'Zoom der Karten', zoom_min_width: 'Nur auf Bildschirmen breiter als',
      return_home: 'Zur Startseite, wenn niemand den Bildschirm berührt', timeout: 'Nach', home: 'Startansicht (Pfad oder Nummer, leer: die erste Ansicht)',
      close_windows: 'Offene Fenster schließen', scroll_top: 'Nach oben scrollen', users: 'Benutzer (leer: alle)'
    },
    fr: {
      s_status: 'Barre d’état (app Android)', s_zoom: 'Zoom', s_home: 'Retour à l’accueil', s_who: 'Pour qui',
      status_bar: 'Colorer la barre d’état', status_color: 'Couleur', zoom: 'Zoom des cartes', zoom_min_width: 'Seulement sur les écrans plus larges que',
      return_home: 'Revenir à l’accueil quand personne ne touche l’écran', timeout: 'Après', home: 'Vue d’accueil (chemin ou numéro, vide : la première vue)',
      close_windows: 'Fermer les fenêtres ouvertes', scroll_top: 'Remonter en haut', users: 'Utilisateurs (vide : tous)'
    },
    es: {
      s_status: 'Barra de estado (app Android)', s_zoom: 'Zoom', s_home: 'Volver al inicio', s_who: 'Para quién',
      status_bar: 'Colorear la barra de estado', status_color: 'Color', zoom: 'Zoom de las tarjetas', zoom_min_width: 'Solo en pantallas más anchas que',
      return_home: 'Volver al inicio cuando nadie toca la pantalla', timeout: 'Después de', home: 'Vista de inicio (ruta o número, vacío: la primera vista)',
      close_windows: 'Cerrar las ventanas abiertas', scroll_top: 'Volver arriba', users: 'Usuarios (vacío: todos)'
    }
  };

  var FORM = null;
  function ensureForm() {
    if (customElements.get('ha-form')) return Promise.resolve();
    if (FORM) return FORM;
    FORM = new Promise(function (resolve) {
      try {
        if (window.loadCardHelpers) {
          window.loadCardHelpers().then(function (h) { return h.createCardElement({ type: 'entities', entities: [] }); })
            .then(function (c) { return c && c.constructor.getConfigElement ? c.constructor.getConfigElement() : null; })
            .catch(function () { /* ignore */ });
        }
      } catch (e) { /* ignore */ }
      customElements.whenDefined('ha-form').then(function () { resolve(); });
      setTimeout(resolve, 5000);
    });
    return FORM;
  }

  class CasaFuturaKioskCardEditor extends HTMLElement {
    setConfig(c) { this._config = Object.assign({}, c || {}); this._draw(); }
    set hass(h) { this._hass = h; if (this._form) this._form.hass = h; else this._draw(); }
    connectedCallback() { this._draw(); }
    _L(k) { var t = ET[baseLang(langOf(this._hass))] || ET.en; return t[k] != null ? t[k] : (ET.en[k] != null ? ET.en[k] : k); }
    _draw() {
      var self = this;
      if (!this._hass || !this._config || !this.isConnected) return;
      ensureForm().then(function () { self._drawNow(); });
    }
    _drawNow() {
      var self = this, L = this._L.bind(this);
      if (!this._root) {
        this._root = this.attachShadow({ mode: 'open' });
        this._root.innerHTML = '<style>:host{display:block}.foot{font-size:12px;color:var(--secondary-text-color);text-align:right;margin-top:12px}.foot a{color:inherit}</style>' +
          '<div id="form"></div><div class="foot">Casa Futura Kiosk ' + VERSION + ' · <a href="' + REPO + '" target="_blank" rel="noreferrer">GitHub</a></div>';
        this._form = document.createElement('ha-form');
        this._form.computeLabel = function (s) { return s.title || L(s.name); };
        this._form.computeHelper = function (s) {
          var k = { status_bar: 'status_h', zoom: 'zoom_h', users: 'users_h' }[s.name];
          return k ? L(k) : '';
        };
        this._form.addEventListener('value-changed', function (ev) {
          ev.stopPropagation();
          var v = Object.assign({}, self._config, ev.detail.value), out = {};
          if (Array.isArray(v.status_color)) v.status_color = hex(v.status_color, '#000000');
          Object.keys(v).forEach(function (k) {
            var x = v[k];
            if (x === undefined || x === null || x === '') return;
            if (Array.isArray(x) && !x.length) return;
            if (k in DEF && same(x, DEF[k])) return;
            out[k] = x;
          });
          if (Array.isArray(out.users)) out.users = out.users.map(function (u) { return String(u).trim(); }).filter(Boolean);
          self._config = out;
          fire(self, 'config-changed', { config: out });
          self._form.schema = self._schema(); self._form.data = self._data();
        });
        this._root.getElementById('form').appendChild(this._form);
      }
      this._form.hass = this._hass;
      this._form.schema = this._schema();
      this._form.data = this._data();
    }
    _data() {
      var d = Object.assign({}, DEF, this._config);
      d.status_color = rgbOf(hex(d.status_color, '#000000'));
      if (!Array.isArray(d.users)) d.users = d.users ? [String(d.users)] : [];
      return d;
    }
    _section(title, icon, schema, expanded) { return { type: 'expandable', name: '', title: this._L(title), icon: icon, flatten: true, expanded: !!expanded, schema: schema }; }
    _schema() {
      var c = Object.assign({}, DEF, this._config);
      var status = [{ name: 'status_bar', selector: { boolean: {} } }];
      if (c.status_bar) status.push({ name: 'status_color', selector: { color_rgb: {} } });
      var zoom = [{ name: 'zoom', selector: { number: { min: 0.5, max: 1.5, step: 0.05, mode: 'slider' } } }];
      if ((num(c.zoom) || 1) !== 1) zoom.push({ name: 'zoom_min_width', selector: { number: { min: 0, max: 2560, step: 10, mode: 'box', unit_of_measurement: 'px' } } });
      var home = [{ name: 'return_home', selector: { boolean: {} } }];
      if (c.return_home) {
        home.push({ name: 'timeout', selector: { number: { min: 10, max: 3600, step: 10, mode: 'box', unit_of_measurement: 's' } } });
        home.push({ name: 'home', selector: { text: {} } });
        home.push({ type: 'grid', name: '', schema: [{ name: 'close_windows', selector: { boolean: {} } }, { name: 'scroll_top', selector: { boolean: {} } }] });
      }
      return [
        this._section('s_status', 'mdi:cellphone-screenshot', status, true),
        this._section('s_zoom', 'mdi:magnify-plus-outline', zoom, true),
        this._section('s_home', 'mdi:home-clock-outline', home, true),
        this._section('s_who', 'mdi:account-multiple-outline', [{ name: 'users', selector: { text: { multiple: true } } }])
      ];
    }
  }

  /* ================================================================ registration */

  if (!customElements.get('casa-futura-kiosk-card')) customElements.define('casa-futura-kiosk-card', CasaFuturaKioskCard);
  if (!customElements.get('casa-futura-kiosk-card-editor')) customElements.define('casa-futura-kiosk-card-editor', CasaFuturaKioskCardEditor);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'casa-futura-kiosk-card', name: 'Casa Futura · Kiosk',
    description: 'Invisible helper for wall tablets: status bar color of the Android app, zoom of the view, return home after some time.', preview: true, documentationURL: REPO });
  console.info('%c CASA FUTURA KIOSK %c ' + VERSION + ' ', 'color:#0b0f1a;background:#b98bff;font-weight:700;border-radius:4px 0 0 4px', 'color:#b98bff;background:#0b0f1a;border-radius:0 4px 4px 0');
})();
