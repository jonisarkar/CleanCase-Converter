# CleanCase Converter — Fast & Accurate Bangla Tool

Free, fast, offline **CleanCase Converter**: Bangla **Unicode ⇄ Bijoy (SutonnyMJ)** converter with **Advanced Text Cleaning** and **Text Case Converter (Sc lc UC CC aC TC iC)**.

No signup. No server. Runs 100% locally in the browser.

## Navigation (single-display)

- **Converter** tab → Unicode ⇄ Bijoy converter (default view).
- **Cleaning** tab → Advanced Text Cleaning.
- **Case** tab (also via ⋮ menu) → Text Case Converter.
- Only one tool view is visible at a time; text + settings are preserved when switching. Last view is remembered in `localStorage`.
- Tabs use `role=tablist` with arrow-key navigation and roving tabindex.

## Three-dot menu (⋮, header)

Compact dropdown, closes on select / outside-click / `Escape` — jumps between the 3 tool views:

- ⇄ Converter → Converter view (Unicode ⇄ Bijoy)
- 🧹 Cleaning → Cleaning view (advanced text cleaning)
- `Aa` Case → Case view (Sc • lc • UC • CC • aC • TC • iC)

(`views.js` also ships reusable `quickClean()` helpers on top of `BijoyTextCleaner` — ready to wire to future menu items; no duplicated logic.)

## Text Case Converter (7 options, English-only)

Converts **A–Z / a–z only**. Bangla text (`U+0980–U+09FF`), ZWJ/ZWNJ, vowel signs — and every non-ASCII letter (é, İ, Cyrillic…) — pass through byte-for-byte. If input has no English letters, output = input unchanged with message “English-only — Bangla unchanged”. Mixed text: only the English words change, Bangla stays exact.

| Code | Name | Rule | Example |
|------|------|------|---------|
| `Sc` | Sentence case | lowercase all, uppercase first letter after start / `. ! ? …` / newline | `HELLO WORLD. WELCOME…` → `Hello world. Welcome…` |
| `lc` | lower case | `toLowerCase()` | `HELLO WORLD` → `hello world` |
| `UC` | UPPER CASE | `toUpperCase()` | `Hello World` → `HELLO WORLD` |
| `CC` | Capitalized Case | first letter of each word upper, rest lower | `hello WORLD from bangladesh` → `Hello World From Bangladesh` |
| `aC` | aLtErNaTiNg cAsE | alternate per alphabetic `[A-Za-z]` only, start lowercase; spaces/punct/Bangla ignored | `hello world` → `hElLo WoRlD` |
| `TC` | Title Case | capitalize principal words; keep articles/conjunctions/short prepositions (`a an the and but or nor for so yet as at by in of on to up via vs over under with from into onto upon between among through during before after above below per without`) lowercase in the middle; always capitalize first/last; hyphen parts handled separately | `the quick brown fox jumps over the lazy dog` → `The Quick Brown Fox Jumps over the Lazy Dog` |
| `iC` | iNvErSe CaSe | swap ASCII case per char | `Hello WORLD` → `hELLO world` |

Workspace: input (Paste / Clear / chars+words), 7-button toolbar (horizontally scrollable on mobile, `applied` highlight), output (Copy / Input ← Output / TXT download), Undo (25-step) / Reset / Swap. Bangla Unicode (`U+0980–U+09FF`), ZWJ/ZWNJ, vowel signs are never touched.

**Bijoy safety:** Bijoy legacy text is ASCII bytes — case-converting corrupts it. When `CaseConverter.looksLikeBijoyRisk()` fires (no Bangla Unicode + ASCII letters + `B2U` mode or Bijoy-ish bytes `~ \` _ ^ { }`), a ⚠ warning toast is shown before applying (non-blocking), and a persistent warning banner sits above the Case workspace.

## Features

### 1. Unicode ⇄ Bijoy Converter
- **Unicode → Bijoy** (default) and **Bijoy → Unicode** modes
- **Live auto-convert** as you type (debounced ~120ms)
- Proper re-ordering of reph, kar & jukto-borno for print-ready Bijoy
- Char + word counters for input/output
- `Copy output`, `Download .txt`, `Paste`, `Clear`
- `Clear` is **undoable** — an `Undo clear` button appears for 8 seconds after every wipe
- Swap direction + swap text with `⇄` button
- `Ctrl + Enter` to convert instantly

### 2. Advanced Text Cleaning (Unicode + Bijoy Safe)
MS Word-style **Find & Replace** cleaning that never breaks Bangla letters, kars, folas, or Bijoy codes — only touches whitespace and user-selected chars.

Options:
- [x] Multiple Enter → Single Enter (`^p^p → ^p`, looped)
- [ ] Keep max one blank line (3+ Enter → 1 blank line)
- [ ] Remove ALL blank lines
- [x] Remove extra spaces (multiple space → single)
- [x] Trim line start/end spaces
- [x] Remove special characters (ticked chars only)
- [x] Custom Find & Replace (looped, `^p ^l ^t` supported)
- [x] Trim text start/end

Word codes (Find & Replace rules only):
- `^p` = Enter / Paragraph
- `^l` = Line break
- `^t` = Tab
- `^^` = literal `^` (e.g. Find `^^p` = text "^p")

Integration:
- `⇩ Converter input / output` → pull text into cleaner
- `⇧ Send to converter` → send cleaned text back + auto-convert
- `↩ Undo` restores original

### 3. UI / UX
- Dark / Light theme with **Auto mode** (◐ button) — follows the phone/OS color scheme live; manual toggle remembers your choice in `localStorage` (`bijoy-theme` / `bijoy-theme-auto`)
- Full display / focus mode (`F` key or expand button)
- Glassmorphism + royal blue theme, responsive (1-col mobile, 2-col desktop)
- 44px touch targets on touch devices; single blue accent family in both themes
- Static (animation-free) mesh background + instant CSS tap feedback — fast on low-end phones (no per-frame GPU work, no JS on tap)
- Toast notifications
- Bundled local fonts — no install needed:
  - `Bangla.ttf` → Unicode (`BanglaLocal`)
  - `SutonnyMJ.ttf` → Bijoy (`SutonnyMJ`)
- Press-ready output for InDesign / Illustrator / Bijoy documents

## Project Structure

```
BIJOY/
├── index.html      # UI + CSS (converter / cleaning / case views, ⋮ menu, tabs)
├── converter.js    # BanglaConverter.unicodeToBijoy() / bijoyToUnicode()
├── script.js       # Converter UI logic, modes, theme, full-display, clipboard
├── cleaner.js      # BijoyTextCleaner.clean() — Bangla-safe pipeline, no DOM
├── cleaner-ui.js   # Cleaner DOM wiring, rules, pull/send/undo/copy
├── case-converter.js # CaseConverter: sentence/lower/upper/capitalized/alternating/title/inverse + Bijoy guard
├── views.js        # showView tabs, ⋮ menu, quick cleans, case workspace, cross-tool transfers
├── logo.png        # Brand logo / favicon
├── Bangla.ttf      # Local Unicode Bangla font
├── SutonnyMJ.ttf   # Local Bijoy font
└── README.md       # This file
```

## How to Run

No build step. Static files only.

1. Double-click `index.html` to open in browser, **or**
2. Serve locally (recommended for clipboard API):
```powershell
# Python
python -m http.server 8000
# then open http://localhost:8000/
```
```powershell
# Node
npx serve .
```

Works offline after first load (Google Fonts excepted — local Bangla/SutonnyMJ fonts work fully offline).

## PWA (Install App)

Installable + fully offline via `manifest.webmanifest` + `sw.js` (cache-first app shell, runtime-cached Google Fonts, `icon-192.png` / `icon-512.png` generated from `logo.png`):

1. Serve over `http(s)` — service workers do **not** run on `file://`:
```powershell
python -m http.server 8000
# then open http://localhost:8000/
```
2. After first load, an **Install** (⤓) button appears in the header (Chrome/Edge/Android). Tap it to install.
3. iPhone/Safari: Share → **Add to Home Screen** (uses `icon-192.png` + standalone display).
4. To force-update the offline cache after editing files, bump `CACHE` in `sw.js` (e.g. `cleancase-v4`).

## Usage

### Convert
1. Choose `Unicode → Bijoy` or `Bijoy → Unicode`
2. Type / paste into Input — output appears live
3. `Convert Now` or `Ctrl + Enter` to force convert
4. `Copy output` / `Download .txt`

### Clean
1. Paste into `Original Text (Before)` or `⇩ Converter input/output`
2. Tick options, select special chars `* # [ ] @ % & $ ~ ^`, add custom chars, add Find/Replace rules
3. `🧹 Clean Text` → check `Cleaned Text (After)`
4. `Copy cleaned` or `⇧ Send to converter`

Default cleaner rule ships as: Find `^p^p` → Replace `^p`.

### Shortcuts
- `Ctrl + Enter` = Convert
- `F` (outside text fields) = Toggle full display
- `← / →` on tabs = Move between Converter / Cleaning / Case
- `Escape` = Close ⋮ menu (focus returns to ⋮ button)

## API

```js
// converter.js
BanglaConverter.unicodeToBijoy(text) // string -> Bijoy/SutonnyMJ
BanglaConverter.bijoyToUnicode(text) // string -> Unicode

// cleaner.js
BijoyTextCleaner.clean(text, opts)
// opts: {
//   collapseEnters, collapseBlanks, removeAllBlank,
//   extraSpaces, trimLines, removeSpecials,
//   findReplace, trimText,
//   specialChars: "*#[]", customChars: "@%$",
//   rules: [{find:"^p^p", replace:"^p"}]
// }
// returns { text, stats:{findReplace, specials, spaces, enters} }

// case-converter.js (Bangla-safe, Latin-only)
CaseConverter.sentence(text)
CaseConverter.lower(text) / .upper(text)
CaseConverter.capitalized(text)
CaseConverter.alternating(text) // per [A-Za-z], start lower
CaseConverter.title(text)       // documented small-word list
CaseConverter.inverse(text)
CaseConverter.looksLikeBijoyRisk(text, converterMode) // bool

// views.js (add-on, no logic duplication)
showView('converter'|'cleaning'|'case', {focus})
applyCase('sentence'|'lower'|'upper'|'capitalized'|'alternating'|'title'|'inverse')
sendConverterToCleaner('input'|'output')
sendConverterToCase('input'|'output')
sendCleanerToConverter() / sendCleanerToCase()
sendCaseToConverter() / sendCaseToCleaner()
casePaste/caseCopy/caseReplace/caseSwap/caseDownload/caseUndo/caseReset/caseStats()

BijoyTextCleaner.expandWordCodes(s)
BijoyTextCleaner.collapseMultipleEnters(text)
BijoyTextCleaner.collapseExtraSpaces(text)
// ... etc.
```

## Safety Notes

`cleaner.js` intentionally:
- Never touches Unicode range `U+0980–U+09FF`, ZWJ `U+200C`, ZWNJ `U+200D`
- Collapses only horizontal whitespace `[ space \t NBSP ...]`, never `\n` (except paragraph options)
- `^p/^l/^t` expanded **only** inside Find & Replace rules, never in normal text
- `replaceLoop()` applies until stable (max 1000 passes), safe against `find` in `replace`

`script.js` swap is silent (no re-convert) to avoid corrupting already-converted text; mode toggle swaps then converts fresh in new mode.

## Browser Support

Modern Chrome / Edge / Firefox. Clipboard `readText` requires localhost / HTTPS — falls back to `Ctrl+V` prompt.

## License / Credits

Built for professional Bangla creators. Converter engine ported from fontconverter logic. Fonts bundled locally.
