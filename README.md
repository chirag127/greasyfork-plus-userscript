# ⚡ GreasyFork Plus

A faster, clearer **[GreasyFork](https://greasyfork.org)** — one userscript that replaces the pile of overlapping "GreasyFork enhancer" scripts with a single, small, read-only tool.

Works on **greasyfork.org**, **sleazyfork.org** and **greasyfork.org.cn**.

## Install

First read the shared **[userscript install guide](https://github.com/chirag127/userscript-install-guide)** (set up ScriptCat / Tampermonkey once).

Then click:

**[Install greasyfork-plus.user.js](https://github.com/chirag127/greasyfork-plus-userscript/raw/main/greasyfork-plus.user.js)**

## What it does

**On a script page**
- ⧉ **Copy source** — whole script to the clipboard, with a line count
- ⬇ **Download .user.js** — saves it locally
- ≠ **Diff** — compare the current version against another version you paste in
- ⌕ **Find / go to line** — jump straight to a line
- Tracks which scripts you've opened

**On listing & search pages**
- 🔎 **Instant filter** by name or author
- ↕ **Sort** by name, installs or rating
- 👁 **"visited"** badge on scripts you've already opened (stored locally)
- Live "n of m" result count

**On author pages**
- 📜 script count · ⬇ total installs · ★ average rating, summarised at the top

## Privacy & safety

- **Read-only.** It never votes, installs, flags or edits anything on GreasyFork.
- **No third-party requests.** It only reads pages GreasyFork itself serves.
- Your "visited" history is stored **locally** in your userscript manager and never uploaded.

## Why one script instead of several

Enhancer scripts commonly overlap (filtering, sorting, install tracking, code tools). Running several means duplicate UI, conflicting listeners and slower pages. This does the common set once, in ~440 lines, with no dependencies.

## License

[MIT](LICENSE) © 2026 chirag127

<!-- docs-single-source -->
## 📚 Documentation

Documentation for this repository lives in the umbrella workspace, in exactly **one** place:

| What | Where |
|------|-------|
| This script's note | [`docs/okf/scripts/greasyfork-plus-userscript.md`](../../../../../docs/okf/scripts/greasyfork-plus-userscript.md) |
| All notes, catalogued | [`docs/okf/index.md`](../../../../../docs/okf/index.md) |
| Shared knowledge | [`docs/okf/concepts/`](../../../../../docs/okf/concepts/) |

It is **not** copied into this repository. Nothing in this workspace is duplicated: one
document, one file. Verify with `node c:\ws\scripts\check-okf.mjs`.
