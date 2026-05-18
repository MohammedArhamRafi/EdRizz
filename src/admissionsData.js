import { clearLocalState, readLocalState, writeLocalState } from "./services/backendClient.js";
import { FALLBACK_UNIVERSITY_SOURCES } from "./services/demoSeedData.js";
import { inferApplicationPlatform } from "./services/platformInference.js";

export const CONFIDENCE_LABELS = ["Verified", "PlatformDefault", "AIExtracted", "UserEntered", "NeedsVerification", "Outdated"];

export const ROADMAP_STAGE_TITLES = [
  "Setup",
  "Course & Eligibility",
  "Requirements",
  "Documents",
  "Essays / Statements",
  "Recommendations",
  "Scholarships & Financial Aid",
  "Final Review",
  "Submission",
  "Post-Submission Tracking",
];

const TODAY = new Date("2026-05-18T00:00:00+04:00");

export function getUniversitySourceOptions() {
  return FALLBACK_UNIVERSITY_SOURCES;
}

export function createInitialAdmissionsState() {
  return {
    universities: {},
    programs: {},
    applicationGroups: {},
    applications: {},
    roadmapStages: {},
    tasks: {},
    essays: {},
    deadlines: {},
    documents: {},
    recommenderRequirements: {},
    recommenderPeople: {},
    scholarships: {},
    settings: {
      targetCountries: ["United Kingdom", "United States", "Canada", "UAE"],
      intendedMajors: ["Computer Science"],
      preferredIntake: "Fall 2027",
      timezone: "Asia/Dubai",
      notifications: "Weekly planning digest",
      verificationPreference: "Show Needs verification before generated details",
      defaultApplicationLevel: "undergraduate",
      deadlineReminderDays: "7, 3, 1",
    },
    dataSourceStatus: {
      mode: "local-data",
      lastHydratedAt: new Date().toISOString(),
    },
    userProgress: {
      lastUpdatedAt: new Date().toISOString(),
    },
    recentlyUpdated: [],
  };
}

export function loadAdmissionsState() {
  if (typeof window === "undefined") return createInitialAdmissionsState();
  try {
    const saved = readLocalState();
    return saved ? mergeState(createInitialAdmissionsState(), saved) : createInitialAdmissionsState();
  } catch {
    return createInitialAdmissionsState();
  }
}

export function saveAdmissionsState(state) {
  if (typeof window === "undefined") return;
  writeLocalState(state);
}

export function resetAdmissionsState() {
  if (typeof window !== "undefined") clearLocalState();
  return createInitialAdmissionsState();
}

function mergeState(base, saved) {
  return {
    ...base,
    ...saved,
    settings: { ...base.settings, ...(saved.settings || {}) },
    userProgress: { ...base.userProgress, ...(saved.userProgress || {}) },
  };
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function nowIso() {
  return new Date().toISOString();
}

function addUniqueId(record, field, id) {
  return { ...record, [field]: unique([...(record[field] || []), id]) };
}

function findSource({ name, country }) {
  if (arguments[0]?.source) return arguments[0].source;
  const normalized = slug(name).replace(/-/g, " ");
  const source = FALLBACK_UNIVERSITY_SOURCES.find((item) => item.aliases.some((alias) => normalized.includes(alias.replace(/[^a-z0-9]+/g, " ").trim())));
  if (source) return source;
  return {
    key: slug(name || "custom-university"),
    name: name || "Custom university",
    country: country || "Needs verification",
    city: "",
    website: "",
    admissionsUrl: "",
    defaultProgram: "Program to confirm",
    level: "undergraduate",
    platform: determinePlatform({ country, level: "undergraduate", sourcePlatform: "NeedsVerification" }),
    platformConfidenceLevel: "UserEntered",
    confidenceLevel: "UserEntered",
    sourceName: "User-entered",
    notes: "Created manually. Requirements, deadlines, and platform should be verified.",
  };
}

export function determinePlatform({ country, level, manualPlatform, sourcePlatform, platformConfidenceLevel }) {
  if (manualPlatform && manualPlatform !== "Auto") return manualPlatform;
  return inferApplicationPlatform({
    country,
    degreeLevel: level,
    backendPlatform: sourcePlatform,
    sourceConfidence: platformConfidenceLevel,
  }).platform;
}

export function addUniversityApplication(state, payload) {
  const source = findSource(payload);
  const level = payload.level || source.level || "undergraduate";
  const platform = determinePlatform({
    country: payload.country || source.country,
    level,
    manualPlatform: payload.platform,
    sourcePlatform: source.platform || source.applicationPlatform,
    platformConfidenceLevel: source.platformConfidenceLevel,
  });
  const platformInference = inferApplicationPlatform({
    universityName: source.name,
    country: payload.country || source.country,
    regionOrState: source.region || source.state || source.province || source.city,
    degreeLevel: level,
    applicationType: source.applicationType,
    backendPlatform: source.platform || source.applicationPlatform,
    sourceConfidence: source.platformConfidenceLevel,
  });
  const userOverrodePlatform = Boolean(payload.platform && payload.platform !== "Auto" && payload.platform !== platformInference.platform);
  const platformMeta = {
    platform,
    platformConfidence: userOverrodePlatform ? "UserEntered" : (source.platformConfidenceLevel || platformInference.confidenceLevel),
    platformSource: userOverrodePlatform ? "User override" : (source.platformSource || platformInference.source),
    platformReason: userOverrodePlatform ? "You selected this platform before adding the university." : (source.platformReason || platformInference.reason),
    platformAlternatives: source.platformAlternatives || platformInference.alternatives,
    userOverrodePlatform,
  };
  const universityId = `uni-${slug(source.name)}`;
  const programName = payload.programName || source.defaultProgram || "Program to confirm";
  const programId = `program-${slug(source.name)}-${slug(programName)}`;
  const applicationId = `app-${slug(source.name)}-${slug(programName)}`;

  if (state.applications[applicationId]) {
    return touchRecent(state, applicationId, `${source.name} is already in Applications`);
  }

  let next = structuredClone(state);
  const sourceMeta = {
    sourceName: source.sourceName || "University data source",
    sourceUrl: source.courseUrl || source.admissionsUrl || source.website,
    lastVerifiedAt: source.confidenceLevel === "Verified" ? "2026-05-18" : undefined,
    confidenceLevel: source.confidenceLevel || "NeedsVerification",
    notes: source.notes,
  };

  next.universities[universityId] = {
    id: universityId,
    name: source.name,
    country: payload.country || source.country,
    city: source.city,
    website: source.website,
    admissionsUrl: source.admissionsUrl,
    ...platformMeta,
    ...sourceMeta,
  };

  next.programs[programId] = {
    id: programId,
    universityId,
    name: programName,
    degreeType: level === "undergraduate" ? "Undergraduate" : "Graduate",
    intake: payload.intake || "Fall 2027",
    applicationPlatform: platform,
    ...platformMeta,
    courseUrl: source.courseUrl,
    requirements: [
      requirement(`req-${applicationId}-course`, "Course entry requirements", true, sourceMeta),
      requirement(`req-${applicationId}-english`, "English language requirements", true, { ...sourceMeta, confidenceLevel: "NeedsVerification" }),
    ],
    ...sourceMeta,
  };

  const appShared = {
    id: applicationId,
    universityId,
    programId,
    universityName: source.name,
    programName,
    country: payload.country || source.country,
    platform,
    ...platformMeta,
    status: "Planning",
    riskLevel: "Medium",
    progressPercentage: 0,
    deadlineIds: [],
    taskIds: [],
    essayIds: [],
    documentIds: [],
    recommenderRequirementIds: [],
    scholarshipIds: [],
    roadmapStageIds: [],
  };

  next.applications[applicationId] = appShared;

  if (platform === "UCAS") {
    next = ensureUcasGroup(next, applicationId);
    next.applications[applicationId].groupId = "group-ucas-undergraduate";
  } else if (platform === "CommonApp") {
    next = ensureCommonAppGroup(next, applicationId);
    next.applications[applicationId].groupId = "group-commonapp-undergraduate";
  } else {
    next = ensureIndependentApplicationGroup(next, applicationId, platform);
    next = createDirectApplicationRecords(next, applicationId, source);
  }

  next = ensureSharedDocuments(next, applicationId, next.applications[applicationId].groupId);
  next = createUniversitySpecificRecords(next, applicationId, source);
  next = createRoadmapStages(next, applicationId, next.applications[applicationId].groupId);
  next = recalculateAll(next);
  return touchRecent(next, applicationId, `Added ${source.name} ${programName}`);
}

function ensureIndependentApplicationGroup(state, applicationId, platform) {
  let next = structuredClone(state);
  const app = next.applications[applicationId];
  const sharedPlatforms = ["OUAC", "Coalition", "StudyLink", "UAC"];
  const groupId = sharedPlatforms.includes(platform)
    ? `group-${slug(platform)}-undergraduate`
    : `group-${applicationId}-${slug(platform || "application")}`;
  const groupName = platform === "NeedsVerification"
    ? `${app.universityName} application platform to verify`
    : sharedPlatforms.includes(platform)
      ? `${platform} application group`
      : `${app.universityName} direct application`;

  if (!next.applicationGroups[groupId]) {
    next.applicationGroups[groupId] = {
      id: groupId,
      platform,
      name: groupName,
      country: app.country,
      linkedApplicationIds: [],
      sharedTaskIds: [],
      sharedEssayIds: [],
      sharedDeadlineIds: [],
      status: "Planning",
      progressPercentage: 0,
    };
  }

  next.applicationGroups[groupId] = addUniqueId(next.applicationGroups[groupId], "linkedApplicationIds", applicationId);
  next.applications[applicationId].groupId = groupId;
  return next;
}

function requirement(id, title, required, sourceMeta) {
  return { id, title, required, ...sourceMeta };
}

function ensureUcasGroup(state, applicationId) {
  let next = structuredClone(state);
  const groupId = "group-ucas-undergraduate";
  const deadlineId = "deadline-ucas-submission";
  const essayId = "essay-ucas-personal-statement";
  const referenceId = "rec-ucas-reference";
  const referenceTaskId = "task-ucas-reference";
  const feeTaskId = "task-ucas-application-fee";
  const reviewTaskId = "task-ucas-final-review";
  const essayTaskId = "task-ucas-personal-statement";

  if (!next.applicationGroups[groupId]) {
    next.applicationGroups[groupId] = {
      id: groupId,
      platform: "UCAS",
      name: "UCAS undergraduate application",
      country: "United Kingdom",
      linkedApplicationIds: [],
      sharedTaskIds: [essayTaskId, referenceTaskId, feeTaskId, reviewTaskId],
      sharedEssayIds: [essayId],
      sharedDeadlineIds: [deadlineId],
      status: "Planning",
      progressPercentage: 0,
    };
  }

  next.applicationGroups[groupId] = addUniqueId(next.applicationGroups[groupId], "linkedApplicationIds", applicationId);

  if (!next.deadlines[deadlineId]) {
    next.deadlines[deadlineId] = {
      id: deadlineId,
      title: "UCAS application deadline",
      type: "Application",
      dueDate: "2027-01-14",
      dueTime: "18:00",
      timezone: "UK time",
      linkedApplicationIds: [],
      linkedGroupIds: [groupId],
      dependencyTaskIds: [essayTaskId, referenceTaskId, feeTaskId, reviewTaskId],
      status: "NeedsVerification",
      riskLevel: "Medium",
      readinessPercentage: 0,
      sourceName: "UCAS platform default",
      sourceUrl: "https://www.ucas.com/",
      confidenceLevel: "PlatformDefault",
      notes: "Shared UCAS deadline estimate. Verify the exact cycle/date for the user's courses before submission.",
    };
  }

  if (!next.essays[essayId]) {
    next.essays[essayId] = {
      id: essayId,
      title: "UCAS Personal Statement",
      essayType: "UCASPersonalStatement",
      prompt: "Shared UCAS personal statement. No separate UCL/KCL/Edinburgh/Manchester essay is generated without verified source data.",
      characterLimit: 4000,
      content: "",
      currentWordCount: 0,
      currentCharacterCount: 0,
      status: "NotStarted",
      linkedApplicationIds: [],
      linkedGroupIds: [groupId],
      deadlineId,
      sourceName: "UCAS platform default",
      sourceUrl: "https://www.ucas.com/",
      confidenceLevel: "PlatformDefault",
      notes: "Platform-level requirement shared by linked UCAS course choices.",
    };
  }

  if (!next.recommenderRequirements[referenceId]) {
    next.recommenderRequirements[referenceId] = {
      id: referenceId,
      title: "UCAS reference",
      required: true,
      platform: "UCAS",
      linkedApplicationIds: [],
      linkedGroupIds: [groupId],
      status: "NotRequested",
      dueDate: "2027-01-10",
      sourceName: "UCAS platform default",
      sourceUrl: "https://www.ucas.com/",
      confidenceLevel: "PlatformDefault",
      notes: "Shared UCAS reference requirement, not duplicated per university choice.",
    };
  }

  const sharedTasks = [
    task(essayTaskId, "UCAS personal statement", "Essay", "Critical", true, [applicationId], [groupId], "2027-01-10", "Shared by every UCAS university choice.", "PlatformDefault", { essayId }),
    task(referenceTaskId, "UCAS reference", "Recommendation", "High", true, [applicationId], [groupId], "2027-01-10", "Ask your school/counselor to prepare the UCAS reference.", "PlatformDefault", { recommenderRequirementId: referenceId }),
    task(feeTaskId, "UCAS application fee", "Payment", "Medium", true, [applicationId], [groupId], "2027-01-12", "Confirm and pay the UCAS application fee.", "PlatformDefault"),
    task(reviewTaskId, "UCAS final review", "Review", "High", true, [applicationId], [groupId], "2027-01-13", "Check UCAS course choices, statement, reference, fee, and submission details.", "PlatformDefault"),
  ];

  sharedTasks.forEach((item) => {
    next.tasks[item.id] = next.tasks[item.id]
      ? addUniqueId(next.tasks[item.id], "linkedApplicationIds", applicationId)
      : item;
  });

  [deadlineId, essayId, referenceId].forEach((id) => {
    if (next.deadlines[id]) next.deadlines[id] = addUniqueId(next.deadlines[id], "linkedApplicationIds", applicationId);
    if (next.essays[id]) next.essays[id] = addUniqueId(next.essays[id], "linkedApplicationIds", applicationId);
    if (next.recommenderRequirements[id]) next.recommenderRequirements[id] = addUniqueId(next.recommenderRequirements[id], "linkedApplicationIds", applicationId);
  });

  next.applications[applicationId].deadlineIds = unique([...next.applications[applicationId].deadlineIds, deadlineId]);
  next.applications[applicationId].essayIds = unique([...next.applications[applicationId].essayIds, essayId]);
  next.applications[applicationId].taskIds = unique([...next.applications[applicationId].taskIds, essayTaskId, referenceTaskId, feeTaskId, reviewTaskId]);
  next.applications[applicationId].recommenderRequirementIds = unique([...next.applications[applicationId].recommenderRequirementIds, referenceId]);
  return next;
}

function ensureCommonAppGroup(state, applicationId) {
  let next = structuredClone(state);
  const groupId = "group-commonapp-undergraduate";
  const essayId = "essay-commonapp-personal";
  const deadlineId = "deadline-commonapp-final-review";
  const essayTaskId = "task-commonapp-personal-essay";
  const counselorRecId = "rec-commonapp-counselor";
  const teacherRecId = "rec-commonapp-teacher";
  const counselorTaskId = "task-commonapp-counselor-rec";
  const teacherTaskId = "task-commonapp-teacher-rec";

  if (!next.applicationGroups[groupId]) {
    next.applicationGroups[groupId] = {
      id: groupId,
      platform: "CommonApp",
      name: "Common App application",
      linkedApplicationIds: [],
      sharedTaskIds: [essayTaskId, counselorTaskId, teacherTaskId],
      sharedEssayIds: [essayId],
      sharedDeadlineIds: [deadlineId],
      status: "Planning",
      progressPercentage: 0,
    };
  }

  next.applicationGroups[groupId] = addUniqueId(next.applicationGroups[groupId], "linkedApplicationIds", applicationId);
  next.essays[essayId] = next.essays[essayId] || {
    id: essayId,
    title: "Common App personal essay",
    essayType: "CommonAppPersonalEssay",
    prompt: "Shared Common App personal essay.",
    wordLimit: 650,
    content: "",
    currentWordCount: 0,
    currentCharacterCount: 0,
    status: "NotStarted",
    linkedApplicationIds: [],
    linkedGroupIds: [groupId],
    deadlineId,
    sourceName: "Common App platform default",
    sourceUrl: "https://www.commonapp.org/",
    confidenceLevel: "PlatformDefault",
  };
  next.deadlines[deadlineId] = next.deadlines[deadlineId] || {
    id: deadlineId,
    title: "Common App final review",
    type: "Application",
    dueDate: "2027-01-01",
    dueTime: "23:59",
    timezone: "local",
    linkedApplicationIds: [],
    linkedGroupIds: [groupId],
    dependencyTaskIds: [essayTaskId, counselorTaskId, teacherTaskId],
    status: "NeedsVerification",
    riskLevel: "Medium",
    readinessPercentage: 0,
    sourceName: "Platform default",
    confidenceLevel: "PlatformDefault",
    notes: "Verify each university's actual Common App deadline.",
  };
  next.tasks[essayTaskId] = next.tasks[essayTaskId]
    ? addUniqueId(next.tasks[essayTaskId], "linkedApplicationIds", applicationId)
    : task(essayTaskId, "Common App personal essay", "Essay", "Critical", true, [applicationId], [groupId], "2026-12-20", "Shared Common App essay.", "PlatformDefault", { essayId });
  next.recommenderRequirements[counselorRecId] = next.recommenderRequirements[counselorRecId] || {
    id: counselorRecId,
    title: "Common App counselor recommendation",
    required: true,
    platform: "CommonApp",
    linkedApplicationIds: [],
    linkedGroupIds: [groupId],
    status: "NotRequested",
    dueDate: "2026-12-20",
    sourceName: "Common App platform default",
    sourceUrl: "https://www.commonapp.org/",
    confidenceLevel: "PlatformDefault",
    notes: "Confirm each college's recommendation policy.",
  };
  next.recommenderRequirements[teacherRecId] = next.recommenderRequirements[teacherRecId] || {
    id: teacherRecId,
    title: "Common App teacher recommendation",
    required: true,
    platform: "CommonApp",
    linkedApplicationIds: [],
    linkedGroupIds: [groupId],
    status: "NotRequested",
    dueDate: "2026-12-20",
    sourceName: "Common App platform default",
    sourceUrl: "https://www.commonapp.org/",
    confidenceLevel: "NeedsVerification",
    notes: "Teacher recommendation count varies by university.",
  };
  [counselorRecId, teacherRecId].forEach((id) => {
    next.recommenderRequirements[id] = addUniqueId(next.recommenderRequirements[id], "linkedApplicationIds", applicationId);
  });
  next.tasks[counselorTaskId] = next.tasks[counselorTaskId]
    ? addUniqueId(next.tasks[counselorTaskId], "linkedApplicationIds", applicationId)
    : task(counselorTaskId, "Common App counselor recommendation", "Recommendation", "High", true, [applicationId], [groupId], "2026-12-20", "Invite and track counselor recommendation.", "PlatformDefault", { recommenderRequirementId: counselorRecId });
  next.tasks[teacherTaskId] = next.tasks[teacherTaskId]
    ? addUniqueId(next.tasks[teacherTaskId], "linkedApplicationIds", applicationId)
    : task(teacherTaskId, "Common App teacher recommendation", "Recommendation", "High", true, [applicationId], [groupId], "2026-12-20", "Confirm teacher recommendation requirements before requesting.", "NeedsVerification", { recommenderRequirementId: teacherRecId });

  next.essays[essayId] = addUniqueId(next.essays[essayId], "linkedApplicationIds", applicationId);
  next.deadlines[deadlineId] = addUniqueId(next.deadlines[deadlineId], "linkedApplicationIds", applicationId);
  next.applications[applicationId].groupId = groupId;
  next.applications[applicationId].essayIds = unique([...next.applications[applicationId].essayIds, essayId]);
  next.applications[applicationId].deadlineIds = unique([...next.applications[applicationId].deadlineIds, deadlineId]);
  next.applications[applicationId].recommenderRequirementIds = unique([...next.applications[applicationId].recommenderRequirementIds, counselorRecId, teacherRecId]);
  next.applications[applicationId].taskIds = unique([...next.applications[applicationId].taskIds, essayTaskId, counselorTaskId, teacherTaskId]);
  return next;
}

function createDirectApplicationRecords(state, applicationId, source) {
  let next = structuredClone(state);
  const deadlineId = `deadline-${applicationId}-direct`;
  next.deadlines[deadlineId] = {
    id: deadlineId,
    title: `${source.name} application deadline`,
    type: "Application",
    dueDate: "2026-11-01",
    dueTime: "23:59",
    timezone: "local",
    linkedApplicationIds: [applicationId],
    linkedGroupIds: next.applications[applicationId].groupId ? [next.applications[applicationId].groupId] : [],
    dependencyTaskIds: [],
    status: "NeedsVerification",
    riskLevel: "High",
    readinessPercentage: 0,
    sourceName: source.sourceName || "University data source",
    sourceUrl: source.admissionsUrl,
    confidenceLevel: "NeedsVerification",
    notes: "Direct/non-UCAS deadline generated from available source data and must be verified.",
  };
  next.applications[applicationId].deadlineIds.push(deadlineId);

  (source.directEssays || []).forEach((essaySource, index) => {
    const essayId = `essay-${applicationId}-${index + 1}`;
    const essayTaskId = `task-${applicationId}-essay-${index + 1}`;
    next.essays[essayId] = {
      id: essayId,
      title: essaySource.title,
      essayType: essaySource.essayType,
      prompt: essaySource.prompt,
      wordLimit: essaySource.wordLimit,
      content: "",
      currentWordCount: 0,
      currentCharacterCount: 0,
      status: "NotStarted",
      linkedApplicationIds: [applicationId],
      linkedGroupIds: next.applications[applicationId].groupId ? [next.applications[applicationId].groupId] : [],
      deadlineId,
      sourceName: source.sourceName,
      sourceUrl: source.admissionsUrl,
      confidenceLevel: essaySource.confidenceLevel || "NeedsVerification",
      notes: "Generated only because the source data explicitly contains this requirement.",
    };
    next.tasks[essayTaskId] = task(essayTaskId, essaySource.title, "Essay", "High", true, [applicationId], [], "2026-10-20", essaySource.prompt, "NeedsVerification", { essayId });
    next.applications[applicationId].essayIds.push(essayId);
    next.applications[applicationId].taskIds.push(essayTaskId);
    next.deadlines[deadlineId].dependencyTaskIds.push(essayTaskId);
  });

  return next;
}

function ensureSharedDocuments(state, applicationId, groupId) {
  let next = structuredClone(state);
  const groupIds = groupId ? [groupId] : [];
  const sharedDocs = [
    ["doc-academic-transcript", "Academic transcript", "Official or school-issued transcript.", "Critical", "2026-12-15", "Academic", true],
    ["doc-predicted-grades", "Predicted grades", "Predicted or expected grades where required.", "High", "2026-12-15", "Academic", true],
    ["doc-passport", "Passport", "Identity document for portals, visas, and student records.", "Medium", "2026-12-20", "Identity", false],
    ["doc-english-test", "English language test score", "IELTS/TOEFL/approved English evidence if required.", "Medium", "2027-01-05", "Testing", true],
  ];

  sharedDocs.forEach(([docId, title, description, priority, dueDate, category, blocksSubmission]) => {
    if (!next.documents[docId]) {
      next.documents[docId] = {
        id: docId,
        title,
        description,
        category,
        required: true,
        blocksSubmission,
        status: "Missing",
        linkedApplicationIds: [],
        linkedGroupIds: groupIds,
        uploadedFileIds: [],
        uploadedFiles: [],
        lastUpdatedAt: nowIso(),
        sourceName: "Platform/application default",
        confidenceLevel: "PlatformDefault",
        notes: "Shared document requirement. Verify exact format per destination.",
      };
    }
    next.documents[docId] = addUniqueId(next.documents[docId], "linkedApplicationIds", applicationId);
    if (groupId) next.documents[docId] = addUniqueId(next.documents[docId], "linkedGroupIds", groupId);

    const taskId = `task-${docId}`;
    next.tasks[taskId] = next.tasks[taskId]
      ? addUniqueId(next.tasks[taskId], "linkedApplicationIds", applicationId)
      : task(taskId, title, "Document", priority, true, [applicationId], groupIds, dueDate, description, "PlatformDefault", { documentId: docId });
    if (groupId) next.tasks[taskId] = addUniqueId(next.tasks[taskId], "linkedGroupIds", groupId);
    next.applications[applicationId].documentIds = unique([...next.applications[applicationId].documentIds, docId]);
    next.applications[applicationId].taskIds = unique([...next.applications[applicationId].taskIds, taskId]);
  });

  return next;
}

function createUniversitySpecificRecords(state, applicationId, source) {
  let next = structuredClone(state);
  const app = next.applications[applicationId];
  const baseId = slug(applicationId);
  const specificTasks = [
    ["course-eligibility", `Check ${source.name} course eligibility`, "Course & Eligibility", "High", "Verify entry grades, subject fit, and course level from the official course page.", "NeedsVerification"],
    ["subject-prereqs", `Verify ${source.name} subject prerequisites`, "Verification", "High", "Confirm required subjects and English evidence before relying on the checklist.", "NeedsVerification"],
    ["course-page", `Refresh ${source.name} course page source`, "Verification", "Medium", "Open the official course page and update source confidence/date.", "NeedsVerification"],
    ["portfolio-interview", `Verify ${source.name} portfolio/interview requirement`, "Verification", "Medium", "Only mark as required if the official source confirms a portfolio, test, or interview.", "NeedsVerification"],
  ];

  specificTasks.forEach(([suffix, title, type, priority, description, confidenceLevel], index) => {
    const id = `task-${baseId}-${suffix}`;
    next.tasks[id] = {
      id,
      title,
      description,
      type,
      status: "NotStarted",
      priority,
      required: suffix !== "portfolio-interview",
      linkedApplicationIds: [applicationId],
      linkedGroupIds: app.groupId ? [app.groupId] : [],
      dueDate: index < 2 ? "2026-12-01" : "2026-11-15",
      dependencyIds: [],
      sourceName: source.sourceName || "University data source",
      sourceUrl: source.courseUrl || source.admissionsUrl,
      confidenceLevel,
      notes: suffix === "portfolio-interview" ? "Needs verification; not treated as confirmed." : undefined,
    };
    app.taskIds.push(id);
  });

  const scholarshipId = `scholarship-${baseId}-funding-check`;
  const scholarshipDeadlineId = `deadline-${scholarshipId}`;
  next.deadlines[scholarshipDeadlineId] = {
    id: scholarshipDeadlineId,
    title: `${source.name} scholarship funding check`,
    type: "Scholarship",
    dueDate: "2027-02-01",
    dueTime: "23:59",
    timezone: "local",
    linkedApplicationIds: [applicationId],
    linkedGroupIds: app.groupId ? [app.groupId] : [],
    dependencyTaskIds: [],
    status: "NeedsVerification",
    riskLevel: "Medium",
    readinessPercentage: 0,
    sourceName: source.sourceName || "University data source",
    sourceUrl: source.admissionsUrl,
    confidenceLevel: "NeedsVerification",
    notes: "Scholarship availability is not confirmed. Verify before planning essays or documents.",
  };
  next.scholarships[scholarshipId] = {
    id: scholarshipId,
    title: `${source.name} scholarships and funding`,
    universityId: app.universityId,
    programId: app.programId,
    linkedApplicationIds: [applicationId],
    deadlineId: scholarshipDeadlineId,
    essayIds: [],
    documentIds: [],
    status: "NeedsVerification",
    optional: true,
    sourceName: source.sourceName || "University data source",
    sourceUrl: source.admissionsUrl,
    confidenceLevel: "NeedsVerification",
    notes: "Optional funding research item, not a confirmed scholarship application.",
  };
  app.scholarshipIds.push(scholarshipId);
  app.deadlineIds.push(scholarshipDeadlineId);
  return next;
}

function createRoadmapStages(state, applicationId, groupId) {
  let next = structuredClone(state);
  const app = next.applications[applicationId];
  ROADMAP_STAGE_TITLES.forEach((title, order) => {
    const stageId = `stage-${applicationId}-${slug(title)}`;
    const taskIds = app.taskIds.filter((taskId) => {
      const taskItem = next.tasks[taskId];
      if (!taskItem) return false;
      if (title === "Documents") return taskItem.type === "Document";
      if (title === "Essays / Statements") return taskItem.type === "Essay";
      if (title === "Recommendations") return taskItem.type === "Recommendation";
      if (title === "Scholarships & Financial Aid") return taskItem.type === "Scholarship";
      if (title === "Final Review") return taskItem.type === "Review";
      if (title === "Submission") return taskItem.type === "Payment";
      if (title === "Course & Eligibility") return taskItem.title.toLowerCase().includes("eligibility");
      if (title === "Requirements") return taskItem.type === "Verification";
      return false;
    });
    next.roadmapStages[stageId] = {
      id: stageId,
      applicationId,
      groupId,
      title,
      order,
      status: calculateStageStatus(taskIds.map((id) => next.tasks[id]).filter(Boolean)),
      taskIds,
    };
    app.roadmapStageIds.push(stageId);
  });
  return next;
}

function task(id, title, type, priority, required, linkedApplicationIds, linkedGroupIds, dueDate, description, confidenceLevel, extra = {}) {
  return {
    id,
    title,
    description,
    type,
    status: "NotStarted",
    priority,
    required,
    linkedApplicationIds,
    linkedGroupIds,
    dueDate,
    dependencyIds: [],
    sourceName: confidenceLevel === "PlatformDefault" ? "Application platform default" : "University data source",
    confidenceLevel,
    notes: confidenceLevel === "NeedsVerification" ? "Needs verification before treating this as official." : undefined,
    ...extra,
  };
}

export function admissionsReducer(state, action) {
  switch (action.type) {
    case "ADD_UNIVERSITY":
      return addUniversityApplication(state, action.payload);
    case "UPDATE_TASK_STATUS":
      return updateTaskStatus(state, action.taskId, action.status);
    case "UPDATE_ESSAY_STATUS":
      return updateEssayStatus(state, action.essayId, action.status);
    case "UPDATE_ESSAY_CONTENT":
      return updateEssayContent(state, action.essayId, action.content);
    case "ADD_CUSTOM_ESSAY":
      return addCustomEssay(state, action.payload);
    case "UPDATE_DOCUMENT_STATUS":
      return updateDocumentStatus(state, action.documentId, action.status);
    case "UPLOAD_DOCUMENT":
      return uploadDocument(state, action.documentId, action.fileMetadata);
    case "MARK_DOCUMENT_NOT_REQUIRED":
      return markDocumentNotRequired(state, action.documentId);
    case "ADD_CUSTOM_DOCUMENT":
      return addCustomDocument(state, action.payload);
    case "UPDATE_RECOMMENDER_STATUS":
      return updateRecommenderStatus(state, action.requirementId, action.status);
    case "ADD_RECOMMENDER_PERSON":
      return addRecommenderPerson(state, action.payload);
    case "MARK_DEADLINE_SUBMITTED":
      return updateDeadlineStatus(state, action.deadlineId, "Submitted");
    case "ADD_DEADLINE":
      return addCustomDeadline(state, action.payload);
    case "UPDATE_DEADLINE_DATE":
      return updateDeadlineDate(state, action.deadlineId, action.dueDate);
    case "DELETE_DEADLINE":
      return deleteDeadline(state, action.deadlineId);
    case "UPDATE_SETTINGS":
      return touchRecent({ ...state, settings: { ...state.settings, ...action.payload } }, "settings", "Updated preferences");
    case "HYDRATE_STATE":
      return mergeState(createInitialAdmissionsState(), action.payload || {});
    case "RESET":
      return createInitialAdmissionsState();
    default:
      return state;
  }
}

function updateTaskStatus(state, taskId, status) {
  let next = structuredClone(state);
  const taskItem = next.tasks[taskId];
  if (!taskItem) return state;
  next.tasks[taskId] = { ...taskItem, status };
  if (taskItem.essayId && next.essays[taskItem.essayId]) {
    next.essays[taskItem.essayId].status = status === "Complete" ? "Complete" : "InProgress";
  }
  if (taskItem.documentId && next.documents[taskItem.documentId]) {
    next.documents[taskItem.documentId].status = status === "Complete" ? "Uploaded" : "InProgress";
  }
  if (taskItem.recommenderRequirementId && next.recommenderRequirements[taskItem.recommenderRequirementId]) {
    next.recommenderRequirements[taskItem.recommenderRequirementId].status = status === "Complete" ? "Submitted" : "Requested";
  }
  next = recalculateAll(next);
  return touchRecent(next, taskId, `${taskItem.title} marked ${status}`);
}

function updateEssayStatus(state, essayId, status) {
  let next = structuredClone(state);
  if (!next.essays[essayId]) return state;
  next.essays[essayId].status = status;
  next.essays[essayId].lastUpdatedAt = nowIso();
  Object.values(next.tasks).forEach((taskItem) => {
    if (taskItem.essayId === essayId) taskItem.status = status === "Complete" ? "Complete" : "InProgress";
  });
  next = recalculateAll(next);
  return touchRecent(next, essayId, `${next.essays[essayId].title} marked ${status}`);
}

function updateEssayContent(state, essayId, content) {
  let next = structuredClone(state);
  if (!next.essays[essayId]) return state;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  next.essays[essayId] = {
    ...next.essays[essayId],
    content,
    currentWordCount: wordCount,
    currentCharacterCount: content.length,
    status: content.trim() ? (next.essays[essayId].status === "Complete" ? "Complete" : "InProgress") : "NotStarted",
    lastUpdatedAt: nowIso(),
  };
  Object.values(next.tasks).forEach((taskItem) => {
    if (taskItem.essayId === essayId && taskItem.status !== "Complete") taskItem.status = content.trim() ? "InProgress" : "NotStarted";
  });
  next = recalculateAll(next);
  return touchRecent(next, essayId, `${next.essays[essayId].title} saved`);
}

function addCustomEssay(state, payload) {
  let next = structuredClone(state);
  const applicationIds = payload.applicationId ? [payload.applicationId] : Object.keys(next.applications).slice(0, 1);
  const groupId = payload.groupId || "";
  const id = `essay-custom-${Date.now()}`;
  const title = payload.title || "Custom essay";
  next.essays[id] = {
    id,
    title,
    essayType: "CustomEssay",
    prompt: payload.prompt || "Add the exact prompt from the official application or scholarship page.",
    wordLimit: payload.wordLimit ? Number(payload.wordLimit) : undefined,
    characterLimit: payload.characterLimit ? Number(payload.characterLimit) : undefined,
    currentWordCount: 0,
    currentCharacterCount: 0,
    content: "",
    status: "NotStarted",
    linkedApplicationIds: applicationIds,
    linkedGroupIds: groupId ? [groupId] : [],
    sourceName: "User-entered",
    confidenceLevel: "UserEntered",
    notes: "User-added essay. Verify prompt and limit before submitting.",
    lastUpdatedAt: nowIso(),
  };
  const taskId = `task-${id}`;
  next.tasks[taskId] = task(taskId, title, "Essay", "High", true, applicationIds, groupId ? [groupId] : [], payload.dueDate || "2026-12-01", "Write, revise, and verify this custom essay prompt.", "UserEntered", { essayId: id });
  applicationIds.forEach((applicationId) => {
    if (next.applications[applicationId]) {
      next.applications[applicationId] = addUniqueId(next.applications[applicationId], "essayIds", id);
      next.applications[applicationId] = addUniqueId(next.applications[applicationId], "taskIds", taskId);
    }
  });
  if (groupId && next.applicationGroups[groupId]) {
    next.applicationGroups[groupId] = addUniqueId(next.applicationGroups[groupId], "sharedEssayIds", id);
    next.applicationGroups[groupId] = addUniqueId(next.applicationGroups[groupId], "sharedTaskIds", taskId);
  }
  next = recalculateAll(next);
  return touchRecent(next, id, `Added essay ${title}`);
}

function updateDocumentStatus(state, documentId, status) {
  let next = structuredClone(state);
  if (!next.documents[documentId]) return state;
  next.documents[documentId].status = status;
  next.documents[documentId].lastUpdatedAt = nowIso();
  Object.values(next.tasks).forEach((taskItem) => {
    if (taskItem.documentId === documentId) taskItem.status = status === "Uploaded" ? "Complete" : "InProgress";
  });
  next = recalculateAll(next);
  return touchRecent(next, documentId, `${next.documents[documentId].title} marked ${status}`);
}

function uploadDocument(state, documentId, fileMetadata) {
  let next = structuredClone(state);
  if (!next.documents[documentId]) return state;
  const fileId = fileMetadata?.id || `file-${documentId}-${Date.now()}`;
  next.documents[documentId] = {
    ...next.documents[documentId],
    status: "Uploaded",
    uploadedFileIds: unique([...(next.documents[documentId].uploadedFileIds || []), fileId]),
    uploadedFiles: [...(next.documents[documentId].uploadedFiles || []), { ...fileMetadata, id: fileId }],
    lastUpdatedAt: nowIso(),
  };
  Object.values(next.tasks).forEach((taskItem) => {
    if (taskItem.documentId === documentId) taskItem.status = "Complete";
  });
  next = recalculateAll(next);
  return touchRecent(next, documentId, `${next.documents[documentId].title} uploaded`);
}

function markDocumentNotRequired(state, documentId) {
  let next = structuredClone(state);
  if (!next.documents[documentId]) return state;
  next.documents[documentId] = {
    ...next.documents[documentId],
    required: false,
    blocksSubmission: false,
    status: "Uploaded",
    lastUpdatedAt: nowIso(),
    notes: "Marked not required by the user. Recheck source before submission.",
  };
  Object.values(next.tasks).forEach((taskItem) => {
    if (taskItem.documentId === documentId) taskItem.status = "Complete";
  });
  next = recalculateAll(next);
  return touchRecent(next, documentId, `${next.documents[documentId].title} marked not required`);
}

function addCustomDocument(state, payload) {
  let next = structuredClone(state);
  const applicationIds = payload.applicationId ? [payload.applicationId] : Object.keys(next.applications);
  const id = `doc-custom-${Date.now()}`;
  next.documents[id] = {
    id,
    title: payload.title || "Custom document",
    description: payload.description || "User-added document requirement.",
    category: payload.category || "Needs verification",
    required: payload.required !== false,
    blocksSubmission: !!payload.blocksSubmission,
    status: "Missing",
    linkedApplicationIds: applicationIds,
    linkedGroupIds: [],
    uploadedFileIds: [],
    uploadedFiles: [],
    lastUpdatedAt: nowIso(),
    sourceName: "User-entered",
    confidenceLevel: "UserEntered",
    notes: payload.notes || "User-entered document.",
  };
  applicationIds.forEach((applicationId) => {
    if (next.applications[applicationId]) next.applications[applicationId] = addUniqueId(next.applications[applicationId], "documentIds", id);
  });
  next = recalculateAll(next);
  return touchRecent(next, id, `Added ${next.documents[id].title}`);
}

function updateRecommenderStatus(state, requirementId, status) {
  let next = structuredClone(state);
  if (!next.recommenderRequirements[requirementId]) return state;
  next.recommenderRequirements[requirementId].status = status;
  Object.values(next.tasks).forEach((taskItem) => {
    if (taskItem.recommenderRequirementId === requirementId) taskItem.status = status === "Submitted" ? "Complete" : "InProgress";
  });
  next = recalculateAll(next);
  return touchRecent(next, requirementId, `${next.recommenderRequirements[requirementId].title} marked ${status}`);
}

function addRecommenderPerson(state, payload) {
  let next = structuredClone(state);
  const id = `recommender-${slug(payload.name || "person")}-${Date.now()}`;
  next.recommenderPeople[id] = {
    id,
    name: payload.name || "New recommender",
    role: payload.role || "Teacher / counselor",
    email: payload.email || "",
    status: "NotRequested",
    notes: payload.notes || "",
    createdAt: nowIso(),
  };
  if (payload.requirementId && next.recommenderRequirements[payload.requirementId]) {
    next.recommenderRequirements[payload.requirementId].recommenderId = id;
  }
  return touchRecent(next, id, `Added recommender ${next.recommenderPeople[id].name}`);
}

function updateDeadlineStatus(state, deadlineId, status) {
  let next = structuredClone(state);
  if (!next.deadlines[deadlineId]) return state;
  next.deadlines[deadlineId].status = status;
  next.deadlines[deadlineId].readinessPercentage = status === "Submitted" ? 100 : next.deadlines[deadlineId].readinessPercentage;
  next = recalculateAll(next);
  return touchRecent(next, deadlineId, `${next.deadlines[deadlineId].title} marked ${status}`);
}

function addCustomDeadline(state, payload) {
  let next = structuredClone(state);
  const applicationIds = payload.applicationId ? [payload.applicationId] : Object.keys(next.applications).slice(0, 1);
  const id = `deadline-custom-${Date.now()}`;
  next.deadlines[id] = {
    id,
    title: payload.title || "Custom deadline",
    type: payload.type || "Task",
    dueDate: payload.dueDate || "2026-12-01",
    dueTime: "23:59",
    timezone: next.settings.timezone || "local",
    linkedApplicationIds: applicationIds,
    linkedGroupIds: [],
    dependencyTaskIds: [],
    status: "NeedsVerification",
    riskLevel: "Medium",
    readinessPercentage: 0,
    sourceName: "User-entered",
    confidenceLevel: "UserEntered",
    custom: true,
    notes: "User-entered deadline.",
  };
  applicationIds.forEach((applicationId) => {
    if (next.applications[applicationId]) next.applications[applicationId] = addUniqueId(next.applications[applicationId], "deadlineIds", id);
  });
  next = recalculateAll(next);
  return touchRecent(next, id, `Added deadline ${next.deadlines[id].title}`);
}

function updateDeadlineDate(state, deadlineId, dueDate) {
  let next = structuredClone(state);
  if (!next.deadlines[deadlineId]) return state;
  next.deadlines[deadlineId].dueDate = dueDate;
  next.deadlines[deadlineId].confidenceLevel = "UserEntered";
  next.deadlines[deadlineId].status = next.deadlines[deadlineId].status === "Submitted" ? "Submitted" : "InProgress";
  next = recalculateAll(next);
  return touchRecent(next, deadlineId, `Updated ${next.deadlines[deadlineId].title}`);
}

function deleteDeadline(state, deadlineId) {
  let next = structuredClone(state);
  const deadline = next.deadlines[deadlineId];
  if (!deadline || !deadline.custom) return state;
  delete next.deadlines[deadlineId];
  Object.values(next.applications).forEach((app) => {
    app.deadlineIds = (app.deadlineIds || []).filter((id) => id !== deadlineId);
  });
  Object.values(next.applicationGroups).forEach((group) => {
    group.sharedDeadlineIds = (group.sharedDeadlineIds || []).filter((id) => id !== deadlineId);
  });
  next = recalculateAll(next);
  return touchRecent(next, deadlineId, `Deleted ${deadline.title}`);
}

function touchRecent(state, id, label) {
  const recent = [{ id, label, at: nowIso() }, ...(state.recentlyUpdated || [])].slice(0, 8);
  return { ...state, recentlyUpdated: recent, userProgress: { ...state.userProgress, lastUpdatedAt: nowIso() } };
}

function recalculateAll(state) {
  const next = structuredClone(state);
  Object.values(next.roadmapStages).forEach((stage) => {
    stage.status = calculateStageStatus(stage.taskIds.map((id) => next.tasks[id]).filter(Boolean));
  });
  Object.keys(next.deadlines).forEach((deadlineId) => {
    next.deadlines[deadlineId].readinessPercentage = calculateDeadlineReadiness(next, deadlineId);
    next.deadlines[deadlineId].riskLevel = calculateDeadlineRisk(next, deadlineId);
  });
  Object.keys(next.applications).forEach((applicationId) => {
    next.applications[applicationId].progressPercentage = calculateApplicationProgress(next, applicationId);
    next.applications[applicationId].riskLevel = calculateRiskLevel(next, applicationId);
    next.applications[applicationId].status = next.applications[applicationId].progressPercentage >= 95 ? "Ready" : "InProgress";
  });
  Object.keys(next.applicationGroups).forEach((groupId) => {
    next.applicationGroups[groupId].progressPercentage = calculateGroupProgress(next, groupId);
    next.applicationGroups[groupId].status = next.applicationGroups[groupId].progressPercentage >= 95 ? "Ready" : "InProgress";
  });
  return next;
}

function calculateStageStatus(tasks) {
  if (!tasks.length) return "Locked";
  if (tasks.some((taskItem) => taskItem.status === "Blocked")) return "Blocked";
  if (tasks.every((taskItem) => taskItem.status === "Complete")) return "Complete";
  if (tasks.some((taskItem) => taskItem.status === "InProgress" || taskItem.status === "Complete")) return "InProgress";
  return "NotStarted";
}

export const selectors = {
  getApplications: (state) => Object.values(state.applications),
  getApplicationById: (state, id) => state.applications[id],
  getApplicationGroupById: (state, id) => state.applicationGroups[id],
  getGroups: (state) => Object.values(state.applicationGroups),
  getTasksForApplication,
  getTasksForGroup,
  getEssaysForApplication,
  getEssaysForGroup,
  getDeadlinesForApplication,
  getUpcomingDeadlines,
  getDocumentsForApplication,
  getRecommendersForApplication,
  calculateApplicationProgress,
  calculateGroupProgress,
  calculateDeadlineReadiness,
  calculateRiskLevel,
  getNextBestMove,
  getSharedTasks,
  getItemsNeedingVerification,
  getAllTasks: (state) => Object.values(state.tasks),
  getAllEssays: (state) => Object.values(state.essays),
  getAllDocuments: (state) => Object.values(state.documents),
  getAllRecommenders: (state) => Object.values(state.recommenderRequirements),
  getAllScholarships: (state) => Object.values(state.scholarships),
  getAllDeadlines: (state) => Object.values(state.deadlines),
};

export function getTasksForApplication(state, applicationId) {
  const app = state.applications[applicationId];
  return app ? unique(app.taskIds).map((id) => state.tasks[id]).filter(Boolean) : [];
}

export function getTasksForGroup(state, groupId) {
  const group = state.applicationGroups[groupId];
  if (!group) return [];
  return Object.values(state.tasks).filter((taskItem) => (taskItem.linkedGroupIds || []).includes(groupId));
}

export function getEssaysForApplication(state, applicationId) {
  return Object.values(state.essays).filter((essay) => essay.linkedApplicationIds.includes(applicationId));
}

export function getEssaysForGroup(state, groupId) {
  return Object.values(state.essays).filter((essay) => (essay.linkedGroupIds || []).includes(groupId));
}

export function getDeadlinesForApplication(state, applicationId) {
  return Object.values(state.deadlines).filter((deadline) => deadline.linkedApplicationIds.includes(applicationId));
}

export function getUpcomingDeadlines(state) {
  return Object.values(state.deadlines)
    .filter((deadline) => deadline.status !== "Submitted")
    .sort(sortDeadlines);
}

export function getDocumentsForApplication(state, applicationId) {
  return Object.values(state.documents).filter((documentItem) => documentItem.linkedApplicationIds.includes(applicationId));
}

export function getRecommendersForApplication(state, applicationId) {
  return Object.values(state.recommenderRequirements).filter((recommender) => recommender.linkedApplicationIds.includes(applicationId));
}

export function calculateApplicationProgress(state, applicationId) {
  const app = state.applications[applicationId];
  if (!app) return 0;
  const items = [
    ...unique(app.taskIds).map((id) => state.tasks[id]).filter(Boolean).map((item) => item.status === "Complete"),
    ...unique(app.essayIds).map((id) => state.essays[id]).filter(Boolean).map((item) => item.status === "Complete"),
    ...unique(app.documentIds).map((id) => state.documents[id]).filter(Boolean).map((item) => item.status === "Uploaded"),
    ...unique(app.recommenderRequirementIds).map((id) => state.recommenderRequirements[id]).filter(Boolean).map((item) => item.status === "Submitted"),
  ];
  if (!items.length) return 0;
  return Math.round((items.filter(Boolean).length / items.length) * 100);
}

export function calculateGroupProgress(state, groupId) {
  const group = state.applicationGroups[groupId];
  if (!group) return 0;
  const taskItems = getTasksForGroup(state, groupId);
  const essayItems = getEssaysForGroup(state, groupId);
  const deadlineItems = Object.values(state.deadlines).filter((deadline) => (deadline.linkedGroupIds || []).includes(groupId));
  const checks = [
    ...taskItems.map((item) => item.status === "Complete"),
    ...essayItems.map((item) => item.status === "Complete"),
    ...deadlineItems.map((item) => item.status === "Submitted" || item.readinessPercentage >= 80),
  ];
  return checks.length ? Math.round((checks.filter(Boolean).length / checks.length) * 100) : 0;
}

export function calculateDeadlineReadiness(state, deadlineId) {
  const deadline = state.deadlines[deadlineId];
  if (!deadline) return 0;
  if (deadline.status === "Submitted") return 100;
  const dependencies = deadline.dependencyTaskIds.map((id) => state.tasks[id]).filter(Boolean);
  if (!dependencies.length) {
    const linkedApps = deadline.linkedApplicationIds.map((id) => state.applications[id]).filter(Boolean);
    const linkedProgress = linkedApps.map((app) => app.progressPercentage || calculateApplicationProgress(state, app.id));
    return linkedProgress.length ? Math.round(linkedProgress.reduce((sum, value) => sum + value, 0) / linkedProgress.length) : 0;
  }
  return Math.round((dependencies.filter((taskItem) => taskItem.status === "Complete").length / dependencies.length) * 100);
}

function calculateDeadlineRisk(state, deadlineId) {
  const deadline = state.deadlines[deadlineId];
  if (!deadline || deadline.status === "Submitted") return "Low";
  const days = daysUntil(deadline.dueDate);
  const readiness = deadline.readinessPercentage || 0;
  if (days < 0) return "Critical";
  if (deadline.confidenceLevel === "Outdated") return "High";
  if (days <= 7 && readiness < 80) return "Critical";
  if (days <= 21 && readiness < 60) return "High";
  if (deadline.confidenceLevel === "NeedsVerification" || readiness < 40) return "Medium";
  return "Low";
}

export function calculateRiskLevel(state, applicationId) {
  const app = state.applications[applicationId];
  if (!app) return "Low";
  const deadlines = getDeadlinesForApplication(state, applicationId);
  if (deadlines.some((deadline) => deadline.riskLevel === "Critical")) return "Critical";
  const incompleteRequired = getTasksForApplication(state, applicationId).filter((taskItem) => taskItem.required && taskItem.status !== "Complete").length;
  const missingDocs = getDocumentsForApplication(state, applicationId).filter((doc) => doc.required && doc.status !== "Uploaded").length;
  const pendingRecs = getRecommendersForApplication(state, applicationId).filter((rec) => rec.required && rec.status !== "Submitted").length;
  const verificationIssues = getItemsNeedingVerification(state).filter((item) => item.linkedApplicationIds?.includes(applicationId)).length;
  if (incompleteRequired + missingDocs + pendingRecs > 7 || verificationIssues > 4) return "High";
  if (incompleteRequired + missingDocs + pendingRecs > 3 || verificationIssues > 0) return "Medium";
  return "Low";
}

export function getNextBestMove(state) {
  return Object.values(state.tasks)
    .filter((taskItem) => taskItem.status !== "Complete")
    .map((taskItem) => {
      const dueScore = Math.max(0, 60 - Math.max(daysUntil(taskItem.dueDate || "2027-05-01"), 0));
      const priorityScore = { Critical: 55, High: 38, Medium: 22, Low: 8 }[taskItem.priority] || 0;
      const linkedScore = (taskItem.linkedApplicationIds?.length || 0) * 12;
      const verificationScore = ["NeedsVerification", "Outdated"].includes(taskItem.confidenceLevel) ? 18 : 0;
      return { item: taskItem, score: dueScore + priorityScore + linkedScore + verificationScore };
    })
    .sort((a, b) => b.score - a.score)[0]?.item;
}

export function getSharedTasks(state) {
  return Object.values(state.tasks).filter((taskItem) => (taskItem.linkedApplicationIds || []).length > 1 || (taskItem.linkedGroupIds || []).length > 0);
}

export function getItemsNeedingVerification(state) {
  return [
    ...Object.values(state.universities),
    ...Object.values(state.programs),
    ...Object.values(state.tasks),
    ...Object.values(state.essays),
    ...Object.values(state.deadlines),
    ...Object.values(state.documents),
    ...Object.values(state.recommenderRequirements),
    ...Object.values(state.scholarships),
  ].filter((item) => ["NeedsVerification", "Outdated", "AIExtracted"].includes(item.confidenceLevel));
}

export function getLinkedApplicationNames(state, ids = []) {
  return ids.map((id) => state.applications[id]?.universityName || id).filter(Boolean);
}

export function daysUntil(dateString) {
  if (!dateString) return 999;
  const target = new Date(`${dateString}T00:00:00`);
  return Math.ceil((target - TODAY) / 86400000);
}

export function formatDate(dateString) {
  if (!dateString) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${dateString}T00:00:00`));
}

export function sortDeadlines(a, b) {
  const aOverdue = daysUntil(a.dueDate) < 0 ? -1 : 0;
  const bOverdue = daysUntil(b.dueDate) < 0 ? -1 : 0;
  if (aOverdue !== bOverdue) return aOverdue - bOverdue;
  const dateDiff = new Date(a.dueDate) - new Date(b.dueDate);
  if (dateDiff !== 0) return dateDiff;
  const riskRank = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  const riskDiff = (riskRank[b.riskLevel] || 0) - (riskRank[a.riskLevel] || 0);
  if (riskDiff !== 0) return riskDiff;
  const linkedDiff = (b.linkedApplicationIds?.length || 0) - (a.linkedApplicationIds?.length || 0);
  if (linkedDiff !== 0) return linkedDiff;
  return (b.dependencyTaskIds?.length || 0) - (a.dependencyTaskIds?.length || 0);
}
