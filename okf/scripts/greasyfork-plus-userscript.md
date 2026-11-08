---
type: Script
title: GreasyFork Plus
description: A single read-only GreasyFork enhancer replacing the usual pile of overlapping ones — code copy/download/diff/find, listing filter and sort, visited badges, author stats.
repo: https://github.com/chirag127/greasyfork-plus-userscript
install: https://github.com/chirag127/greasyfork-plus-userscript/raw/main/greasyfork-plus.user.js
version: "1.0.0"
tags: [userscript, greasyfork, sleazyfork, enhancer]
timestamp: 2026-06-15T00:00:00Z
---

# GreasyFork Plus

Written to replace eight overlapping "GreasyFork enhancer" scripts that had accumulated in
ScriptCat (Greasy Fork++, Enhance, Helper, Premium, Better Greasy Fork, Install Tracker, a
"Show Favorites" redirect, and a Sleazyfork search integration). Those were deleted; this is
the single replacement.

The originals' source was not available to merge, so this is a **fresh implementation of the
common feature set**, not a merge of their code.

## Features

**Script pages**
- ⧉ Copy source
- ⬇ Download `.user.js`
- ≠ Diff against another version (LCS line diff, guarded against quadratic blow-up)
- ⌕ Go to line
- Records that you visited the script

**Listing and search pages**
- Instant filter by name or author
- Sort by name, installs or rating
- `visited` badge on scripts opened before (stored locally)

**Author pages**
- Script count, total installs, average rating

## Contract

1. **Read-only.** Never votes, installs, flags or submits anything on the user's behalf.
2. **No third-party requests.** Only pages GreasyFork itself serves.
3. **Local storage only** for visit history (`GM_getValue` / `GM_setValue`, with a graceful
   fallback).
4. **Progressive.** If a selector stops matching after a redesign the feature does nothing —
   it must never throw and never break the page.
5. **Debounced** observer (400 ms).

## Verification status

⚠️ The logic was verified **offline** — selectors against a synthetic fixture, and the diff
and number-parsing functions directly (`b`→`X` isolated, `1,200` → `1200`, no-match → `-1`).
It has **not** been exercised against the live site: greasyfork.org served a Cloudflare bot
check during development, and working around that check is out of scope for this collection.

## See also

- [Testing rules](../concepts/testing.md)
- [Userscript metadata](../concepts/userscript-metadata.md)
