import { requestBackend } from "./backendClient.js";

async function optionalBackend(path, options) {
  try {
    return await requestBackend(path, options);
  } catch {
    return null;
  }
}

export const taskService = {
  updateTaskStatus: (taskId, status) => optionalBackend(`/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
