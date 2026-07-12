// main.js — application bootstrap & event wiring
import { hydrateIcons, toast, formatBytes, debounce } from "./utils.js";
import { parseAIResponse, groupDuplicates } from "./parser.js";
import { ProjectStore } from "./tree.js";
import { EditorManager } from "./editor.js";
import { generateZip, estimateZipBytes } from "./zip.js";
import { loadSettings, saveSettings, downloadProjectFile, readFileAsText } from "./storage.js";
import * as UI from "./ui.js";

hydrateIcons(document);

const settings = loadSettings();
applyTheme(settings.theme);
document.documentElement.style.setProperty("--accent", settings.accent);

const store = new ProjectStore();

const editor = new EditorManager({
  host: document.getElementById("cm-host"),
  tabsEl: document.getElementById("editor-tabs"),
  pathEl: document.getElementById("editor-file-path"),
  emptyEl: document.getElementById("editor-empty"),
  store,
  settings,
  onChange: () => refreshAll(),
});
editor.applySettings(settings);

let searchTerm = "";

function refreshAll() {
  UI.renderTree(store, document.getElementById("file-tree"), document.getElementById("tree-empty"), {
    activePath: editor.getActivePath(),
    onOpenFile: (path) => { editor.openFile(path); switchPanel("editor"); refreshAll(); },
    onContextMenu: onFileContextMenu,
    searchTerm,
  });
  UI.renderSummary(store, document.getElementById("right-body"));
  UI.updateStatusBar(store);
  const estBytes = estimateZipBytes(store);
  document.getElementById("status-zipsize").textContent = `~${formatBytes(estBytes)}`;
}
store.onChange(refreshAll);
refreshAll();

/* ------------------------------------------------------------------ */
/* Panel switching (Paste vs Editor)                                   */
/* ------------------------------------------------------------------ */
function switchPanel(name) {
  document.querySelectorAll(".panel-tab").forEach((t) => t.classList.toggle("active", t.dataset.panel === name));
  document.getElementById("paste-view").style.display = name === "paste" ? "flex" : "none";
  document.getElementById("editor-view").style.display = name === "editor" ? "flex" : "none";
  if (name === "editor") setTimeout(() => editor.cm.refresh(), 10);
}
document.querySelectorAll(".panel-tab").forEach((t) => t.addEventListener("click", () => switchPanel(t.dataset.panel)));

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */
const textarea = document.getElementById("paste-textarea");
const dropzone = document.getElementById("dropzone");
const hint = document.getElementById("dropzone-hint");

["dragenter", "dragover"].forEach((evt) => dropzone.addEventListener(evt, (e) => {
  e.preventDefault(); dropzone.classList.add("dragging"); hint.style.display = "flex";
}));
["dragleave", "drop"].forEach((evt) => dropzone.addEventListener(evt, (e) => {
  e.preventDefault(); dropzone.classList.remove("dragging"); hint.style.display = "none";
}));
dropzone.addEventListener("drop", async (e) => {
  const file = e.dataTransfer.files?.[0];
  if (!file) return;
  const text = await readFileAsText(file);
  textarea.value = text;
  updateParseStats();
  toast(`Loaded ${file.name} into the paste area`, "success");
});

const dropzonePlaceholder = document.getElementById("dropzone-placeholder");
function updateParseStats() {
  const len = textarea.value.length;
  const lines = textarea.value ? textarea.value.split("\n").length : 0;
  document.getElementById("parse-stats").textContent = len ? `${lines.toLocaleString()} lines · ${len.toLocaleString()} characters` : "";
  dropzonePlaceholder.style.display = len ? "none" : "flex";
}
textarea.addEventListener("input", debounce(updateParseStats, 150));
textarea.addEventListener("focus", () => { dropzonePlaceholder.style.display = "none"; });
textarea.addEventListener("blur", () => { if (!textarea.value) dropzonePlaceholder.style.display = "flex"; });

document.getElementById("btn-clear-paste").addEventListener("click", () => {
  textarea.value = ""; updateParseStats(); toast("Paste area cleared", "info");
});

const uploadInput = document.createElement("input");
uploadInput.type = "file"; uploadInput.style.display = "none";
document.body.appendChild(uploadInput);
uploadInput.addEventListener("change", async () => {
  const file = uploadInput.files?.[0];
  if (!file) return;
  textarea.value = await readFileAsText(file);
  updateParseStats();
  toast(`Loaded ${file.name} into the paste area`, "success");
  uploadInput.value = "";
});
document.getElementById("btn-upload-txt").addEventListener("click", () => { uploadInput.accept = ".txt"; uploadInput.click(); });
document.getElementById("btn-upload-md").addEventListener("click", () => { uploadInput.accept = ".md,.markdown"; uploadInput.click(); });

document.getElementById("btn-parse").addEventListener("click", () => parseCurrentText());

async function parseCurrentText() {
  const raw = textarea.value;
  if (!raw.trim()) { toast("Paste an AI response first", "warning"); return; }

  const progressTrack = document.getElementById("progress-track");
  const progressFill = document.getElementById("progress-fill");
  progressTrack.classList.add("active");
  progressFill.style.width = "15%";

  await new Promise((r) => setTimeout(r, 120)); // let the UI paint

  const { files, warnings } = parseAIResponse(raw);
  progressFill.style.width = "55%";

  if (files.length === 0) {
    progressTrack.classList.remove("active");
    progressFill.style.width = "0%";
    toast(warnings[0] || "No files detected", "error");
    return;
  }

  // Resolve smart-detection suggestions
  for (const f of files) {
    if (f.source === "smart-detection") {
      const chosen = await UI.showSuggestionDialog(f);
      if (chosen === null) { f._skip = true; } else { f.path = chosen; }
    }
  }
  progressFill.style.width = "75%";

  const remaining = files.filter((f) => !f._skip);
  const { unique, duplicates } = groupDuplicates(remaining);

  for (const f of unique) store.addFile(f.path, f.content, f.warnings);

  for (const dup of duplicates) {
    const choice = await UI.showDuplicateDialog(dup);
    if (choice === "last") {
      const last = dup.entries[dup.entries.length - 1];
      store.addFile(dup.path, last.content, last.warnings);
    } else if (choice === "both") {
      dup.entries.forEach((e, i) => {
        const p = i === 0 ? dup.path : suffixPath(dup.path, i);
        store.addFile(p, e.content, e.warnings);
      });
    } else if (choice === "merge") {
      const merged = dup.entries.map((e, i) => `/* --- occurrence ${i + 1} --- */\n${e.content}`).join("\n\n");
      store.addFile(dup.path, merged, ["Merged from multiple occurrences"]);
    }
  }

  progressFill.style.width = "100%";
  setTimeout(() => { progressTrack.classList.remove("active"); progressFill.style.width = "0%"; }, 500);

  toast(`Parsed ${remaining.length} file${remaining.length === 1 ? "" : "s"} successfully`, "success");
  switchPanel("editor");
  const first = [...store.files.keys()][0];
  if (first && !editor.getActivePath()) editor.openFile(first);
  refreshAll();
}

function suffixPath(path, n) {
  const dot = path.lastIndexOf(".");
  return dot > -1 ? `${path.slice(0, dot)} (${n})${path.slice(dot)}` : `${path} (${n})`;
}

/* ------------------------------------------------------------------ */
/* Editor toolbar                                                      */
/* ------------------------------------------------------------------ */
document.getElementById("editor-tabs").addEventListener("click", (e) => {
  const closeBtn = e.target.closest("[data-close-tab]");
  if (closeBtn) { editor.closeTab(closeBtn.dataset.closeTab); refreshAll(); return; }
  const tab = e.target.closest(".etab");
  if (tab) { editor.openFile(tab.dataset.path); refreshAll(); }
});
document.getElementById("btn-find").addEventListener("click", () => editor.cm.execCommand("findPersistent"));
document.getElementById("btn-replace").addEventListener("click", () => editor.cm.execCommand("replace"));
document.getElementById("btn-undo").addEventListener("click", () => editor.cm.execCommand("undo"));
document.getElementById("btn-redo").addEventListener("click", () => editor.cm.execCommand("redo"));
document.getElementById("btn-format").addEventListener("click", () => { editor.format(); toast("Formatted", "success"); });
document.getElementById("btn-download-file").addEventListener("click", () => {
  const path = editor.getActivePath();
  if (!path) return toast("No file selected", "warning");
  const f = store.files.get(path);
  const blob = new Blob([f.content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = path.split("/").pop(); a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
});

/* ------------------------------------------------------------------ */
/* Sidebar: search, new file/folder, context menu, drag&drop reorder   */
/* ------------------------------------------------------------------ */
document.getElementById("sidebar-search-input").addEventListener("input", debounce((e) => {
  searchTerm = e.target.value; refreshAll();
}, 120));

document.getElementById("btn-collapse-all").addEventListener("click", () => {
  document.querySelectorAll(".folder-node").forEach((n) => n.classList.add("collapsed"));
});

function onFileContextMenu(e, path, type) {
  const items = type === "file" ? [
    { label: "Open", icon: "file-code", action: () => { editor.openFile(path); switchPanel("editor"); refreshAll(); } },
    { label: "Rename", icon: "edit", action: () => promptRename(path, "file") },
    { label: "Duplicate", icon: "copy", action: () => {
        const f = store.files.get(path);
        store.addFile(suffixPath(path, "copy"), f.content, f.warnings);
      } },
    { divider: true },
    { label: "Delete", icon: "trash", danger: true, action: () => {
        store.deleteFile(path); editor.syncAfterDelete(path); refreshAll();
      } },
  ] : [
    { label: "New File Here", icon: "file-plus", action: () => promptNewItem("file", path) },
    { label: "New Folder Here", icon: "folder-plus", action: () => promptNewItem("folder", path) },
    { label: "Rename Folder", icon: "edit", action: () => promptRename(path, "folder") },
    { divider: true },
    { label: "Delete Folder", icon: "trash", danger: true, action: () => { store.deleteFolder(path); refreshAll(); } },
  ];
  UI.showContextMenu(e.pageX, e.pageY, items);
}

function promptRename(path, type) {
  const label = type === "file" ? "New file path" : "New folder path";
  const next = prompt(label, path);
  if (!next || next === path) return;
  if (type === "file") { store.renamePath(path, next); editor.syncAfterRename(path, next); }
  else store.renameFolder(path, next);
  refreshAll();
}

function promptNewItem(type, basePath) {
  const modal = document.getElementById("modal-newitem");
  document.getElementById("modal-newitem-title").textContent = type === "file" ? "New File" : "New Folder";
  const input = document.getElementById("modal-newitem-input");
  input.value = basePath ? `${basePath}/` : "";
  input.placeholder = type === "file" ? "path/to/file.js" : "path/to/folder";
  UI.openModal("modal-newitem");
  input.focus();
  const confirmBtn = document.getElementById("modal-newitem-confirm");
  const handler = () => {
    const val = input.value.trim();
    if (!val) return;
    if (type === "file") store.addFile(val, "");
    else store.addFile(`${val}/.gitkeep`, "");
    UI.closeAllModals();
    confirmBtn.removeEventListener("click", handler);
    refreshAll();
  };
  confirmBtn.addEventListener("click", handler);
}

document.getElementById("btn-new-file").addEventListener("click", () => promptNewItem("file"));
document.getElementById("btn-new-folder").addEventListener("click", () => promptNewItem("folder"));

/* ------------------------------------------------------------------ */
/* ZIP / project save / import / export                                */
/* ------------------------------------------------------------------ */
document.getElementById("btn-generate-fab").addEventListener("click", doGenerateZip);
document.getElementById("btn-export").addEventListener("click", doGenerateZip);
async function doGenerateZip() {
  if (store.fileCount() === 0) return toast("Nothing to export yet — parse a response first", "warning");
  toast("Generating ZIP…", "info", 1500);
  await generateZip(store, settings.zipName || "project.zip");
  toast("ZIP downloaded", "success");
}

document.getElementById("btn-save").addEventListener("click", () => {
  if (store.fileCount() === 0) return toast("Nothing to save yet", "warning");
  downloadProjectFile(store, (settings.zipName || "project").replace(/\.zip$/, "") + ".ai2zip");
  toast("Project saved as .ai2zip", "success");
});

const importInput = document.createElement("input");
importInput.type = "file"; importInput.accept = ".ai2zip,.json,.md,.txt";
importInput.style.display = "none";
document.body.appendChild(importInput);

document.getElementById("btn-open").addEventListener("click", () => { importInput.accept = ".ai2zip,.json"; importInput.click(); });
document.getElementById("btn-import").addEventListener("click", () => { importInput.accept = ".ai2zip,.json,.md,.txt"; importInput.click(); });

importInput.addEventListener("change", async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  const text = await readFileAsText(file);
  if (file.name.endsWith(".ai2zip") || file.name.endsWith(".json")) {
    try {
      const data = JSON.parse(text);
      store.loadJSON(data);
      toast(`Loaded project "${file.name}"`, "success");
      switchPanel("editor");
    } catch (e) {
      toast("Could not parse project file — invalid JSON", "error");
    }
  } else {
    textarea.value = text;
    updateParseStats();
    switchPanel("paste");
    toast(`Loaded ${file.name} — click "Parse Project" to continue`, "info");
  }
  importInput.value = "";
});

/* ------------------------------------------------------------------ */
/* Settings modal                                                      */
/* ------------------------------------------------------------------ */
const setEls = {
  theme: document.getElementById("set-theme"),
  fontsize: document.getElementById("set-fontsize"),
  fontsizeVal: document.getElementById("set-fontsize-val"),
  tabwidth: document.getElementById("set-tabwidth"),
  wordwrap: document.getElementById("set-wordwrap"),
  autosave: document.getElementById("set-autosave"),
  zipname: document.getElementById("set-zipname"),
  accent: document.getElementById("set-accent"),
};
function syncSettingsUI() {
  setEls.theme.value = settings.theme;
  setEls.fontsize.value = settings.fontSize;
  setEls.fontsizeVal.textContent = settings.fontSize + "px";
  setEls.tabwidth.value = settings.tabWidth;
  setEls.wordwrap.checked = settings.wordWrap;
  setEls.autosave.checked = settings.autosave;
  setEls.zipname.value = settings.zipName;
  setEls.accent.value = settings.accent;
}
document.getElementById("btn-settings").addEventListener("click", () => { syncSettingsUI(); UI.openModal("modal-settings"); });
document.getElementById("btn-help").addEventListener("click", () => UI.openModal("modal-help"));

function persistSettings() {
  saveSettings(settings);
  editor.applySettings(settings);
  applyTheme(settings.theme);
  document.documentElement.style.setProperty("--accent", settings.accent);
}
setEls.theme.addEventListener("change", (e) => { settings.theme = e.target.value; persistSettings(); });
setEls.fontsize.addEventListener("input", (e) => { settings.fontSize = Number(e.target.value); setEls.fontsizeVal.textContent = settings.fontSize + "px"; persistSettings(); });
setEls.tabwidth.addEventListener("change", (e) => { settings.tabWidth = Number(e.target.value); persistSettings(); });
setEls.wordwrap.addEventListener("change", (e) => { settings.wordWrap = e.target.checked; persistSettings(); });
setEls.autosave.addEventListener("change", (e) => { settings.autosave = e.target.checked; persistSettings(); });
setEls.zipname.addEventListener("change", (e) => { settings.zipName = e.target.value || "project.zip"; persistSettings(); });
setEls.accent.addEventListener("input", (e) => { settings.accent = e.target.value; persistSettings(); });

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const iconWrap = document.getElementById("btn-theme");
  iconWrap.innerHTML = "";
  const i = document.createElement("i");
  i.setAttribute("data-ic", theme === "dark" ? "sun" : "moon");
  iconWrap.appendChild(i);
  hydrateIcons(iconWrap);
}
document.getElementById("btn-theme").addEventListener("click", () => {
  settings.theme = settings.theme === "dark" ? "light" : "dark";
  persistSettings();
});

/* ------------------------------------------------------------------ */
/* Modal close wiring                                                  */
/* ------------------------------------------------------------------ */
document.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", UI.closeAllModals));
document.getElementById("modal-backdrop").addEventListener("click", UI.closeAllModals);

/* ------------------------------------------------------------------ */
/* Resizable panels                                                     */
/* ------------------------------------------------------------------ */
function makeResizable(handle, target, prop, min, max, invert = false) {
  let dragging = false;
  handle.addEventListener("mousedown", () => { dragging = true; document.body.style.cursor = "col-resize"; });
  window.addEventListener("mouseup", () => { dragging = false; document.body.style.cursor = ""; });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = target.getBoundingClientRect();
    let width = invert ? rect.right - e.clientX : e.clientX - rect.left;
    width = Math.min(max, Math.max(min, width));
    target.style.width = width + "px";
  });
}
makeResizable(document.getElementById("sidebar-resizer"), document.getElementById("sidebar"), "width", 180, 480);
makeResizable(document.getElementById("right-resizer"), document.getElementById("right-panel"), "width", 220, 520, true);

/* ------------------------------------------------------------------ */
/* Keyboard shortcuts                                                   */
/* ------------------------------------------------------------------ */
window.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === "Enter") { e.preventDefault(); parseCurrentText(); }
  else if (ctrl && e.shiftKey && e.key.toLowerCase() === "z") { e.preventDefault(); doGenerateZip(); }
  else if (ctrl && e.key.toLowerCase() === "s") { e.preventDefault(); document.getElementById("btn-save").click(); }
  else if (ctrl && e.key.toLowerCase() === "o") { e.preventDefault(); document.getElementById("btn-open").click(); }
  else if (ctrl && e.key.toLowerCase() === "n") { e.preventDefault(); promptNewItem("file"); }
  else if (ctrl && e.key.toLowerCase() === "p") { e.preventDefault(); document.getElementById("sidebar-search-input").focus(); }
  else if (e.key === "Escape") UI.closeAllModals();
});

updateParseStats();
