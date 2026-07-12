// storage.js — localStorage-backed settings + .ai2zip project files

const SETTINGS_KEY = "ai2zip:settings";

export const DEFAULT_SETTINGS = {
  theme: "dark",
  fontSize: 13,
  tabWidth: 2,
  wordWrap: true,
  autosave: true,
  zipName: "project.zip",
  accent: "#5E81F4",
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* quota / private mode */ }
}

export function downloadProjectFile(store, filename = "project.ai2zip") {
  const data = JSON.stringify(store.toJSON(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
