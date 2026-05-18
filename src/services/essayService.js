import { requestBackend } from "./backendClient.js";

async function optionalBackend(path, options) {
  try {
    return await requestBackend(path, options);
  } catch {
    return null;
  }
}

export const essayService = {
  addCustomEssay: (payload) => optionalBackend("/essays", { method: "POST", body: JSON.stringify(payload) }),
  updateEssayContent: (essayId, content) => optionalBackend(`/essays/${essayId}/content`, { method: "PATCH", body: JSON.stringify({ content }) }),
  updateEssayStatus: (essayId, status) => optionalBackend(`/essays/${essayId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
