(function () {
  'use strict';

  var KEY = 'jfVideoFilters.v1';

  var DEFAULTS = {
    enabled: true,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    gamma: 1,
    hue: 0,
    sepia: 0,
    grayscale: 0
  };

  // key, label, min, max, step
  var CONTROLS = [
    ['brightness', 'Brightness', 0.4, 2, 0.01],
    ['contrast', 'Contrast', 0.4, 2, 0.01],
    ['saturation', 'Saturation', 0, 3, 0.01],
    ['gamma', 'Gamma', 0.4, 2.5, 0.01],
    ['hue', 'Hue', -180, 180, 1],
    ['sepia', 'Sepia', 0, 1, 0.01],
    ['grayscale', 'Grayscale', 0, 1, 0.01]
  ];

  var PRESETS = {
    'Default': {},
    'Brighten dark scenes': { brightness: 1.2, contrast: 1.1, saturation: 1.05, gamma: 1.25 },
    'Vivid': { brightness: 1.05, contrast: 1.15, saturation: 1.4 },
    'Cinematic': { brightness: 0.95, contrast: 1.15, saturation: 0.9 },
    'Soft': { brightness: 1.05, contrast: 0.9, saturation: 1.1 },
    'Vintage': { brightness: 1.05, contrast: 0.9, saturation: 0.8, sepia: 0.3 },
    'Drama': { brightness: 0.95, contrast: 1.3, saturation: 0.7 },
    'Noir': { contrast: 1.3, grayscale: 1 },
    'Sepia': { sepia: 1 }
  };

  var state = load();
  var panel = null;
  var presetSelect = null;
  var sliderRefs = {};
  var gammaNodes = [];

  function load() {
    try {
      return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}'));
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function isJellyfin() {
    return typeof window.ApiClient !== 'undefined' || /jellyfin/i.test(document.title);
  }

  // ---- filter application -------------------------------------------------

  function ensureSvgFilter() {
    if (document.getElementById('jfvf-svg')) return;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('id', 'jfvf-svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    var filter = document.createElementNS(ns, 'filter');
    filter.setAttribute('id', 'jfvf-gamma');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    var ct = document.createElementNS(ns, 'feComponentTransfer');
    gammaNodes = ['feFuncR', 'feFuncG', 'feFuncB'].map(function (name) {
      var n = document.createElementNS(ns, name);
      n.setAttribute('type', 'gamma');
      n.setAttribute('amplitude', '1');
      n.setAttribute('exponent', '1');
      n.setAttribute('offset', '0');
      ct.appendChild(n);
      return n;
    });
    filter.appendChild(ct);
    svg.appendChild(filter);
    document.body.appendChild(svg);
  }

  function filterString() {
    if (!state.enabled) return '';
    var parts = [];
    if (state.gamma !== 1) parts.push('url(#jfvf-gamma)');
    parts.push('brightness(' + state.brightness + ')');
    parts.push('contrast(' + state.contrast + ')');
    parts.push('saturate(' + state.saturation + ')');
    if (state.hue) parts.push('hue-rotate(' + state.hue + 'deg)');
    if (state.sepia) parts.push('sepia(' + state.sepia + ')');
    if (state.grayscale) parts.push('grayscale(' + state.grayscale + ')');
    return parts.join(' ');
  }

  function apply() {
    ensureSvgFilter();
    var exponent = (1 / state.gamma).toFixed(4);
    gammaNodes.forEach(function (n) { n.setAttribute('exponent', exponent); });
    var f = filterString();
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) videos[i].style.filter = f;
  }

  // ---- UI -----------------------------------------------------------------

  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function fmt(key) {
    var v = state[key];
    if (key === 'hue') return Math.round(v) + '\u00b0';
    return v.toFixed(2);
  }

  function addStyles() {
    if (document.getElementById('jfvf-style')) return;
    var s = document.createElement('style');
    s.id = 'jfvf-style';
    s.textContent =
      '#jfvf-panel{position:fixed;right:16px;bottom:110px;width:280px;z-index:2147483000;' +
      'background:rgba(18,18,22,.94);color:#eee;border:1px solid rgba(255,255,255,.15);' +
      'border-radius:10px;padding:12px 14px;font:13px/1.3 system-ui,sans-serif;' +
      'box-shadow:0 8px 30px rgba(0,0,0,.5);display:none}' +
      '#jfvf-panel .jfvf-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font-weight:600;font-size:14px}' +
      '#jfvf-panel .jfvf-head label{font-weight:400;font-size:12px;display:flex;gap:4px;align-items:center}' +
      '#jfvf-panel button,#jfvf-panel select{background:#2b2b33;color:#eee;border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:4px 8px;font-size:12px}' +
      '#jfvf-panel .jfvf-close{cursor:pointer;margin-left:8px}' +
      '#jfvf-panel .jfvf-row{display:grid;grid-template-columns:78px 1fr 44px;align-items:center;gap:6px;margin:6px 0}' +
      '#jfvf-panel .jfvf-row label{cursor:pointer}' +
      '#jfvf-panel .jfvf-val{text-align:right;font-variant-numeric:tabular-nums;opacity:.8}' +
      '#jfvf-panel input[type=range]{width:100%}' +
      '#jfvf-panel .jfvf-foot{display:flex;gap:8px;margin-top:10px;align-items:center}' +
      '#jfvf-panel .jfvf-foot select{flex:1}' +
      '#jfvf-panel .jfvf-hint{opacity:.55;font-size:11px;margin-top:8px}';
    document.head.appendChild(s);
  }

  function syncSliders() {
    CONTROLS.forEach(function (c) {
      var r = sliderRefs[c[0]];
      r.input.value = state[c[0]];
      r.val.textContent = fmt(c[0]);
    });
    if (presetSelect) presetSelect.value = '__custom';
  }

  function buildPanel() {
    addStyles();
    panel = el('div');
    panel.id = 'jfvf-panel';

    // keep Jellyfin keyboard shortcuts (arrows, space, etc.) from firing while using the panel
    ['keydown', 'keyup', 'keypress'].forEach(function (evt) {
      panel.addEventListener(evt, function (e) { e.stopPropagation(); });
    });

    var head = el('div', 'jfvf-head');
    var title = el('span');
    title.textContent = 'Video filters';
    var right = el('span');
    var enabledLabel = el('label');
    var enabledBox = el('input');
    enabledBox.type = 'checkbox';
    enabledBox.checked = state.enabled;
    enabledBox.addEventListener('change', function () {
      state.enabled = enabledBox.checked;
      save();
      apply();
    });
    enabledLabel.appendChild(enabledBox);
    enabledLabel.appendChild(document.createTextNode('On'));
    var close = el('button', 'jfvf-close');
    close.textContent = '\u2715';
    close.addEventListener('click', function () { panel.style.display = 'none'; });
    right.appendChild(enabledLabel);
    right.appendChild(close);
    head.appendChild(title);
    head.appendChild(right);
    panel.appendChild(head);

    CONTROLS.forEach(function (c) {
      var key = c[0];
      var row = el('div', 'jfvf-row');
      var label = el('label');
      label.textContent = c[1];
      label.title = 'Double-click to reset';
      var input = el('input');
      input.type = 'range';
      input.min = c[2];
      input.max = c[3];
      input.step = c[4];
      input.value = state[key];
      var val = el('span', 'jfvf-val');
      val.textContent = fmt(key);
      input.addEventListener('input', function () {
        state[key] = parseFloat(input.value);
        val.textContent = fmt(key);
        if (presetSelect) presetSelect.value = '__custom';
        save();
        apply();
      });
      label.addEventListener('dblclick', function () {
        state[key] = DEFAULTS[key];
        syncSliders();
        save();
        apply();
      });
      sliderRefs[key] = { input: input, val: val };
      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(val);
      panel.appendChild(row);
    });

    var foot = el('div', 'jfvf-foot');
    presetSelect = el('select');
    var custom = el('option');
    custom.value = '__custom';
    custom.textContent = 'Custom';
    presetSelect.appendChild(custom);
    Object.keys(PRESETS).forEach(function (name) {
      var o = el('option');
      o.value = name;
      o.textContent = name;
      presetSelect.appendChild(o);
    });
    presetSelect.value = '__custom';
    presetSelect.addEventListener('change', function () {
      var p = PRESETS[presetSelect.value];
      if (!p) return;
      var keepEnabled = state.enabled;
      state = Object.assign({}, DEFAULTS, p);
      state.enabled = keepEnabled;
      syncSliders();
      presetSelect.value = Object.keys(PRESETS).filter(function (n) { return PRESETS[n] === p; })[0];
      save();
      apply();
    });
    var reset = el('button');
    reset.textContent = 'Reset';
    reset.addEventListener('click', function () {
      var keepEnabled = state.enabled;
      state = Object.assign({}, DEFAULTS);
      state.enabled = keepEnabled;
      syncSliders();
      presetSelect.value = 'Default';
      save();
      apply();
    });
    foot.appendChild(presetSelect);
    foot.appendChild(reset);
    panel.appendChild(foot);

    var hint = el('div', 'jfvf-hint');
    hint.textContent = 'Alt+B toggles this panel. Double-click a label to reset it.';
    panel.appendChild(hint);

    document.body.appendChild(panel);
  }

  function togglePanel() {
    if (!panel) buildPanel();
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  }

  function injectButton() {
    if (document.getElementById('jfvf-btn')) return;
    var host = document.querySelector('.videoOsdBottom .buttons, .osdControls .buttons');
    if (!host) return;
    var b = el('button', 'paper-icon-button-light autoSize');
    b.id = 'jfvf-btn';
    b.type = 'button';
    b.title = 'Video filters (Alt+B)';
    b.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="vertical-align:middle">' +
      '<path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>' +
      '</svg>';
    b.addEventListener('click', togglePanel);
    var subs = host.querySelector('.btnSubtitles');
    if (subs) subs.insertAdjacentElement('afterend', b);
    else host.appendChild(b);
  }

  // ---- main loop ----------------------------------------------------------

  document.addEventListener('keydown', function (e) {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyB') {
      if (!isJellyfin() || !document.querySelector('video')) return;
      e.preventDefault();
      togglePanel();
    }
  }, true);

  setInterval(function () {
    if (!isJellyfin()) return;
    var hasVideo = !!document.querySelector('video');
    if (hasVideo) {
      apply();
      injectButton();
    } else if (panel) {
      panel.style.display = 'none';
    }
  }, 500);
})();
