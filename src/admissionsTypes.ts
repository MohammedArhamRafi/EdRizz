export type ApplicationPlatform =
  | "UCAS"
  | "CommonApp"
  | "OUAC"
  | "DirectPortal"
  | "Coalition"
  | "StudyLink"
  | "UAC"
  | "NeedsVerification"
  | "Other";

export type ConfidenceLevel =
  | "Verified"
  | "PlatformDefault"
  | "AIExtracted"
  | "UserEntered"
  | "NeedsVerification"
  | "Outdated";

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type ApplicationStatus = "Planning" | "InProgress" | "Ready" | "Submitted" | "Archived";
export type StageStatus = "Locked" | "NotStarted" | "InProgress" | "Complete" | "Blocked";
export type TaskStatus = "NotStarted" | "InProgress" | "Complete" | "Blocked";
export type TaskType = "Application" | "Essay" | "Document" | "Recommendation" | "Scholarship" | "Verification" | "Payment" | "Review";
export type Priority = "Low" | "Medium" | "High" | "Critical";
export type EssayStatus = "NotStarted" | "InProgress" | "Complete" | "NeedsReview";
export type EssayType =
  | "UCASPersonalStatement"
  | "CommonAppPersonalEssay"
  | "CommonAppSupplement"
  | "ScholarshipEssay"
  | "DirectPortalStatement"
  | "PortfolioStatement"
  | "VerifiedUniversitySpecificSupplement"
  | "CustomEssay";
export type DeadlineType = "Application" | "Essay" | "Document" | "Recommendation" | "Scholarship" | "Interview" | "Test" | "Deposit" | "Housing" | "Visa" | "Task";
export type DeadlineStatus = "NotStarted" | "InProgress" | "Ready" | "Submitted" | "Overdue" | "NeedsVerification";
export type DocumentStatus = "Missing" | "InProgress" | "Uploaded" | "NeedsVerification";
export type RecommenderStatus = "NotRequested" | "Requested" | "Submitted" | "NeedsVerification";
export type ScholarshipStatus = "NotStarted" | "InProgress" | "Submitted" | "Optional" | "NeedsVerification";

export interface SourceMeta {
  sourceName?: string;
  sourceUrl?: string;
  lastVerifiedAt?: string;
  confidenceLevel: ConfidenceLevel;
  notes?: string;
}

export interface Requirement extends SourceMeta {
  id: string;
  title: string;
  required: boolean;
}

export interface University extends SourceMeta {
  id: string;
  name: string;
  country: string;
  city?: string;
  website?: string;
  admissionsUrl?: string;
  platform?: ApplicationPlatform;
  platformConfidence?: ConfidenceLevel;
  platformSource?: string;
  platformReason?: string;
  platformAlternatives?: ApplicationPlatform[];
  userOverrodePlatform?: boolean;
}

export interface Program extends SourceMeta {
  id: string;
  universityId: string;
  name: string;
  degreeType: string;
  faculty?: string;
  duration?: string;
  intake?: string;
  applicationPlatform: ApplicationPlatform;
  platformConfidence?: ConfidenceLevel;
  platformSource?: string;
  platformReason?: string;
  platformAlternatives?: ApplicationPlatform[];
  userOverrodePlatform?: boolean;
  courseUrl?: string;
  requirements: Requirement[];
}

export interface ApplicationGroup {
  id: string;
  platform: ApplicationPlatform;
  name: string;
  country?: string;
  linkedApplicationIds: string[];
  sharedTaskIds: string[];
  sharedEssayIds: string[];
  sharedDeadlineIds: string[];
  status: ApplicationStatus;
  progressPercentage: number;
}

export interface Application {
  id: string;
  universityId: string;
  programId: string;
  groupId?: string;
  universityName: string;
  programName: string;
  country: string;
  platform: ApplicationPlatform;
  platformConfidence?: ConfidenceLevel;
  platformSource?: string;
  platformReason?: string;
  platformAlternatives?: ApplicationPlatform[];
  userOverrodePlatform?: boolean;
  status: ApplicationStatus;
  riskLevel: RiskLevel;
  progressPercentage: number;
  deadlineIds: string[];
  taskIds: string[];
  essayIds: string[];
  documentIds: string[];
  recommenderRequirementIds: string[];
  scholarshipIds: string[];
  roadmapStageIds: string[];
}

export interface RoadmapStage {
  id: string;
  applicationId?: string;
  groupId?: string;
  title: string;
  order: number;
  status: StageStatus;
  taskIds: string[];
}

export interface Task extends SourceMeta {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  required: boolean;
  linkedApplicationIds: string[];
  linkedGroupIds?: string[];
  dueDate?: string;
  dependencyIds: string[];
  essayId?: string;
  documentId?: string;
  recommenderRequirementId?: string;
  scholarshipId?: string;
}

export interface Essay extends SourceMeta {
  id: string;
  title: string;
  essayType: EssayType;
  prompt?: string;
  wordLimit?: number;
  characterLimit?: number;
  currentWordCount?: number;
  currentCharacterCount?: number;
  content?: string;
  status: EssayStatus;
  linkedApplicationIds: string[];
  linkedGroupIds?: string[];
  deadlineId?: string;
}

export interface Deadline extends SourceMeta {
  id: string;
  title: string;
  type: DeadlineType;
  dueDate: string;
  dueTime?: string;
  timezone?: string;
  linkedApplicationIds: string[];
  linkedGroupIds?: string[];
  dependencyTaskIds: string[];
  status: DeadlineStatus;
  riskLevel: RiskLevel;
  readinessPercentage: number;
}

export interface DocumentRequirement extends SourceMeta {
  id: string;
  title: string;
  description?: string;
  category?: string;
  required: boolean;
  blocksSubmission?: boolean;
  status: DocumentStatus;
  linkedApplicationIds: string[];
  linkedGroupIds?: string[];
  uploadedFileIds?: string[];
  uploadedFiles?: Array<{ id: string; name: string; size?: number; type?: string; uploadedAt?: string; previewKind?: string; previewDataUrl?: string }>;
}

export interface RecommenderRequirement extends SourceMeta {
  id: string;
  title: string;
  required: boolean;
  platform?: ApplicationPlatform;
  linkedApplicationIds: string[];
  linkedGroupIds?: string[];
  recommenderId?: string;
  status: RecommenderStatus;
  dueDate?: string;
}

export interface Scholarship extends SourceMeta {
  id: string;
  title: string;
  universityId?: string;
  programId?: string;
  linkedApplicationIds: string[];
  deadlineId?: string;
  essayIds?: string[];
  documentIds?: string[];
  status: ScholarshipStatus;
  optional?: boolean;
}
