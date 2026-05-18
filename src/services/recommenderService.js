import { requestBackend } from "./backendClient.js";

async function optionalBackend(path, options) {
  try {
    return await requestBackend(path, options);
  } catch {
    return null;
  }
}

export const recommenderService = {
  updateRecommenderStatus: (id, status) => optionalBackend(`/recommenders/requirements/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  addRecommenderPerson: (payload) => optionalBackend("/recommenders/people", { method: "POST", body: JSON.stringify(payload) }),
};
