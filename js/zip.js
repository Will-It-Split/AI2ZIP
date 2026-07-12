// zip.js — builds a downloadable zip from the ProjectStore

export async function generateZip(store, zipName = "project.zip", onProgress) {
  const zip = new JSZip();
  const entries = [...store.files.values()];
  entries.forEach((f) => zip.file(f.path, f.content));

  const blob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (metadata) => onProgress?.(metadata.percent)
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName.endsWith(".zip") ? zipName : `${zipName}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return blob;
}

export function estimateZipBytes(store) {
  // rough estimate: assume ~55% compression ratio for text
  const raw = store.estimatedSizeBytes();
  return Math.round(raw * 0.55) + entriesOverhead(store.fileCount());
}

function entriesOverhead(count) {
  return count * 90; // local file header + central directory overhead, approx
}
