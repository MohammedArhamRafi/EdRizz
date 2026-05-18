import { deadlineService } from "./deadlineService.js";

export const calendarService = {
  addCustomEvent: deadlineService.addCustomDeadline,
  updateCustomEvent: deadlineService.updateDeadlineDate,
  deleteCustomEvent: deadlineService.deleteCustomDeadline,
};
