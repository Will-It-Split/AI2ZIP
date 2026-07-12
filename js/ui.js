// ui.js — renders the file tree, right-panel summary, modals, context menus
import { icon, hydrateIcons, getFileMeta, escapeHtml, formatBytes, toast } from "./utils.js";

const collapsedFolders = new Set();

export function renderTree(store, container, emptyEl, { activePath, onOpenFile, onContextMenu, searchTerm }) {
  const root = store.buildTree();
  const hasFiles = store.fileCount() > 0;
  emptyEl.style.display = hasFiles ? "none" : "flex";
  container.innerHTML = "";
  if (!hasFiles) return;

  const term = (searchTerm || "").toLowerCase().trim();

  function matches(node) {
    if (!term) return true;
    if (node.type === "file") return node.path.toLowerCase().includes(term);
    return node.children.some(matches);
  }

  function renderNode(node, depth) {
    if (!matches(node)) return "";
    if (node.type === "folder") {
      const collapsed = collapsedFolders.has(node.path);
      const childrenHtml = node.children.map((c) => renderNode(c, depth + 1)).join("");
      return `<li class="tree-node folder-node ${collapsed ? "collapsed" : ""}" data-path="${escapeHtml(node.path)}" data-type="folder">
        <div class="tree-row" style="padding-left:${depth * 16 + 8}px" data-path="${escapeHtml(node.path)}" data-type="folder">
          <span class="tree-caret">${icon("chevron-right")}</span>
          <span class="tree-icon folder-icon">${icon("folder")}</span>
          <span class="tree-label">${escapeHtml(node.name)}</span>
        </div>
        <ul class="tree-children">${childrenHtml}</ul>
      </li>`;
    }
    const meta = getFileMeta(node.name);
    const active = node.path === activePath ? "active" : "";
    const hasWarnings = node.warnings && node.warnings.length > 0;
    return `<li class="tree-node file-node ${active}" data-path="${escapeHtml(node.path)}" data-type="file">
      <div class="tree-row" style="padding-left:${depth * 16 + 24}px" data-path="${escapeHtml(node.path)}" data-type="file">
        <span class="file-badge" style="background:${meta.color}22;color:${meta.color}">${escapeHtml(meta.label.slice(0, 3))}</span>
        <span class="tree-label">${escapeHtml(node.name)}</span>
        ${hasWarnings ? `<span class="tree-warn" title="${escapeHtml(node.warnings.join('; '))}">${icon("warning")}</span>` : ""}
      </div>
    </li>`;
  }

  const rootLabel = hasFiles ? `<li class="tree-node folder-node root-node" data-path="" data-type="root">
      <div class="tree-row root-row">
        <span class="tree-caret">${icon("chevron-right")}</span>
        <span class="tree-icon root-icon">${icon("zip")}</span>
        <span class="tree-label root-label">AI2ZIP Project</span>
      </div>
      <ul class="tree-children">${root.children.map((c) => renderNode(c, 1)).join("")}</ul>
    </li>` : "";

  container.innerHTML = rootLabel;
  hydrateIcons(container);

  container.querySelectorAll(".tree-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      const path = row.dataset.path;
      const type = row.dataset.type;
      if (type === "folder" || type === "root") {
        if (collapsedFolders.has(path)) collapsedFolders.delete(path);
        else collapsedFolders.add(path);
        row.closest(".tree-node").classList.toggle("collapsed");
      } else {
        onOpenFile?.(path);
      }
    });
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      onContextMenu?.(e, row.dataset.path, row.dataset.type);
    });
  });
}

export function renderSummary(store, container) {
  const files = [...store.files.values()];
  if (files.length === 0) {
    container.innerHTML = `<div class="summary-empty">Parse a response to see file details, warnings and duplicate suggestions here.</div>`;
    return;
  }
  const warningFiles = files.filter((f) => f.warnings?.length);
  const byExt = {};
  files.forEach((f) => {
    const meta = getFileMeta(f.path);
    byExt[meta.label] = (byExt[meta.label] || 0) + 1;
  });

  container.innerHTML = `
    <div class="summary-block">
      <div class="summary-stat-grid">
        <div class="summary-stat"><span class="num">${files.length}</span><span class="lbl">Files</span></div>
        <div class="summary-stat"><span class="num">${store.folderCount()}</span><span class="lbl">Folders</span></div>
        <div class="summary-stat"><span class="num">${formatBytes(store.estimatedSizeBytes())}</span><span class="lbl">Raw Size</span></div>
        <div class="summary-stat ${warningFiles.length ? "warn" : ""}"><span class="num">${warningFiles.length}</span><span class="lbl">Warnings</span></div>
      </div>
    </div>
    <div class="summary-block">
      <div class="summary-title">File Types</div>
      <div class="type-chips">
        ${Object.entries(byExt).map(([ext, count]) => `<span class="chip">${escapeHtml(ext)} <b>${count}</b></span>`).join("")}
      </div>
    </div>
    ${warningFiles.length ? `
    <div class="summary-block">
      <div class="summary-title">Warnings</div>
      <div class="warning-list">
        ${warningFiles.map((f) => `
          <div class="warning-item">
            <div class="warning-item-path">${escapeHtml(f.path)}</div>
            <ul>${f.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>
          </div>`).join("")}
      </div>
    </div>` : ""}
  `;
}

export function updateStatusBar(store) {
  const files = store.fileCount();
  const folders = store.folderCount();
  const warnings = store.totalWarnings();
  document.getElementById("status-files").innerHTML = `${files} <small>file${files === 1 ? "" : "s"}</small>`;
  document.getElementById("status-folders").innerHTML = `${folders} <small>folder${folders === 1 ? "" : "s"}</small>`;
  document.getElementById("status-warnings").innerHTML = `${warnings} <small>warning${warnings === 1 ? "" : "s"}</small>`;
  document.getElementById("status-warnings-wrap").classList.toggle("has-warnings", warnings > 0);

  const readyEl = document.getElementById("status-ready-text");
  const card = readyEl.closest(".stat-card");
  if (files === 0) {
    readyEl.textContent = "Waiting for Input";
    card.classList.remove("ready"); card.classList.add("idle");
  } else if (warnings > 0) {
    readyEl.textContent = "Ready (with warnings)";
    card.classList.remove("idle"); card.classList.add("ready", "warn");
  } else {
    readyEl.textContent = "Ready to Export";
    card.classList.remove("idle", "warn"); card.classList.add("ready");
  }
}

/* ---------------- Modal helpers ---------------- */
export function openModal(id) {
  document.getElementById("modal-backdrop").classList.add("show");
  document.getElementById(id).classList.add("show");
}
export function closeAllModals() {
  document.getElementById("modal-backdrop").classList.remove("show");
  document.querySelectorAll(".modal").forEach((m) => m.classList.remove("show"));
}

/* ---------------- Context menu ---------------- */
let ctxMenuEl = null;
export function showContextMenu(x, y, items) {
  hideContextMenu();
  ctxMenuEl = document.createElement("div");
  ctxMenuEl.className = "ctx-menu";
  ctxMenuEl.style.left = x + "px";
  ctxMenuEl.style.top = y + "px";
  ctxMenuEl.innerHTML = items.map((it, i) => it.divider
    ? `<div class="ctx-divider"></div>`
    : `<div class="ctx-item ${it.danger ? "danger" : ""}" data-i="${i}">${icon(it.icon || "file")}<span>${escapeHtml(it.label)}</span></div>`
  ).join("");
  document.body.appendChild(ctxMenuEl);
  hydrateIcons(ctxMenuEl);
  ctxMenuEl.querySelectorAll(".ctx-item").forEach((el) => {
    el.addEventListener("click", () => {
      const item = items[Number(el.dataset.i)];
      item.action?.();
      hideContextMenu();
    });
  });
  setTimeout(() => document.addEventListener("click", hideContextMenu, { once: true }), 0);
}
export function hideContextMenu() {
  if (ctxMenuEl) { ctxMenuEl.remove(); ctxMenuEl = null; }
}

/* ---------------- Duplicate resolution dialog ---------------- */
export function showDuplicateDialog(dup) {
  return new Promise((resolve) => {
    const body = document.getElementById("modal-duplicate-body");
    body.innerHTML = `
      <p class="modal-desc">The file <b>${escapeHtml(dup.path)}</b> appears <b>${dup.entries.length}</b> times in the pasted response.</p>
      <div class="modal-actions modal-actions-col">
        <button class="btn-primary" data-choice="last">Replace Existing (use last occurrence)</button>
        <button class="btn-ghost" data-choice="both">Keep Both (rename duplicates)</button>
        <button class="btn-ghost" data-choice="compare">Compare Changes</button>
        <button class="btn-ghost" data-choice="merge">Merge (concatenate all)</button>
      </div>
      <div class="compare-view" id="compare-view" style="display:none;"></div>
    `;
    openModal("modal-duplicate");
    body.querySelectorAll("[data-choice]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const choice = btn.dataset.choice;
        if (choice === "compare") {
          const cv = document.getElementById("compare-view");
          cv.style.display = "block";
          cv.innerHTML = dup.entries.map((e, i) => `
            <div class="compare-col">
              <div class="compare-head">Occurrence ${i + 1} (${e.content.split("\n").length} lines)</div>
              <pre>${escapeHtml(e.content.slice(0, 600))}${e.content.length > 600 ? "\n…" : ""}</pre>
            </div>`).join("");
          return; // wait for another choice
        }
        closeAllModals();
        resolve(choice);
      });
    });
  });
}

/* ---------------- Filename suggestion dialog ---------------- */
export function showSuggestionDialog(file) {
  return new Promise((resolve) => {
    const body = document.getElementById("modal-suggest-body");
    body.innerHTML = `
      <p class="modal-desc">No filename was found for one of the code blocks. Based on its content, AI2ZIP suggests:</p>
      <div class="suggestion-box">
        <span class="suggestion-name">${escapeHtml(file.path)}</span>
        <span class="suggestion-reason">${escapeHtml(file.suggestion || "")}</span>
      </div>
      <input type="text" id="suggestion-input" value="${escapeHtml(file.path)}" />
      <div class="modal-actions">
        <button class="btn-ghost" id="suggestion-skip">Skip this file</button>
        <button class="btn-primary" id="suggestion-accept">Use this name</button>
      </div>
    `;
    openModal("modal-suggest");
    document.getElementById("suggestion-accept").addEventListener("click", () => {
      const val = document.getElementById("suggestion-input").value.trim() || file.path;
      closeAllModals();
      resolve(val);
    });
    document.getElementById("suggestion-skip").addEventListener("click", () => {
      closeAllModals();
      resolve(null);
    });
  });
}
