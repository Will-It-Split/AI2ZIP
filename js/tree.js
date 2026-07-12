// tree.js — in-memory project model: a flat file map + folder derivation
import { uid } from "./utils.js";

export class ProjectStore {
  constructor() {
    /** @type {Map<string, {id:string, path:string, content:string, warnings:string[]}>} */
    this.files = new Map(); // key = normalized path
    this.listeners = new Set();
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { this.listeners.forEach((fn) => fn(this)); }

  clear() { this.files.clear(); this.emit(); }

  addFile(path, content = "", warnings = []) {
    const clean = this._sanitize(path);
    this.files.set(clean, { id: uid("f"), path: clean, content, warnings });
    this.emit();
    return clean;
  }

  updateContent(path, content) {
    const f = this.files.get(path);
    if (f) { f.content = content; this.emit(); }
  }

  renamePath(oldPath, newPath) {
    const f = this.files.get(oldPath);
    if (!f) return false;
    const clean = this._sanitize(newPath);
    this.files.delete(oldPath);
    f.path = clean;
    this.files.set(clean, f);
    this.emit();
    return true;
  }

  deleteFile(path) {
    this.files.delete(path);
    this.emit();
  }

  deleteFolder(folderPath) {
    const prefix = folderPath.endsWith("/") ? folderPath : folderPath + "/";
    [...this.files.keys()].forEach((p) => {
      if (p.startsWith(prefix)) this.files.delete(p);
    });
    this.emit();
  }

  renameFolder(oldFolder, newFolder) {
    const prefix = oldFolder.endsWith("/") ? oldFolder : oldFolder + "/";
    const newPrefix = newFolder.endsWith("/") ? newFolder : newFolder + "/";
    const entries = [...this.files.entries()].filter(([p]) => p.startsWith(prefix));
    entries.forEach(([p, f]) => {
      const suffix = p.slice(prefix.length);
      const newPath = newPrefix + suffix;
      this.files.delete(p);
      f.path = newPath;
      this.files.set(newPath, f);
    });
    this.emit();
  }

  _sanitize(path) {
    let p = path.replace(/\\/g, "/").replace(/^\/+/, "").trim();
    // avoid collision by appending (n)
    if (this.files.has(p)) {
      const dot = p.lastIndexOf(".");
      const base = dot > -1 ? p.slice(0, dot) : p;
      const ext = dot > -1 ? p.slice(dot) : "";
      let n = 2;
      while (this.files.has(`${base} (${n})${ext}`)) n++;
      p = `${base} (${n})${ext}`;
    }
    return p;
  }

  fileCount() { return this.files.size; }

  folderCount() {
    const folders = new Set();
    for (const p of this.files.keys()) {
      const parts = p.split("/");
      let acc = "";
      for (let i = 0; i < parts.length - 1; i++) {
        acc = acc ? `${acc}/${parts[i]}` : parts[i];
        folders.add(acc);
      }
    }
    return folders.size;
  }

  totalWarnings() {
    let n = 0;
    for (const f of this.files.values()) n += (f.warnings?.length || 0);
    return n;
  }

  estimatedSizeBytes() {
    let bytes = 0;
    for (const f of this.files.values()) bytes += new Blob([f.content]).size;
    return bytes;
  }

  /** Build a nested tree structure: { type:'folder', name, path, children:[] } | { type:'file', ... } */
  buildTree() {
    const root = { type: "folder", name: "", path: "", children: [], _map: new Map() };
    const sortedPaths = [...this.files.keys()].sort();
    for (const path of sortedPaths) {
      const parts = path.split("/");
      let node = root;
      let acc = "";
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        acc = acc ? `${acc}/${part}` : part;
        const isFile = i === parts.length - 1;
        if (isFile) {
          const f = this.files.get(path);
          node.children.push({ type: "file", name: part, path, id: f.id, warnings: f.warnings });
        } else {
          if (!node._map.has(part)) {
            const folderNode = { type: "folder", name: part, path: acc, children: [], _map: new Map() };
            node._map.set(part, folderNode);
            node.children.push(folderNode);
          }
          node = node._map.get(part);
        }
      }
    }
    // sort: folders first, then files, alpha within each
    const sortRec = (n) => {
      n.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      n.children.forEach((c) => { if (c.type === "folder") sortRec(c); });
    };
    sortRec(root);
    return root;
  }

  toJSON() {
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      files: [...this.files.values()].map((f) => ({ path: f.path, content: f.content, warnings: f.warnings })),
    };
  }

  loadJSON(data) {
    this.files.clear();
    (data.files || []).forEach((f) => {
      this.files.set(f.path, { id: uid("f"), path: f.path, content: f.content, warnings: f.warnings || [] });
    });
    this.emit();
  }
}
