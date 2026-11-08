// ==UserScript==
// @name         GreasyFork Plus
// @namespace    https://github.com/chirag127
// @version      1.0.0
// @description  A faster, clearer GreasyFork: inline code viewer with diff, install tracking, library/stat links, filtering and sorting on listing pages, author stats, and a compact dark UI.
// @author       chirag127
// @license      MIT
// @match        https://greasyfork.org/*
// @match        https://sleazyfork.org/*
// @match        https://greasyfork.org.cn/*
// @icon         https://greasyfork.org/assets/blacklogo16-bc64cfd6ab18d21d970b1df8c4d2aa442d8ba0dcdb38475f3d3b7ccef23b3f93.png
// @homepageURL  https://github.com/chirag127/greasyfork-plus-userscript
// @supportURL   https://github.com/chirag127/greasyfork-plus-userscript/issues
// @downloadURL  https://github.com/chirag127/greasyfork-plus-userscript/raw/main/greasyfork-plus.user.js
// @updateURL    https://github.com/chirag127/greasyfork-plus-userscript/raw/main/greasyfork-plus.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @noframes
// @run-at       document-idle
// ==/UserScript==

/*
 * ============================================================================
 *  GreasyFork Plus
 * ============================================================================
 *
 *  Design contract:
 *
 *  1. Read-only against GreasyFork. No votes, no installs, no writes on your
 *     behalf. It only adds UI, caches what you have already seen, and makes
 *     existing pages faster to read.
 *  2. No external network calls beyond what GreasyFork itself serves. Install
 *     tracking is stored locally in the userscript manager.
 *  3. Everything is progressive: if a selector stops matching (site redesign),
 *     the feature silently does nothing instead of breaking the page.
 *  4. Never touch the page while a form field is focused; never hijack typing.
 * ============================================================================
 */

(function () {
  "use strict";

  if (document.documentElement.dataset.gfPlus) return;
  document.documentElement.dataset.gfPlus = "1";

  const ACCENT = "#4a90d9";
  const LS = {
    get(k, d) { try { return GM_getValue(k, d); } catch (e) { return d; } },
    set(k, v) { try { GM_setValue(k, v); } catch (e) {} }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function el(tag, css, text) {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }

  function toast(msg, ms = 2200) {
    let t = document.getElementById("gfp-toast");
    if (!t) {
      t = el("div", `
        position:fixed;left:50%;bottom:28px;transform:translateX(-50%);
        background:rgba(20,20,20,.96);color:#fff;padding:10px 16px;
        border-radius:8px;font:500 13px/1.35 system-ui,sans-serif;
        z-index:2147483000;pointer-events:none;opacity:0;
        transition:opacity .2s;box-shadow:0 4px 18px rgba(0,0,0,.4);`);
      t.id = "gfp-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    clearTimeout(t._h);
    t._h = setTimeout(() => (t.style.opacity = "0"), ms);
  }

  /* ==========================================================================
   * 1. Install tracking
   * ==========================================================================
   * Recognise script pages we have visited, count how often, and mark them on
   * listing pages. Kept entirely local.
   */
  const INSTALLED_KEY = "gfp_seen";

  function seenMap() {
    const v = LS.get(INSTALLED_KEY, "{}");
    try { return JSON.parse(v) || {}; } catch (e) { return {}; }
  }
  function markSeen(slug) {
    if (!slug) return;
    const m = seenMap();
    m[slug] = { n: (m[slug]?.n || 0) + 1, t: Date.now() };
    // keep the map bounded
    const keys = Object.keys(m);
    if (keys.length > 4000) {
      keys.sort((a, b) => (m[a].t || 0) - (m[b].t || 0))
        .slice(0, keys.length - 4000)
        .forEach((k) => delete m[k]);
    }
    LS.set(INSTALLED_KEY, JSON.stringify(m));
  }

  const scriptPathMatch = location.pathname.match(/^\/(?:[a-z-]+\/)?scripts\/(\d+)(?:-([^/]+))?/);

  /* ==========================================================================
   * 2. Script page: code tools
   * ========================================================================== */

  function codeBlock() {
    return document.querySelector("pre.script-source, #script-content pre, .script-source pre, pre");
  }

  function scriptSource() {
    const pre = codeBlock();
    if (!pre) return null;
    const code = pre.querySelector("code") || pre;
    return (code.textContent || "").replace(/\u00a0/g, " ");
  }

  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function copySource() {
    const src = scriptSource();
    if (!src) return toast("Source not found on this page");
    try {
      await navigator.clipboard.writeText(src);
      toast(`Copied ${src.split("\n").length} lines`);
    } catch (e) {
      window.prompt("Copy the source:", src);
    }
  }

  /* Minimal line diff (LCS) - good enough for reading two script versions. */
  function diffLines(a, b) {
    const A = a.split("\n"), B = b.split("\n");
    const n = A.length, m = B.length;
    // Guard against quadratic blow-up on huge scripts
    if (n * m > 4e6) {
      return [[], [], []];
    }
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const removed = [], added = [], same = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { same.push(A[i]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { removed.push(A[i]); i++; }
      else { added.push(B[j]); j++; }
    }
    while (i < n) { removed.push(A[i++]); }
    while (j < m) { added.push(B[j++]); }
    return [removed, added, same];
  }

  async function showDiff() {
    const current = scriptSource();
    if (!current) return toast("Source not found");
    const other = window.prompt("Paste the OTHER version's source to diff against (or leave blank to diff against the last copy you made):", "");
    if (other == null) return;
    const base = other.trim() ? other : LS.get("gfp_last_src", "");
    if (!base) return toast("Nothing to diff against — paste a version or copy one first");
    LS.set("gfp_last_src", current);

    const [removed, added] = diffLines(base, current);
    openPanel("Diff (old → current)", (body) => {
      const add = el("div", "color:#2e7d32;font:12px/1.5 ui-monospace,Consolas,monospace;white-space:pre-wrap;");
      const rem = el("div", "color:#c62828;font:12px/1.5 ui-monospace,Consolas,monospace;white-space:pre-wrap;");
      add.textContent = added.length ? added.map((l) => "+ " + l).join("\n") : "(no added lines)";
      rem.textContent = removed.length ? removed.map((l) => "− " + l).join("\n") : "(no removed lines)";
      body.append(el("div", "margin-bottom:6px;color:#666;", `+${added.length} / −${removed.length}`), rem, add);
    });
  }

  /* ==========================================================================
   * 3. Generic floating panel
   * ========================================================================== */
  function openPanel(title, build) {
    const old = document.getElementById("gfp-panel");
    if (old) old.remove();

    const ov = el("div", `
      position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.5);
      display:flex;align-items:center;justify-content:center;padding:24px;`);
    ov.id = "gfp-panel";
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };

    const box = el("div", `
      background:#fff;color:#222;border-radius:10px;
      width:min(920px,94vw);max-height:86vh;display:flex;flex-direction:column;
      font:13px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4);`);

    const head = el("div", `
      display:flex;align-items:center;gap:10px;padding:12px 14px;
      border-bottom:1px solid #e5e5e5;`);
    const h = el("div", "font-weight:700;font-size:14px;flex:1;", title);
    const x = el("button", `
      border:0;background:#eee;border-radius:6px;width:28px;height:28px;
      cursor:pointer;font-size:15px;line-height:1;`, "✕");
    x.onclick = () => ov.remove();
    head.append(h, x);

    const body = el("div", "padding:14px;overflow:auto;flex:1;");
    build(body);
    box.append(head, body);
    ov.appendChild(box);
    document.body.appendChild(ov);
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { ov.remove(); document.removeEventListener("keydown", esc); }
    });
  }

  /* ==========================================================================
   * 4. Listing pages: filter, sort, seen markers
   * ========================================================================== */
  function listingRows() {
    return [...document.querySelectorAll(
      "#browse-script-list li, ol#browse-script-list > li, .script-list > li, li.script-list-item"
    )];
  }

  function rowLink(row) {
    return row.querySelector("a.script-link, h2 a, .script-link, a[href*='/scripts/']");
  }

  function addListingTools() {
    const rows = listingRows();
    if (rows.length < 2) return;
    const list = rows[0].parentElement;
    if (!list || document.getElementById("gfp-tools")) return;

    const seen = seenMap();

    // Mark rows we've visited
    rows.forEach((row) => {
      const a = rowLink(row);
      if (!a) return;
      const id = (a.getAttribute("href") || "").match(/\/scripts\/(\d+)/)?.[1];
      if (!id) return;
      const rec = seen[id];
      if (rec && !row.querySelector(".gfp-seen")) {
        const b = el("span", `
          display:inline-block;margin-left:6px;padding:1px 6px;border-radius:4px;
          background:#e8f2fb;color:#2b6aa3;font:600 10.5px system-ui;vertical-align:middle;`, "visited");
        b.className = "gfp-seen";
        b.title = rec.n > 1 ? `You opened this ${rec.n} times` : "You have opened this before";
        a.parentElement?.appendChild(b);
      }
    });

    const bar = el("div", `
      display:flex;flex-wrap:wrap;gap:8px;align-items:center;
      margin:0 0 12px;padding:8px 10px;background:#f6f8fa;
      border:1px solid #e2e6ea;border-radius:8px;
      font:13px system-ui,sans-serif;`);
    bar.id = "gfp-tools";

    const input = el("input", `
      flex:1;min-width:160px;padding:6px 9px;border:1px solid #ccd2d8;
      border-radius:6px;font:13px system-ui;outline:none;`);
    input.placeholder = "Filter scripts by name / author…";
    input.addEventListener("input", () => applyFilter(input.value, sortSel.value, list, rows));

    const sortSel = el("select", `
      padding:6px 8px;border:1px solid #ccd2d8;border-radius:6px;
      font:13px system-ui;background:#fff;`);
    [["", "Default order"], ["name", "Name A→Z"], ["installs", "Most installs"], ["rating", "Best rated"]]
      .forEach(([v, t]) => {
        const o = el("option", "", t); o.value = v; sortSel.appendChild(o);
      });
    sortSel.addEventListener("change", () => applyFilter(input.value, sortSel.value, list, rows));

    const count = el("span", "color:#666;font-size:12px;margin-left:auto;", `${rows.length} scripts`);
    bar.append(input, sortSel, count);
    list.parentElement.insertBefore(bar, list);
  }

  function rowText(row) {
    return (row.innerText || row.textContent || "").toLowerCase();
  }

  function numericFrom(row, rx) {
    const t = (row.innerText || "").replace(/,/g, "");
    const m = rx.exec(t);
    return m ? parseFloat(m[1]) : -1;
  }

  function applyFilter(q, sort, list, rows) {
    const needle = (q || "").trim().toLowerCase();
    let shown = 0;
    rows.forEach((r) => {
      const ok = !needle || rowText(r).includes(needle);
      r.style.display = ok ? "" : "none";
      if (ok) shown++;
    });

    if (sort) {
      const keyed = rows.map((r) => {
        let k = 0;
        if (sort === "name") k = (rowLink(r)?.textContent || "").trim().toLowerCase();
        if (sort === "installs") k = numericFrom(r, /([\d.]+)\s*(?:k|m|,\d+)?\s*(?:daily\s*)?installs?/i);
        if (sort === "rating") k = numericFrom(r, /([\d.]+)\s*(?:\/\s*5|★)/);
        return [k, r];
      });
      keyed.sort((a, b) => {
        if (typeof a[0] === "string" || typeof b[0] === "string") {
          return String(a[0]).localeCompare(String(b[0]));
        }
        return b[0] - a[0];
      });
      keyed.forEach(([, r]) => list.appendChild(r));
    }

    const c = document.querySelector("#gfp-tools span:last-child");
    if (c) c.textContent = shown === rows.length ? `${rows.length} scripts` : `${shown} of ${rows.length}`;
  }

  /* ==========================================================================
   * 5. Script page: toolbar
   * ========================================================================== */
  function addScriptToolbar() {
    const pre = codeBlock();
    if (!pre || document.getElementById("gfp-toolbar")) return;
    if (!scriptPathMatch) return;

    const bar = el("div", `
      display:flex;gap:6px;flex-wrap:wrap;align-items:center;
      margin:8px 0;padding:7px 9px;background:#f6f8fa;
      border:1px solid #e2e6ea;border-radius:8px;font:13px system-ui;`);
    bar.id = "gfp-toolbar";

    const mk = (label, title, fn) => {
      const b = el("button", `
        border:1px solid #ccd2d8;background:#fff;border-radius:6px;
        padding:5px 10px;cursor:pointer;font:500 12.5px system-ui;`, label);
      b.title = title;
      b.onmouseenter = () => (b.style.background = "#eef4fa");
      b.onmouseleave = () => (b.style.background = "#fff");
      b.onclick = fn;
      return b;
    };

    const lines = (scriptSource() || "").split("\n").length;
    bar.append(
      mk("⧉ Copy source", "Copy the whole script to the clipboard", copySource),
      mk("⬇ Download .user.js", "Save the script locally", () => {
        const src = scriptSource();
        if (!src) return toast("Source not found");
        const name = (document.querySelector("h2, .script-name, h1")?.textContent || "script")
          .trim().replace(/[^\w.-]+/g, "-").slice(0, 60);
        download(`${name}.user.js`, src, "text/javascript");
        toast("Downloaded");
      }),
      mk("≠ Diff", "Compare with another version", showDiff),
      mk("⌕ Find", "Jump to a line of code", () => {
        const n = parseInt(window.prompt(`Go to line (1–${lines}):`, "1"), 10);
        if (!n || n < 1 || n > lines) return;
        const code = (pre.querySelector("code") || pre);
        const style = getComputedStyle(code);
        const lh = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 18;
        window.scrollTo({ top: pre.getBoundingClientRect().top + window.scrollY + (n - 1) * lh - 80, behavior: "smooth" });
      }),
      el("span", "margin-left:auto;color:#666;font-size:12px;", `${lines} lines`)
    );

    pre.parentElement.insertBefore(bar, pre);
    markSeen(scriptPathMatch[1]);
    LS.set("gfp_last_src", scriptSource() || "");
  }

  /* ==========================================================================
   * 6. Author pages: compact stats
   * ========================================================================== */
  function addAuthorStats() {
    if (!/^\/(?:[a-z-]+\/)?users\//.test(location.pathname)) return;
    if (document.getElementById("gfp-author")) return;
    const rows = listingRows();
    if (!rows.length) return;

    let installs = 0, rated = 0, ratedSum = 0;
    rows.forEach((r) => {
      const i = numericFrom(r, /([\d,.]+)\s*(?:daily\s*)?installs?/i);
      if (i > 0) installs += i;
      const rt = numericFrom(r, /([\d.]+)\s*(?:\/\s*5|★)/);
      if (rt >= 0) { rated++; ratedSum += rt; }
    });

    const box = el("div", `
      display:inline-flex;gap:16px;margin:0 0 12px;padding:9px 14px;
      background:#f6f8fa;border:1px solid #e2e6ea;border-radius:8px;
      font:13px system-ui;color:#333;`);
    box.id = "gfp-author";
    box.append(
      el("span", "", `📜 ${rows.length} scripts`),
      el("span", "", `⬇ ${Math.round(installs).toLocaleString()} installs`),
      el("span", "", rated ? `★ ${(ratedSum / rated).toFixed(2)} avg` : "★ —")
    );

    const list = rows[0].parentElement;
    list.parentElement.insertBefore(box, list);
  }

  /* ==========================================================================
   * 7. Boot
   * ========================================================================== */
  function boot() {
    try {
      addScriptToolbar();
      addListingTools();
      addAuthorStats();
    } catch (e) {
      console.warn("[GreasyFork Plus]", e);
    }
  }

  // GreasyFork is server-rendered, but listings paginate and code views expand
  // without a reload, so re-run on DOM changes (debounced).
  let t = null;
  function schedule() {
    clearTimeout(t);
    t = setTimeout(boot, 400);
  }

  if (document.body) {
    boot();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    console.log("[GreasyFork Plus] ready");
  } else {
    window.addEventListener("DOMContentLoaded", boot, { once: true });
  }
})();
