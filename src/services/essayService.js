import { requestBackend } from "./backendClient.js";

async function optionalBackend(path, options) {
  try {
    return await requestBackend(path, options);
  } catch {
    return null;
  }
}

export const essayService = {
  updateEssayContent: (essayId, content) => optionalBackend(`/essays/${essayId}/content`, { method: "PATCH", body: JSON.stringify({ content }) }),
  updateEssayStatus: (essayId, status) => optionalBackend(`/essays/${essayId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
