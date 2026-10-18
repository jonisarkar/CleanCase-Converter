/**
 * BijoyTextCleaner — Advanced Text Cleaning / Find & Replace Style Cleaning
 * ---------------------------------------------------------------------------
 * MODULAR ADD-ON. Does NOT touch converter.js / script.js logic.
 * Safe for both Unicode Bangla and Bijoy (SutonnyMJ) text:
 *  - Only touches whitespace (\r \n \t space NBSP) and user-selected chars.
 *  - NEVER touches Bangla Unicode range U+0980–U+09FF, ZWJ/U+200C, ZWNJ/U+200D,
 *    vowel signs, hasant, nukta, etc. unless the user explicitly lists them
 *    in Custom Characters / Find & Replace.
 *  - "^p", "^l", "^t" are ONLY control codes inside Find & Replace rules,
 *    never auto-expanded in normal text.
 */
(function () {
  'use strict';

  // ---------- Word control-code helpers (Find & Replace only) ----------
  // ^p = Paragraph / Enter, ^l = Line Break, ^t = Tab
  function expandWordCodes(s) {
    if (s == null) return '';
    // Order matters: protect escaped caret "^^" first.
    var ESC = '\uE000';
    var out = String(s).split('^^').join(ESC);
    out = out.split('^p').join('\n');
    out = out.split('^P').join('\n');
    out = out.split('^l').join('\n');
    out = out.split('^L').join('\n');
    out = out.split('^t').join('\t');
    out = out.split('^T').join('\t');
    out = out.split(ESC).join('^');
    return out;
  }

  function normalizeLineEndings(text) {
    return String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  // Repeated / loop replacement: apply until stable (max 1000 passes).
  function replaceLoop(text, find, replace) {
    if (find === '') return text;
    var prev, cur = text, i = 0;
    do {
      prev = cur;
      cur = cur.split(find).join(replace);
      i++;
      // If find is contained in replace, splitting would loop forever —
      // single pass is enough in that pathological case.
      if (replace.indexOf(find) !== -1) break;
    } while (cur !== prev && i < 1000);
    return cur;
  }

  function applyFindReplaceRules(text, rules) {
    var cur = normalizeLineEndings(text);
    (rules || []).forEach(function (r) {
      if (!r || r.find === undefined || r.find === '') return;
      var find = expandWordCodes(r.find);
      var rep = expandWordCodes(r.replace == null ? '' : r.replace);
      if (find === '') return;
      cur = replaceLoop(cur, find, rep);
    });
    return cur;
  }

  // ---------- Primitive cleaning steps (all Bangla-safe) ----------

  // Collapse 2+ consecutive newlines into ONE newline (Word: ^p^p -> ^p, looped).
  function collapseMultipleEnters(text) {
    var cur = normalizeLineEndings(text);
    // Loop-style so ^p^p^p^p -> ^p as well.
    return replaceLoop(cur, '\n\n', '\n');
  }

  // "Collapse blank lines to a single blank line": allow max ONE empty line
  // between paragraphs, i.e. max 2 consecutive \n.
  function collapseBlankLinesKeepOne(text) {
    var cur = normalizeLineEndings(text);
    return replaceLoop(cur, '\n\n\n', '\n\n');
  }

  // Remove ALL blank lines: drop lines that are empty / whitespace-only,
  // but keep single line breaks between real content.
  function removeAllBlankLines(text) {
    var cur = normalizeLineEndings(text);
    var lines = cur.split('\n');
    // Preserve leading/trailing intent via final trim decided by caller.
    var kept = [];
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      kept.push(lines[i]);
    }
    return kept.join('\n');
  }

  // Collapse runs of spaces/tabs/NBSP (NOT newlines) into a single space.
  function collapseExtraSpaces(text) {
    // [ \t\u00A0\u1680...] — horizontal whitespace only, never \n.
    // \u200C \u200D (ZWJ/ZWNJ) and \u200B are intentionally excluded.
    return String(text).replace(/[ \t\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]+/g, ' ');
  }

  function trimLineEdges(text) {
    var cur = normalizeLineEndings(text);
    return cur.split('\n').map(function (ln) {
      // Trim only space/tab/NBSP at edges — never Bangla marks.
      return ln.replace(/^[ \t\u00A0\u2000-\u200A\u202F\u205F\u3000]+/, '')
               .replace(/[ \t\u00A0\u2000-\u200A\u202F\u205F\u3000]+$/, '');
    }).join('\n');
  }

  function escapeRegExp(s) {
    // NOTE: '-' must be escaped — inside a [...] class an unescaped
    // hyphen between two chars forms a RANGE (e.g. custom "-x" after
    // "*#[]" silently ate all lowercase a–w). Found by unit test.
    return s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
  }

  // Remove exactly the selected literal characters (no regex side effects).
  function removeChars(text, chars) {
    if (!chars) return text;
    var uniq = [];
    var seen = {};
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      if (!seen[c]) { seen[c] = 1; uniq.push(c); }
    }
    if (!uniq.length) return text;
    var re = new RegExp('[' + escapeRegExp(uniq.join('')) + ']', 'g');
    return String(text).replace(re, '');
  }

  // ---------- Main pipeline ----------
  function clean(text, opts) {
    opts = opts || {};
    var cur = normalizeLineEndings(text == null ? '' : String(text));
    var stats = { findReplace: 0, specials: 0, spaces: 0, enters: 0 };

    function countDiff(a, b, key) {
      stats[key] += Math.abs(a.length - b.length);
    }

    // 1) Custom Find & Replace (Word codes expanded, looped)
    if (opts.findReplace && opts.rules && opts.rules.length) {
      var before = cur;
      cur = applyFindReplaceRules(cur, opts.rules);
      countDiff(before, cur, 'findReplace');
    }

    // 2) Special-character removal (default "*#[]" + user custom string)
    if (opts.removeSpecials) {
      var before2 = cur;
      // Custom field is a separator-style list (e.g. "* # [ ] @").
      // Spaces/commas/semicolons are separators, NOT removal targets —
      // otherwise typing the placeholder example would delete all spaces.
      var custom = String(opts.customChars || '').replace(/[\s,;|]+/g, '');
      var chars = (opts.specialChars || '') + custom;
      cur = removeChars(cur, chars);
      countDiff(before2, cur, 'specials');
    }

    // 3) Trim each line's edges
    if (opts.trimLines) {
      cur = trimLineEdges(cur);
    }

    // 4) Collapse extra spaces (horizontal only)
    if (opts.extraSpaces) {
      var before4 = cur;
      cur = collapseExtraSpaces(cur);
      countDiff(before4, cur, 'spaces');
    }

    // 5) Paragraph / blank-line handling
    if (opts.removeAllBlank) {
      var before5 = cur;
      cur = removeAllBlankLines(cur);
      countDiff(before5, cur, 'enters');
      // After joining, stray spaces around newlines may appear.
      if (opts.trimLines) cur = trimLineEdges(cur);
      if (opts.extraSpaces) cur = collapseExtraSpaces(cur);
    } else if (opts.collapseEnters) {
      var before6 = cur;
      // Default requested behaviour: multiple Enter -> single Enter (^p^p -> ^p)
      cur = collapseMultipleEnters(cur);
      countDiff(before6, cur, 'enters');
    } else if (opts.collapseBlanks) {
      var before7 = cur;
      cur = collapseBlankLinesKeepOne(cur);
      countDiff(before7, cur, 'enters');
    }

    // 6) Trim whole text edges
    if (opts.trimText) {
      cur = cur.replace(/^[ \t\u00A0\u2000-\u200A\u202F\u205F\u3000\n]+/, '')
               .replace(/[ \t\u00A0\u2000-\u200A\u202F\u205F\u3000\n]+$/, '');
    }

    return { text: cur, stats: stats };
  }

  // ---------- Expose (no name clash with existing globals) ----------
  var api = {
    clean: clean,
    expandWordCodes: expandWordCodes,
    applyFindReplaceRules: applyFindReplaceRules,
    collapseMultipleEnters: collapseMultipleEnters,
    collapseBlankLinesKeepOne: collapseBlankLinesKeepOne,
    removeAllBlankLines: removeAllBlankLines,
    collapseExtraSpaces: collapseExtraSpaces,
    trimLineEdges: trimLineEdges,
    removeChars: removeChars,
    replaceLoop: replaceLoop,
    normalizeLineEndings: normalizeLineEndings
  };

  if (typeof window !== 'undefined') window.BijoyTextCleaner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
