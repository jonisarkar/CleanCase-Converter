/**
 * views.js — single-display navigation, 3-dot menu, case workspace,
 * quick-clean actions and cross-tool transfers.
 * Isolated add-on: never redefines converter/cleaner logic, only calls
 * existing globals (convert, showToast, BijoyTextCleaner, CaseConverter).
 */
(function () {
  'use strict';

  var VIEWS = ['converter', 'cleaning', 'case'];
  var csHistory = [];

  function $(id) { return document.getElementById(id); }

  function toast(msg) {
    try {
      if (typeof showToast === 'function') { showToast(msg); return; }
    } catch (e) {}
    var m = $('cs-msg');
    if (m) m.textContent = msg;
  }

  function currentModeSafe() {
    try { if (typeof currentMode !== 'undefined') return currentMode; } catch (e) {}
    return 'U2B';
  }

  // ---------- Single-display navigation (preserves text/settings) ----------
  window.showView = function (name, opts) {
    if (VIEWS.indexOf(name) === -1) name = 'converter';
    VIEWS.forEach(function (v) {
      var sec = $('view-' + v), tab = $('tab-' + v);
      var on = (v === name);
      if (sec) { if (on) sec.removeAttribute('hidden'); else sec.setAttribute('hidden', ''); }
      if (tab) {
        tab.classList.toggle('active', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.setAttribute('tabindex', on ? '0' : '-1');
      }
    });
    try { localStorage.setItem('bijoy-view', name); } catch (e) {}
    // Case view has its own header — hide the converter hero there only.
    var hero = document.querySelector('.hero');
    if (hero) { if (name === 'case') hero.setAttribute('hidden', ''); else hero.removeAttribute('hidden'); }
    if (opts && opts.focus) {
      var f = document.querySelector('#view-' + name + ' textarea');
      if (f) f.focus({ preventScroll: true });
    }
  };

  // Arrow-key tab navigation (roving tabindex, WAI-ARIA tabs pattern).
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('role') === 'tab') {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var i = VIEWS.indexOf(t.id.replace('tab-', ''));
        i = e.key === 'ArrowRight' ? (i + 1) % VIEWS.length : (i + VIEWS.length - 1) % VIEWS.length;
        var next = $('tab-' + VIEWS[i]);
        if (next) { next.focus(); showView(VIEWS[i]); }
      }
    }
  });

  // ---------- Three-dot menu ----------
  function setMenu(open) {
    var btn = $('dots-btn'), menu = $('dots-menu');
    if (!btn || !menu) return;
    if (open) { menu.removeAttribute('hidden'); btn.setAttribute('aria-expanded', 'true'); }
    else { menu.setAttribute('hidden', ''); btn.setAttribute('aria-expanded', 'false'); }
  }
  function menuOpen() {
    var menu = $('dots-menu');
    return !!(menu && !menu.hasAttribute('hidden'));
  }

  document.addEventListener('click', function (e) {
    var btn = $('dots-btn'), menu = $('dots-menu');
    if (!btn || !menu) return;
    if (btn.contains(e.target)) {
      e.stopPropagation();
      setMenu(!menuOpen());
      if (menuOpen()) {
        var first = menu.querySelector('.dots-item');
        if (first) first.focus({ preventScroll: true });
      }
      return;
    }
    if (menuOpen() && !menu.contains(e.target)) setMenu(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen()) {
      setMenu(false);
      var btn = $('dots-btn');
      if (btn) btn.focus();
    }
  });

  function activeView() {
    for (var i = 0; i < VIEWS.length; i++) {
      var sec = $('view-' + VIEWS[i]);
      if (sec && !sec.hasAttribute('hidden')) return VIEWS[i];
    }
    return 'converter';
  }

  function activeInputEl() {
    var v = activeView();
    if (v === 'cleaning') return $('cl-input');
    if (v === 'case') return $('cs-input');
    return $('input-text');
  }

  function refreshActiveInput(el) {
    if (!el) return;
    if (el.id === 'input-text') {
      try { if (typeof convert === 'function') convert(); else if (typeof updateCounts === 'function') updateCounts(); } catch (e) {}
    } else if (el.id === 'cl-input') {
      try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
    }
    caseStats();
  }

  function readSpecialChars() {
    var out = '';
    var boxes = document.querySelectorAll('#cl-specials input[type="checkbox"]');
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].checked) out += boxes[i].getAttribute('data-ch');
    }
    var custom = $('cl-custom') ? $('cl-custom').value || '' : '';
    custom = custom.replace(/[\s,;|]+/g, '');
    return out + custom;
  }

  // Quick one-click cleans reuse BijoyTextCleaner (no duplication).
  function quickClean(kind) {
    var el = activeInputEl();
    if (!el) return;
    // If active input is empty, fall back to cleaner input so the menu
    // still does something useful instead of no-op.
    if (!el.value && el.id !== 'cl-input' && $('cl-input') && $('cl-input').value) el = $('cl-input');
    if (!el.value) { toast('Nothing to clean — paste some text first'); return; }
    try {
      var C = window.BijoyTextCleaner;
      var before = el.value, after = before;
      if (kind === 'spaces') after = C.collapseExtraSpaces(C.trimLineEdges(before));
      else if (kind === 'blanks') after = C.collapseMultipleEnters(before);
      else if (kind === 'trim') after = C.trimLineEdges(before).replace(/^[ \t\u00A0\u2000-\u200A\u202F\u205F\u3000\n]+/, '').replace(/[ \t\u00A0\u2000-\u200A\u202F\u205F\u3000\n]+$/, '');
      else if (kind === 'specials') {
        var chars = readSpecialChars() || '*#[]';
        after = C.removeChars(before, chars);
      }
      el.value = after;
      refreshActiveInput(el);
      var diff = Math.abs(before.length - after.length);
      toast(diff ? ('Applied ✓ — ' + diff + ' chars normalized') : 'Already clean ✓');
    } catch (e) { toast('Cleaning failed — please try again'); }
  }

  // Menu item clicks (delegated; menu closes on select).
  document.addEventListener('click', function (e) {
    var item = e.target && e.target.closest ? e.target.closest('#dots-menu .dots-item') : null;
    if (!item) return;
    setMenu(false);
    if (item.hasAttribute('data-quick')) {
      quickClean(item.getAttribute('data-quick'));
      return;
    }
    var go = item.getAttribute('data-goto');
    if (go === 'case') { showView('case', { focus: true }); }
    else if (go === 'cleaning') { showView('cleaning', { focus: true }); }
    else if (go === 'converter') { showView('converter', { focus: true }); }
    else if (go === 'cleaning-focus-rules') {
      showView('cleaning');
      var f = document.querySelector('#cl-rules .cl-find');
      var box = $('cl-rules');
      if (f) f.focus();
      if (box) {
        box.classList.remove('flash');
        void box.offsetWidth;
        box.classList.add('flash');
        box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  // ---------- Case converter workspace ----------
  function csStats() {
    var a = $('cs-input'), b = $('cs-output');
    function sw(el, v) {
      if (!el) return;
      var chars = (v || '').length;
      var words = (v || '').trim() ? (v || '').trim().split(/\s+/).length : 0;
      el.innerHTML = '<b>' + chars.toLocaleString() + '</b> chars • <b>' + words.toLocaleString() + '</b> words';
    }
    if (a) sw($('cs-in-stat'), a.value);
    if (b) sw($('cs-out-stat'), b.value);
  }
  window.caseStats = csStats;

  function pushCsHistory(v) {
    csHistory.push(v);
    if (csHistory.length > 25) csHistory.shift();
  }

  function markApplied(kind) {
    var btns = document.querySelectorAll('.case-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('applied', btns[i].getAttribute('data-case') === kind);
    }
  }

  window.applyCase = function (kind) {
    var input = $('cs-input'), output = $('cs-output');
    if (!input || !output) return;
    if (!input.value) { toast('Nothing to convert — paste some text first'); return; }
    var fn = window.CaseConverter && window.CaseConverter[kind];
    if (typeof fn !== 'function') { toast('Unknown case option'); return; }
    // English-only: Bangla has no upper/lowercase. If there is no A-Z/a-z,
    // leave the text exactly as-is and tell the user why.
    try {
      var hasEn = window.CaseConverter.hasEnglish
        ? window.CaseConverter.hasEnglish(input.value)
        : /[A-Za-z]/.test(input.value);
      if (!hasEn) {
        pushCsHistory(input.value);
        output.value = input.value; // Bangla untouched, byte-for-byte
        markApplied('');
        csStats();
        var nb = $('cs-msg');
        if (nb) nb.innerHTML = 'বাংলায় কোনো case হয় না — <b>English-only</b>, Bangla unchanged ✓';
        toast('English-only — Bangla unchanged');
        return;
      }
    } catch (e) {}
    pushCsHistory(input.value);
    try {
      output.value = fn(input.value);
    } catch (e) { toast('Case conversion failed'); return; }
    markApplied(kind);
    csStats();
    var m2 = $('cs-msg');
    if (m2) m2.innerHTML = 'Applied <b>' + kind + '</b> ✓ — English only, Bangla unchanged';
    toast('Case applied ✓ (' + kind + ')');
  };

  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.case-btn') : null;
    if (b) applyCase(b.getAttribute('data-case'));
  });

  window.casePaste = function () {
    var input = $('cs-input');
    if (!input) return;
    function done(t) { pushCsHistory(input.value); input.value = t; csStats(); toast('Pasted ✓'); }
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (t) { if (t) done(t); else toast('Clipboard is empty'); }, function () { input.focus(); toast('Press Ctrl+V to paste'); });
    } else { input.focus(); toast('Press Ctrl+V to paste'); }
  };

  window.caseClearInput = function () {
    var input = $('cs-input');
    if (input) { pushCsHistory(input.value); input.value = ''; }
    markApplied('');
    csStats();
    if (input) input.focus();
  };

  window.caseCopy = function () {
    var output = $('cs-output');
    if (!output || !output.value) { toast('Nothing to copy'); return; }
    function done() { toast('Copied to clipboard ✓'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(output.value).then(done, function () { output.select(); document.execCommand('copy'); done(); });
    } else { output.select(); document.execCommand('copy'); done(); }
  };

  window.caseReplace = function () {
    var input = $('cs-input'), output = $('cs-output');
    if (!output || !output.value) { toast('Nothing to apply — convert first'); return; }
    pushCsHistory(input.value);
    input.value = output.value;
    csStats();
    toast('Input replaced with output ⇧');
  };

  window.caseSwap = function () {
    var input = $('cs-input'), output = $('cs-output');
    if (!input || !output) return;
    pushCsHistory(input.value);
    var t = input.value;
    input.value = output.value;
    output.value = t;
    csStats();
  };

  window.caseDownload = function () {
    var output = $('cs-output');
    if (!output || !output.value) { toast('Nothing to download'); return; }
    var blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'case-converted-' + Date.now() + '.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    toast('Downloaded .txt ✓');
  };

  window.caseUndo = function () {
    var input = $('cs-input');
    if (!csHistory.length) { toast('Nothing to undo'); return; }
    input.value = csHistory.pop();
    csStats();
    toast('Undone ↩');
  };

  window.caseReset = function () {
    var input = $('cs-input'), output = $('cs-output');
    if (input) input.value = '';
    if (output) output.value = '';
    csHistory = [];
    markApplied('');
    csStats();
    var m = $('cs-msg');
    if (m) m.textContent = 'Reset ✓ — pick Sc / lc / UC / CC / aC / TC / iC';
    toast('Reset ✓');
  };

  // ---------- Cross-tool transfers (exact text, no silent re-convert) ----------
  function setConverterInput(text) {
    var dst = $('input-text');
    if (!dst) return false;
    dst.value = text || '';
    try {
      dst.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof convert === 'function') convert();
      else if (typeof updateCounts === 'function') updateCounts();
    } catch (e) {}
    return true;
  }

  window.sendConverterToCleaner = function (which) {
    var src = which === 'output' ? $('output-text') : $('input-text');
    var dst = $('cl-input');
    if (!src || !dst) return;
    if (!src.value) { toast('Converter ' + which + ' is empty'); return; }
    dst.value = src.value;
    showView('cleaning');
    toast('Sent to Cleaner ⇩ (' + which + ')');
  };

  window.sendConverterToCase = function (which) {
    var src = which === 'output' ? $('output-text') : $('input-text');
    var dst = $('cs-input');
    if (!src || !dst) return;
    if (!src.value) { toast('Converter ' + which + ' is empty'); return; }
    pushCsHistory(dst.value);
    dst.value = src.value;
    csStats();
    showView('case');
    toast('Sent to Case converter ⇩ (' + which + ')');
  };

  window.sendCleanerToConverter = function () {
    var out = $('cl-output'), inp = $('cl-input');
    var text = (out && out.value) || (inp && inp.value) || '';
    if (!text) { toast('Clean first, then send'); return; }
    setConverterInput(text);
    showView('converter');
    toast('Sent to converter ⇧');
  };

  window.sendCleanerToCase = function () {
    var out = $('cl-output'), inp = $('cl-input'), dst = $('cs-input');
    var text = (out && out.value) || (inp && inp.value) || '';
    if (!text) { toast('Cleaner is empty'); return; }
    if (dst) { pushCsHistory(dst.value); dst.value = text; }
    csStats();
    showView('case');
    toast('Cleaned text sent to Case ⇩');
  };

  window.sendCaseToConverter = function () {
    var out = $('cs-output'), inp = $('cs-input');
    var text = (out && out.value) || (inp && inp.value) || '';
    if (!text) { toast('Convert first, then send'); return; }
    setConverterInput(text);
    showView('converter');
    toast('Case text sent to converter ⇧');
  };

  window.sendCaseToCleaner = function () {
    var out = $('cs-output'), inp = $('cs-input'), dst = $('cl-input');
    var text = (out && out.value) || (inp && inp.value) || '';
    if (!text) { toast('Convert first, then send'); return; }
    if (dst) dst.value = text;
    showView('cleaning');
    toast('Case text sent to Cleaner ⇩');
  };

  // ---------- Init: restore last view, wire counts ----------
  document.addEventListener('DOMContentLoaded', function () {
    var saved = null;
    try { saved = localStorage.getItem('bijoy-view'); } catch (e) {}
    if (saved && VIEWS.indexOf(saved) !== -1 && saved !== 'converter') showView(saved);
    else showView('converter');
    var a = $('cs-input');
    if (a) a.addEventListener('input', csStats);
    csStats();
  });
})();
