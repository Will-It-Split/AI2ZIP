// editor.js — manages CodeMirror instance + open tabs
import { getFileMeta, escapeHtml, debounce } from "./utils.js";

export class EditorManager {
  constructor({ host, tabsEl, pathEl, emptyEl, store, onChange, settings }) {
    this.host = host;
    this.tabsEl = tabsEl;
    this.pathEl = pathEl;
    this.emptyEl = emptyEl;
    this.store = store;
    this.settings = settings;
    this.openTabs = []; // array of paths
    this.activePath = null;
    this.onChangeCb = onChange;

    this.cm = CodeMirror(host, {
      value: "",
      lineNumbers: true,
      theme: "material-darker",
      mode: "text",
      tabSize: settings.tabWidth || 2,
      indentUnit: settings.tabWidth || 2,
      lineWrapping: settings.wordWrap !== false,
      autoCloseBrackets: true,
      extraKeys: {
        "Ctrl-F": "findPersistent",
        "Cmd-F": "findPersistent",
        "Ctrl-H": "replace",
        "Cmd-H": "replace",
      },
    });
    this.cm.setSize("100%", "100%");
    host.style.display = "none";

    const debouncedSave = debounce(() => {
      if (this.activePath) {
        this.store.updateContent(this.activePath, this.cm.getValue());
        this.onChangeCb?.();
      }
    }, 250);
    this.cm.on("change", () => { if (!this._suppress) debouncedSave(); });
  }

  applySettings(s) {
    this.cm.setOption("tabSize", s.tabWidth);
    this.cm.setOption("indentUnit", s.tabWidth);
    this.cm.setOption("lineWrapping", s.wordWrap !== false);
    this.host.style.fontSize = (s.fontSize || 13) + "px";
  }

  openFile(path) {
    if (!this.store.files.has(path)) return;
    if (!this.openTabs.includes(path)) this.openTabs.push(path);
    this.activePath = path;
    this._render();
  }

  closeTab(path) {
    this.openTabs = this.openTabs.filter((p) => p !== path);
    if (this.activePath === path) {
      this.activePath = this.openTabs[this.openTabs.length - 1] || null;
    }
    this._render();
  }

  closeAll() {
    this.openTabs = [];
    this.activePath = null;
    this._render();
  }

  syncAfterRename(oldPath, newPath) {
    const idx = this.openTabs.indexOf(oldPath);
    if (idx > -1) this.openTabs[idx] = newPath;
    if (this.activePath === oldPath) this.activePath = newPath;
    this._render();
  }

  syncAfterDelete(path) {
    if (this.openTabs.includes(path)) this.closeTab(path);
    else this._render();
  }

  refreshContent() {
    if (this.activePath && this.store.files.has(this.activePath)) {
      const f = this.store.files.get(this.activePath);
      this._suppress = true;
      const cursor = this.cm.getCursor();
      this.cm.setValue(f.content);
      this.cm.setCursor(cursor);
      this._suppress = false;
    }
  }

  getActivePath() { return this.activePath; }

  format() {
    if (!this.activePath) return;
    const meta = getFileMeta(this.activePath);
    let value = this.cm.getValue();
    if (meta.mode === "javascript" && this.activePath.endsWith(".json")) {
      try { value = JSON.stringify(JSON.parse(value), null, this.settings.tabWidth || 2); } catch (e) { /* ignore */ }
    } else {
      // basic re-indent using CodeMirror's indent
      const total = this.cm.lineCount();
      this.cm.operation(() => {
        for (let i = 0; i < total; i++) this.cm.indentLine(i, "smart");
      });
      return;
    }
    this.cm.setValue(value);
  }

  _render() {
    // tabs
    this.tabsEl.innerHTML = this.openTabs.map((p) => {
      const meta = getFileMeta(p);
      const active = p === this.activePath ? "active" : "";
      const name = p.split("/").pop();
      return `<div class="etab ${active}" data-path="${escapeHtml(p)}" title="${escapeHtml(p)}">
        <span class="etab-dot" style="background:${meta.color}"></span>
        <span class="etab-name">${escapeHtml(name)}</span>
        <span class="etab-close" data-close-tab="${escapeHtml(p)}">&times;</span>
      </div>`;
    }).join("");

    if (!this.activePath) {
      this.host.style.display = "none";
      this.emptyEl.style.display = "flex";
      this.pathEl.textContent = "";
      return;
    }
    this.emptyEl.style.display = "none";
    this.host.style.display = "block";
    const meta = getFileMeta(this.activePath);
    const f = this.store.files.get(this.activePath);
    this._suppress = true;
    this.cm.setValue(f ? f.content : "");
    this._suppress = false;
    this.cm.setOption("mode", meta.mode === "text" ? null : meta.mode);
    this.pathEl.textContent = this.activePath;
    setTimeout(() => this.cm.refresh(), 0);
  }
}
