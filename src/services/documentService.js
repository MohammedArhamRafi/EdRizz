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
      return saveUploadedFileMetadata(documentId, file);
    }
  },
};
