/**
 * cleaner-ui.js — DOM wiring for the Advanced Text Cleaning add-on.
 * Isolated from script.js: only READS converter textareas and reuses
 * showToast() when available (fallback otherwise). No existing
 * function is redefined.
 */
(function () {
  'use strict';

  var lastOriginal = '';

  function $(id) { return document.getElementById(id); }

  function localToast(msg) {
    try {
      if (typeof showToast === 'function') { showToast(msg); return; }
    } catch (e) {}
    var t = $('cl-msg');
    if (t) t.innerHTML = '<b>' + msg.replace(/</g, '&lt;') + '</b>';
  }

  function updateStats() {
    var a = $('cl-input'), b = $('cl-output');
    if (a && $('cl-in-stat')) {
      var s = a.value.length;
      $('cl-in-stat').innerHTML = '<b>' + s.toLocaleString() + '</b> chars';
    }
    if (b && $('cl-out-stat')) {
      var s2 = b.value.length;
      $('cl-out-stat').innerHTML = '<b>' + s2.toLocaleString() + '</b> chars';
    }
  }

  function getSpecialChars() {
    var out = '';
    var boxes = document.querySelectorAll('#cl-specials input[type="checkbox"]');
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].checked) out += boxes[i].getAttribute('data-ch');
    }
    return out;
  }

  function getRules() {
    var rules = [];
    var rows = document.querySelectorAll('#cl-rules .cl-rule');
    for (var i = 0; i < rows.length; i++) {
      var f = rows[i].querySelector('.cl-find');
      var r = rows[i].querySelector('.cl-rep');
      rules.push({ find: f ? f.value : '', replace: r ? r.value : '' });
    }
    // Drop fully-empty rows
    return rules.filter(function (x) { return x.find !== ''; });
  }

  function collectOpts() {
    var removeAll = $('opt-removeall') && $('opt-removeall').checked;
    var collapse = $('opt-collapse') && $('opt-collapse').checked;
    return {
      collapseEnters: collapse && !removeAll,
      collapseBlanks: ($('opt-blanksingle') && $('opt-blanksingle').checked) && !collapse && !removeAll,
      removeAllBlank: removeAll,
      extraSpaces: $('opt-spaces') && $('opt-spaces').checked,
      trimLines: $('opt-trimlines') && $('opt-trimlines').checked,
      removeSpecials: $('opt-specials') && $('opt-specials').checked,
      findReplace: $('opt-findrep') && $('opt-findrep').checked,
      trimText: $('opt-trimtext') && $('opt-trimtext').checked,
      specialChars: getSpecialChars(),
      customChars: (($('cl-custom') && $('cl-custom').value) || '').replace(/[\s,;|]+/g, ''),
      rules: getRules()
    };
  }

  // ---- Global functions (called from onclick; prefixed to avoid clashes) ----
  window.cleanerAddRule = function (find, rep) {
    var wrap = $('cl-rules');
    if (!wrap) return;
    var div = document.createElement('div');
    div.className = 'cl-rule';
    var f = document.createElement('input');
    f.className = 'cl-find'; f.value = find == null ? '' : find;
    f.setAttribute('aria-label', 'Find what'); f.placeholder = 'Find what  (e.g. ^p^p)';
    var arrow = document.createElement('span');
    arrow.style.color = 'var(--muted)'; arrow.textContent = '→';
    var r = document.createElement('input');
    r.className = 'cl-rep'; r.value = rep == null ? '' : rep;
    r.setAttribute('aria-label', 'Replace with'); r.placeholder = 'Replace with  (e.g. ^p)';
    var del = document.createElement('button');
    del.className = 'mini'; del.textContent = '✕'; del.title = 'Remove rule';
    del.setAttribute('onclick', 'cleanerDelRule(this)');
    div.appendChild(f); div.appendChild(arrow); div.appendChild(r); div.appendChild(del);
    wrap.appendChild(div);
    f.focus();
  };

  window.cleanerDelRule = function (btn) {
    var rows = document.querySelectorAll('#cl-rules .cl-rule');
    if (rows.length <= 1) { localToast('At least one rule row is kept'); return; }
    var row = btn.closest ? btn.closest('.cl-rule') : btn.parentNode;
    if (row && row.parentNode) row.parentNode.removeChild(row);
  };

  window.cleanerClean = function () {
    var input = $('cl-input'), output = $('cl-output');
    if (!input || !output) return;
    if (!input.value) { localToast('Nothing to clean — paste some text first'); return; }
    lastOriginal = input.value; // for Undo
    try {
      var res = window.BijoyTextCleaner.clean(input.value, collectOpts());
      output.value = res.text;
      // Match converter font behaviour: keep cleaner boxes in Unicode font
      // unless user pasted Bijoy — do not force; leave as-is.
      updateStats();
      var removed = (res.stats.findReplace + res.stats.specials + res.stats.spaces + res.stats.enters) || 0;
      var m = $('cl-msg');
      if (m) m.innerHTML = 'Cleaned ✓ — <b>' + removed.toLocaleString() + '</b> chars removed/normalized';
      localToast('Cleaned ✓');
    } catch (e) {
      console.error(e);
      localToast('Cleaning failed — please try again');
    }
  };

  window.cleanerUndo = function () {
    var input = $('cl-input'), output = $('cl-output');
    if (!input) return;
    if (!lastOriginal && !(output && output.value)) { localToast('Nothing to undo'); return; }
    if (lastOriginal) {
      input.value = lastOriginal;
      if (output) output.value = '';
      updateStats();
      localToast('Original restored ↩');
    }
  };

  window.cleanerClear = function () {
    var input = $('cl-input'), output = $('cl-output');
    if (input) input.value = '';
    if (output) output.value = '';
    lastOriginal = '';
    updateStats();
  };

  window.cleanerCopy = function () {
    var output = $('cl-output');
    if (!output || !output.value) { localToast('Nothing to copy'); return; }
    function done() { localToast('Cleaned text copied ✓'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(output.value).then(done, function () {
        output.select(); document.execCommand('copy'); done();
      });
    } else {
      output.select(); document.execCommand('copy'); done();
    }
  };

  // Integration with converter (read-only access to existing textareas).
  window.cleanerPull = function (which) {
    var src = which === 'output' ? $('output-text') : $('input-text');
    var dst = $('cl-input');
    if (!src || !dst) return;
    if (!src.value) { localToast('Converter ' + which + ' is empty'); return; }
    dst.value = src.value;
    updateStats();
    localToast('Pulled from converter ' + which + ' ⇩');
  };

  window.cleanerSend = function () {
    var out = $('cl-output'), dst = $('input-text');
    if (!out || !out.value) { localToast('Clean first, then send'); return; }
    if (!dst) return;
    dst.value = out.value;
    try {
      dst.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof convert === 'function') convert();
      else if (typeof updateCounts === 'function') updateCounts();
    } catch (e) {}
    localToast('Sent to converter — auto-converted ⇧');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Live char counts for cleaner boxes.
  document.addEventListener('DOMContentLoaded', function () {
    var a = $('cl-input');
    if (a) a.addEventListener('input', updateStats);
    updateStats();
  });
})();
