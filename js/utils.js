// utils.js — shared helpers: icons, formatting, id generation, debounce

export const ICONS = {
  "folder-open": '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H5"/><path d="M3 7v10a2 2 0 0 0 2 2h13.2a2 2 0 0 0 1.95-1.55l1.6-7A2 2 0 0 0 19.8 8H5a2 2 0 0 0-2 2"/>',
  "save": '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
  "import": '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  "export": '<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',
  "zip": '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v2M12 7v2M12 11v2M12 15v2"/><circle cx="12" cy="17" r="1.5"/>',
  "settings": '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z"/>',
  "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  "moon": '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
  "help": '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4"/><path d="M12 17h.01"/>',
  "file-plus": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M12 12v6M9 15h6"/>',
  "folder-plus": '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M12 11v5M9.5 13.5h5"/>',
  "collapse": '<path d="m18 15-6-6-6 6"/>',
  "search": '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  "inbox": '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>',
  "upload": '<path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
  "sparkles": '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
  "replace": '<path d="M14 4a4 4 0 0 1 4 4v2M10 20a4 4 0 0 1-4-4v-2"/><path d="m18 6-2-2 2-2M6 18l2 2-2 2"/>',
  "undo": '<path d="M3 10h10a5 5 0 0 1 0 10h-2"/><path d="m3 10 4-4M3 10l4 4"/>',
  "redo": '<path d="M21 10H11a5 5 0 0 0 0 10h2"/><path d="m21 10-4-4M21 10l-4 4"/>',
  "format": '<path d="M4 6h16M4 12h10M4 18h7"/>',
  "download": '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  "file": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>',
  "file-code": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m10 13-2 2 2 2M14 13l2 2-2 2"/>',
  "folder": '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  "warning": '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  "dot": '<circle cx="12" cy="12" r="5"/>',
  "x": '<path d="M18 6 6 18M6 6l12 12"/>',
  "trash": '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  "edit": '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  "copy": '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  "check": '<path d="M20 6 9 17l-5-5"/>',
  "info": '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
};

export function icon(name, cls = "") {
  const body = ICONS[name] || ICONS["file"];
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

// Replace all <i data-ic="name"> elements with inline svg icons
export function hydrateIcons(root = document) {
  root.querySelectorAll("[data-ic]").forEach((el) => {
    const name = el.getAttribute("data-ic");
    el.innerHTML = icon(name);
    el.classList.add("icon-wrap");
  });
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}

export function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Extension -> language mode map for CodeMirror + display metadata
const EXT_MAP = {
  html: { mode: "htmlmixed", label: "HTML", color: "#e34c26" },
  htm: { mode: "htmlmixed", label: "HTML", color: "#e34c26" },
  css: { mode: "css", label: "CSS", color: "#2965f1" },
  scss: { mode: "css", label: "SCSS", color: "#c66394" },
  js: { mode: "javascript", label: "JS", color: "#f0db4f" },
  mjs: { mode: "javascript", label: "JS", color: "#f0db4f" },
  cjs: { mode: "javascript", label: "JS", color: "#f0db4f" },
  jsx: { mode: "jsx", label: "JSX", color: "#61dafb" },
  ts: { mode: "javascript", label: "TS", color: "#3178c6" },
  tsx: { mode: "jsx", label: "TSX", color: "#3178c6" },
  json: { mode: "javascript", label: "JSON", color: "#8bc34a" },
  md: { mode: "markdown", label: "MD", color: "#94a3b8" },
  markdown: { mode: "markdown", label: "MD", color: "#94a3b8" },
  py: { mode: "python", label: "PY", color: "#3572A5" },
  yml: { mode: "yaml", label: "YAML", color: "#cb171e" },
  yaml: { mode: "yaml", label: "YAML", color: "#cb171e" },
  sh: { mode: "shell", label: "SH", color: "#89e051" },
  bash: { mode: "shell", label: "SH", color: "#89e051" },
  sql: { mode: "sql", label: "SQL", color: "#e38c00" },
  php: { mode: "php", label: "PHP", color: "#777bb4" },
  rs: { mode: "rust", label: "RS", color: "#dea584" },
  go: { mode: "go", label: "GO", color: "#00add8" },
  java: { mode: "clike", label: "JAVA", color: "#b07219" },
  c: { mode: "clike", label: "C", color: "#555555" },
  cpp: { mode: "clike", label: "C++", color: "#f34b7d" },
  h: { mode: "clike", label: "H", color: "#555555" },
  xml: { mode: "xml", label: "XML", color: "#0060ac" },
  svg: { mode: "xml", label: "SVG", color: "#ffb13b" },
  txt: { mode: "text", label: "TXT", color: "#94a3b8" },
  env: { mode: "text", label: "ENV", color: "#94a3b8" },
  gitignore: { mode: "text", label: "GIT", color: "#94a3b8" },
  toml: { mode: "text", label: "TOML", color: "#9c4221" },
  lock: { mode: "text", label: "LOCK", color: "#94a3b8" },
};

export function getFileMeta(filename) {
  const base = filename.split("/").pop();
  const ext = base.includes(".") ? base.split(".").pop().toLowerCase() : base.toLowerCase();
  return EXT_MAP[ext] || { mode: "text", label: ext.slice(0, 4).toUpperCase() || "FILE", color: "#94a3b8" };
}

export function toast(message, type = "info", timeout = 3800) {
  const stack = document.getElementById("toast-stack");
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  const iconName = { success: "check", error: "warning", warning: "warning", info: "info" }[type] || "info";
  el.innerHTML = `${icon(iconName)}<span>${escapeHtml(message)}</span>`;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, timeout);
}
