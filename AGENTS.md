# AGENTS.md — greasyfork-plus-userscript

Single-file userscript. `greasyfork-plus.user.js` at the repo root IS the product. No build step, no dependencies.

## Contract (do not break these)

1. **Read-only against GreasyFork.** Never vote, install, flag or submit anything on the user's behalf.
2. **No third-party network calls.** Only GreasyFork's own pages.
3. **Local storage only** for visit history (`GM_getValue`/`GM_setValue`, falls back gracefully).
4. **Progressive enhancement.** If a selector stops matching after a site redesign, the feature must do nothing — never throw and never break the page. All entry points run inside `try/catch`.
5. **Debounced** MutationObserver (400ms). Do not run DOM work on every mutation.
6. Never interfere with typing in inputs/textareas/contenteditable.

## Structure

| Function | Responsibility |
|---|---|
| `boot()` | entry point; calls the three adders |
| `addScriptToolbar()` | copy / download / diff / find on `/scripts/<id>` pages |
| `addListingTools()` | filter, sort, visited badges on list/search pages |
| `addAuthorStats()` | aggregate stats on `/users/...` pages |
| `diffLines()` | LCS line diff; guarded against quadratic blow-up (`n*m > 4e6`) |
| `openPanel()` | generic modal used by diff; Escape closes |
| `markSeen()` | bounded local visit history (max 4000 entries) |

## Rules for changes

- Bump `@version` (semver). Keep `@updateURL`/`@downloadURL` on raw `main`.
- Add a `@match` only for a real GreasyFork/SleazyFork domain.
- Any new feature must degrade to a no-op when its selectors are absent.
- Update the README feature list when behaviour changes.

## Install docs

Shared guide: https://github.com/chirag127/userscript-install-guide — link it, never duplicate install steps.

## Test

`sctl install <raw url>`, then open a script page (toolbar + line count), a listing page (filter/sort/visited), and an author page (stats).
