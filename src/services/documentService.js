import { requestBackend, saveUploadedFileMetadata } from "./backendClient.js";

async function optionalBackend(path, options) {
  try {
    return await requestBackend(path, options);
  } catch {
    return null;
  }
}

export const documentService = {
  updateDocumentStatus: (documentId, status) => optionalBackend(`/documents/${documentId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  addCustomDocument: (payload) => optionalBackend("/documents", { method: "POST", body: JSON.stringify(payload) }),
  markNotRequired: (documentId) => optionalBackend(`/documents/${documentId}/not-required`, { method: "PATCH" }),
  async uploadDocument(documentId, file) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      return await requestBackend(`/documents/${documentId}/upload`, {
        method: "POST",
        body: formData,
        headers: {},
      });
    } catch {
      const preview = await buildPreview(file);
      return saveUploadedFileMetadata(documentId, file, preview);
    }
  },
};

function buildPreview(file) {
  if (!file || file.size > 2_000_000) return Promise.resolve({ previewKind: "metadata" });
  const canPreview = file.type?.startsWith("image/") || file.type === "application/pdf" || file.type?.startsWith("text/");
  if (!canPreview) return Promise.resolve({ previewKind: "metadata" });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ previewKind: file.type?.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "text", previewDataUrl: reader.result });
    reader.onerror = () => resolve({ previewKind: "metadata" });
    reader.readAsDataURL(file);
  });
}
