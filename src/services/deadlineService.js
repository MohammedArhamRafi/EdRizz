import { requestBackend } from "./backendClient.js";

async function optionalBackend(path, options) {
  try {
    return await requestBackend(path, options);
  } catch {
    return null;
  }
}

export const deadlineService = {
  updateDeadlineStatus: (id, status) => optionalBackend(`/deadlines/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  addCustomDeadline: (payload) => optionalBackend("/deadlines", { method: "POST", body: JSON.stringify(payload) }),
  updateDeadlineDate: (id, dueDate) => optionalBackend(`/deadlines/${id}`, { method: "PATCH", body: JSON.stringify({ dueDate }) }),
  deleteCustomDeadline: (id) => optionalBackend(`/deadlines/${id}`, { method: "DELETE" }),
};
