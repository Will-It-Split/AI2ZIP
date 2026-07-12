// parser.js — turns raw pasted AI text into a list of { path, content, warnings }

const LABEL_LINE = /^(?:[#>*\-\s]{0,4})(?:\*\*)?(?:File|Filename|Path)\s*:?\s*(?:\*\*)?\s*`?([A-Za-z0-9_.\-\/\\@ ]+\.[A-Za-z0-9]+)`?\s*$/i;
const HEADING_LINE = /^#{1,6}\s+`?([A-Za-z0-9_.\-\/\\@]+\.[A-Za-z0-9]+)`?\s*$/;
const BOLD_PATH_LINE = /^\*\*`?([A-Za-z0-9_.\-\/\\@]+\.[A-Za-z0-9]+)`?\*\*\s*$/;
const BARE_PATH_LINE = /^`?([A-Za-z0-9_][A-Za-z0-9_.\-\/\\@]*\.[A-Za-z0-9]{1,10})`?\s*:?\s*$/;
const FENCE_OPEN = /^```([A-Za-z0-9_+\-]*)\s*(?:\{?\s*(?:title|file|filename|path)\s*=\s*["']?([^"'\}\s]+)["']?\s*\}?)?\s*$/i;

const LANG_EXT = {
  html: "html", htm: "html", xml: "xml", svg: "svg",
  css: "css", scss: "scss", sass: "scss",
  javascript: "js", js: "js", node: "js", mjs: "js",
  jsx: "jsx", typescript: "ts", ts: "ts", tsx: "tsx",
  json: "json", jsonc: "json",
  python: "py", py: "py",
  yaml: "yml", yml: "yml",
  bash: "sh", sh: "sh", shell: "sh", zsh: "sh", console: "sh",
  sql: "sql", php: "php", rust: "rs", rs: "rs", go: "go", golang: "go",
  java: "java", c: "c", cpp: "cpp", "c++": "cpp", h: "h",
  markdown: "md", md: "md", text: "txt", plaintext: "txt", txt: "txt",
  dockerfile: "Dockerfile", toml: "toml", env: "env", ini: "ini",
};

/** Guess a filename from the first meaningful line(s) of a code block's content */
function suggestFilenameFromContent(content, lang) {
  const trimmed = content.trim();
  const firstLine = trimmed.split("\n")[0] || "";

  if (/^<!DOCTYPE html>/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return { name: "index.html", reason: "Detected <!DOCTYPE html> / <html> root tag" };
  if (/^\s*\{\s*"name"\s*:/.test(trimmed) && /"dependencies"|"scripts"|"version"/.test(trimmed)) return { name: "package.json", reason: 'Detected "name" + npm-style keys' };
  if (/^\s*\{[\s\S]*"compilerOptions"/.test(trimmed)) return { name: "tsconfig.json", reason: 'Detected "compilerOptions" key' };
  if (/^import React|from ["']react["']|export default function App/.test(trimmed)) return { name: "App.jsx", reason: "Detected React import/App component" };
  if (/^from flask import|Flask\(__name__\)/.test(trimmed)) return { name: "app.py", reason: "Detected Flask app pattern" };
  if (/^from fastapi import|FastAPI\(\)/.test(trimmed)) return { name: "main.py", reason: "Detected FastAPI app pattern" };
  if (/^\s*(FROM|RUN|COPY|CMD)\s/im.test(trimmed) && /^FROM\s/im.test(trimmed)) return { name: "Dockerfile", reason: "Detected Dockerfile instructions" };
  if (/^\s*\{[\s\S]*\}\s*$/.test(trimmed) && lang === "json") return { name: "data.json", reason: "Generic JSON object" };
  if (/^body\s*\{|^\.[\w-]+\s*\{|^:root\s*\{/.test(trimmed)) return { name: "style.css", reason: "Detected CSS ruleset" };
  if (/^#include\s*</.test(trimmed)) return { name: "main.c", reason: "Detected C #include" };
  if (/^SELECT |^CREATE TABLE/i.test(trimmed)) return { name: "query.sql", reason: "Detected SQL statement" };

  const ext = LANG_EXT[(lang || "").toLowerCase()] || "txt";
  return { name: `untitled.${ext}`, reason: `No filename found — defaulted by language "${lang || "text"}"` };
}

function normalizePath(p) {
  return p.trim().replace(/^["'`]|["'`]$/g, "").replace(/\\/g, "/").replace(/^\.?\//, "").replace(/^\/+/, "");
}

function isValidPath(p) {
  if (!p || p.length > 260) return false;
  if (/[<>:"|?*\x00-\x1f]/.test(p)) return false;
  if (p.split("/").some((seg) => seg === "..")) return false;
  return true;
}

/**
 * Parse raw pasted text into files.
 * Strategy: scan line by line. Track the "pending label" (a filename mentioned via
 * heading / bold / "File:" line / bare path line) that appears above a fenced code block.
 * When a fence opens, consume until the matching closing fence, assign filename from:
 *   1) filename embedded in the fence info string (```js title="x.js")
 *   2) the most recent pending label (within 3 lines above the fence)
 *   3) smart content-based detection
 */
export function parseAIResponse(rawText) {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const files = [];
  const globalWarnings = [];

  let pendingLabel = null;
  let pendingLabelDistance = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const fenceMatch = line.match(FENCE_OPEN);
    if (fenceMatch) {
      const lang = fenceMatch[1] || "";
      const fenceFilename = fenceMatch[2] ? normalizePath(fenceMatch[2]) : null;

      // find closing fence
      let j = i + 1;
      const bodyLines = [];
      while (j < lines.length && !/^```\s*$/.test(lines[j])) {
        bodyLines.push(lines[j]);
        j++;
      }
      const content = bodyLines.join("\n");
      const closed = j < lines.length;

      let filename = null;
      let source = "";
      let suggestion = null;

      if (fenceFilename && isValidPath(fenceFilename)) {
        filename = fenceFilename;
        source = "fence-info-string";
      } else if (pendingLabel && pendingLabelDistance <= 3) {
        filename = pendingLabel;
        source = "label-above";
      } else {
        const sug = suggestFilenameFromContent(content, lang);
        filename = sug.name;
        suggestion = sug.reason;
        source = "smart-detection";
      }

      const warnings = [];
      if (!closed) warnings.push("Code block was not closed properly (missing closing ```)");
      if (!isValidPath(filename)) {
        warnings.push(`Invalid path "${filename}" — sanitized`);
        filename = filename.replace(/[<>:"|?*\x00-\x1f]/g, "_") || `untitled_${files.length + 1}.txt`;
      }
      if (!content.trim()) warnings.push("File content is empty");

      files.push({
        path: filename,
        content,
        lang,
        source,
        suggestion,
        warnings,
      });

      pendingLabel = null;
      pendingLabelDistance = 0;
      i = closed ? j + 1 : j;
      continue;
    }

    // Not a fence — check if this line labels an upcoming file
    const trimmedLine = line.trim();
    if (trimmedLine) {
      let m = trimmedLine.match(LABEL_LINE) || trimmedLine.match(HEADING_LINE) ||
              trimmedLine.match(BOLD_PATH_LINE) || trimmedLine.match(BARE_PATH_LINE);
      if (m) {
        const candidate = normalizePath(m[1]);
        if (isValidPath(candidate) && candidate.includes(".")) {
          pendingLabel = candidate;
          pendingLabelDistance = 0;
        }
      } else {
        pendingLabelDistance++;
      }
    }
    i++;
  }

  if (files.length === 0) {
    globalWarnings.push("No code blocks were detected in the pasted text. Make sure the response contains fenced code blocks (```).");
  }

  return { files, warnings: globalWarnings };
}

/** Merge duplicate-path files into groups so UI can prompt the user */
export function groupDuplicates(files) {
  const byPath = new Map();
  files.forEach((f, idx) => {
    if (!byPath.has(f.path)) byPath.set(f.path, []);
    byPath.get(f.path).push({ ...f, idx });
  });
  const duplicates = [];
  const unique = [];
  for (const [path, group] of byPath) {
    if (group.length > 1) duplicates.push({ path, entries: group });
    else unique.push(group[0]);
  }
  return { unique, duplicates };
}
