import { requestBackend } from "./backendClient.js";

async function optionalBackend(path, options) {
  try {
    return await requestBackend(path, options);
  } catch {
    return null;
  }
}

export const applicationService = {
  loadInitialData: () => optionalBackend("/applications/state"),
  addUniversityApplication: (payload) => optionalBackend("/applications", { method: "POST", body: JSON.stringify(payload) }),
  updateApplication: (applicationId, payload) => optionalBackend(`/applications/${applicationId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  updateUserPreferences: (payload) => optionalBackend("/user/preferences", { method: "PATCH", body: JSON.stringify(payload) }),
};
