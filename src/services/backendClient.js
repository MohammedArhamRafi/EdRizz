const API_BASE_URL = import.meta.env?.VITE_EDRIZZ_API_URL || "";
const DEMO_MODE = import.meta.env?.VITE_EDRIZZ_DEMO_MODE === "true";
const APP_STATE_KEY = "edrizz-admissions-state-v1";
const FILE_INDEX_KEY = "edrizz-uploaded-file-index-v1";

export function getBackendMode() {
  if (DEMO_MODE) return "demo";
  if (API_BASE_URL) return "api";
  return "local-data";
}

export async function requestBackend(path, options = {}) {
  if (!API_BASE_URL || DEMO_MODE) {
    throw new Error("Backend API is not configured; using local data source.");
  }

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: isFormData
      ? options.headers || {}
      : {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Backend request failed with ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function readLocalState() {
  try {
    const saved = window.localStorage.getItem(APP_STATE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function writeLocalState(state) {
  window.localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
}

export function clearLocalState() {
  window.localStorage.removeItem(APP_STATE_KEY);
}

export function saveUploadedFileMetadata(documentId, file) {
  const current = getUploadedFileIndex();
  const metadata = {
    id: `file-${documentId}-${Date.now()}`,
    documentId,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    uploadedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(FILE_INDEX_KEY, JSON.stringify({ ...current, [metadata.id]: metadata }));
  return metadata;
}

export function getUploadedFileIndex() {
  try {
    return JSON.parse(window.localStorage.getItem(FILE_INDEX_KEY) || "{}");
  } catch {
    return {};
  }
}
