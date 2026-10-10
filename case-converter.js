/**
 * CaseConverter — English-only text case transforms (7 options).
 * ---------------------------------------------------------------------------
 * STRICTLY English A-Z / a-z. Bangla text (Unicode U+0980–U+09FF, ZWJ/ZWNJ,
 * vowel signs, hasant, etc.) and ALL non-ASCII letters are NEVER touched —
 * every transform maps ASCII bytes only, so Bangla passes through 1:1.
 * Bijoy (SutonnyMJ) legacy text IS ASCII bytes, so case-converting it
 * WILL corrupt it — callers must run looksLikeBijoyRisk() first and
 * ask for confirmation (see views.js).
 */
(function () {
  'use strict';

  // ASCII-only helpers: leave every non A-Z/a-z code point untouched
  // (unlike String.toLowerCase which also folds é, Cyrillic, Turkish İ…).
  function asciiLower(s) {
    return String(s == null ? '' : s).replace(/[A-Z]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) + 32);
    });
  }
  function asciiUpper(s) {
    return String(s == null ? '' : s).replace(/[a-z]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 32);
    });
  }
  function asciiCapWord(core) {
    if (!core) return core;
    var low = asciiLower(core);
    return asciiUpper(low.charAt(0)) + low.slice(1);
  }
  // True when there is at least one English letter to convert.
  function hasEnglish(text) {
    return /[A-Za-z]/.test(String(text == null ? '' : text));
  }

  // Sentence case (English only): ascii-lowercase everything, then
  // uppercase the first ASCII letter of the text and of every sentence
  // after . ! ? … (newlines also restart). Bangla/punct preserved.
  function toSentence(text) {
    var s = asciiLower(text);
    return s.replace(/(^|[.!?…\n\r]+[\s"'“”‘’\(\[\{]*)[a-z]/g, function (m) {
      return asciiUpper(m);
    });
  }

  function toLower(text) {
    return asciiLower(text);
  }

  function toUpper(text) {
    return asciiUpper(text);
  }

  // Capitalized Case (English only): first ASCII letter of each word
  // upper, rest ascii-lowered. Bangla words pass through unchanged.
  function toCapitalized(text) {
    var s = asciiLower(text);
    return s.replace(/(^|[\s\n\r\t.,;:!?()\[\]{}"'“”‘’\-_/\\|@#$%^&*+=~<>]+)([a-z])/g, function (m, pre, ch) {
      return pre + asciiUpper(ch);
    });
  }

  // aLtErNaTiNg: alternate per ALPHABETIC char only (ignore spaces,
  // punctuation, digits, Bangla, emoji). Starts lowercase.
  function toAlternating(text) {
    var s = String(text == null ? '' : text);
    var out = '';
    var idx = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (/[A-Za-z]/.test(c)) {
        out += (idx % 2 === 0) ? c.toLowerCase() : c.toUpperCase();
        idx++;
      } else {
        out += c;
      }
    }
    return out;
  }

  // Title Case rule (English only, documented, predictable):
  // - Ascii-lowercase whole word first, then capitalize principal words.
  // - Keep small words lowercase in the middle: articles (a an the),
  //   coordinating conjunctions (and but or nor for so yet),
  //   short prepositions (as at by in of on to up via vs over under
  //   with from into onto upon between among through during before
  //   after above below per without).
  // - ALWAYS capitalize first and last word.
  // - Hyphenated parts are each treated as words (e.g. "well-known").
  // - Bangla / non-ASCII tokens are skipped entirely.
  function toTitle(text) {
    var SMALL = {
      a: 1, an: 1, the: 1,
      and: 1, but: 1, or: 1, nor: 1, for: 1, so: 1, yet: 1,
      as: 1, at: 1, by: 1, in: 1, of: 1, on: 1, to: 1, up: 1,
      via: 1, vs: 1, 'vs.': 1, over: 1, under: 1, with: 1, from: 1,
      into: 1, onto: 1, upon: 1, between: 1, among: 1, through: 1,
      during: 1, before: 1, after: 1, above: 1, below: 1, per: 1,
      without: 1
    };
    var s = String(text == null ? '' : text);
    // Split preserving whitespace so paragraph breaks survive.
    var parts = s.split(/(\s+)/);
    // Collect indices of real words (contain at least one letter).
    var wordIdx = [];
    for (var i = 0; i < parts.length; i++) {
      if (/[A-Za-z]/.test(parts[i])) wordIdx.push(i);
    }
    for (var w = 0; w < wordIdx.length; w++) {
      var pi = wordIdx[w];
      var isFirst = (w === 0), isLast = (w === wordIdx.length - 1);
      // Handle hyphenated compounds part-by-part, preserving separators.
      var segs = parts[pi].split(/(-)/);
      for (var k = 0; k < segs.length; k++) {
        if (segs[k] === '-' || !/[A-Za-z]/.test(segs[k])) continue;
        // Separate leading/trailing punctuation from the core word.
        var m = segs[k].match(/^([^A-Za-z]*)([A-Za-z][A-Za-z'.]*)([^A-Za-z]*)$/);
        if (!m) continue;
        var core = m[2];
        var low = asciiLower(core);
        var out;
        if (!isFirst && !isLast && SMALL[low]) {
          out = low; // keep small word lowercase
        } else {
          out = asciiCapWord(core);
        }
        segs[k] = m[1] + out + m[3];
      }
      parts[pi] = segs.join('');
    }
    return parts.join('');
  }

  // iNvErSe: swap ASCII case per char; everything else untouched.
  function toInverse(text) {
    var s = String(text == null ? '' : text);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c >= 'a' && c <= 'z') out += c.toUpperCase();
      else if (c >= 'A' && c <= 'Z') out += c.toLowerCase();
      else out += c;
    }
    return out;
  }

  // Heuristic: true when text has NO Bangla Unicode but contains ASCII
  // letters AND (converter is in Bijoy-input mode OR text has Bijoy-ish
  // bytes like ~ ` _ ^ { } which rarely appear in plain English).
  // Plain English also returns false unless forced — the persistent
  // warning banner in the UI covers the general case.
  function looksLikeBijoyRisk(text, converterMode) {
    var s = String(text == null ? '' : text);
    if (!s) return false;
    if (/[\u0980-\u09FF]/.test(s)) return false; // real Unicode Bangla: safe
    if (!/[A-Za-z]/.test(s)) return false;
    if (converterMode === 'B2U') return true;
    return /[~`_{}^\\|<>]/.test(s);
  }

  var api = {
    sentence: toSentence, lower: toLower, upper: toUpper,
    capitalized: toCapitalized, alternating: toAlternating,
    title: toTitle, inverse: toInverse, hasEnglish: hasEnglish,
    looksLikeBijoyRisk: looksLikeBijoyRisk
  };

  if (typeof window !== 'undefined') window.CaseConverter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
