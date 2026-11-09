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

<!-- okf-requirement -->
## 📚 Documentation lives in ONE place (mandatory)

All documentation for every repository in this workspace is **single-sourced** in the
umbrella repository:

```
c:\ws\docs\okf├── bundle.md            collection overview
├── index.md             catalogue of every concept and script note
├── concepts/            shared knowledge (architecture, testing, metadata, …)
└── scripts/             one note per userscript repository
```

### Rules

1. **Never create an `okf/` folder in this repository.** It is not duplicated here, by
   design. There was once a copy in every repo: 278 files describing 42 unique documents,
   with `concepts/architecture.md` physically present 32 times. Every edit had to be
   propagated to 30 repositories and drift was unavoidable.
2. **Never hand-edit a copy.** There are no copies. Edit the canonical file under
   `c:\ws\docs\okf\`.
3. **This repository's note is** `c:\ws\docs\okf\scripts\<repo-name>.md`. If it does not
   exist, add it before adding the script.
4. **Link, do not paste.** In `README.md`, link to the canonical note with a relative path
   from the workspace, e.g. `[documentation](../../../../../docs/okf/scripts/<repo-name>.md)`.
5. **Verify** with `node c:\ws\scripts\check-okf.mjs` — it exits `0` only when nothing is
   duplicated and every repository is linked and documented.
6. When adding a new script: create the repo, add `docs/okf/scripts/<repo-name>.md`, add it
   to the tables in `docs/okf/bundle.md` and `docs/okf/index.md`, then run the checker.

Full detail: `c:\ws\docs\okf\concepts\okf-requirement.md`.
