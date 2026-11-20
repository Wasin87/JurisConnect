import type { Timestamp } from 'firebase/firestore';

export type UserRole =
  | 'citizen'
  | 'dlao_officer'
  | 'panel_lawyer'
  | 'mediator'
  | 'supervisor'
  | 'admin';

export type LanguageCode = 'en' | 'bn';

export type IntakeChannel =
  | 'web'
  | 'helpline_16699'
  | 'ussd_16699'
  | 'udc_assisted'
  | 'dlao_referral';

export type LegalCategory =
  | 'family_maintenance'
  | 'land_property'
  | 'domestic_violence'
  | 'labor_wages'
  | 'civil_dispute'
  | 'criminal_defense';

export type CasePriority = 'critical' | 'high' | 'medium' | 'standard';

export type CaseStatus =
  | 'submitted'
  | 'dlao_review'
  | 'approved'
  | 'lawyer_assigned'
  | 'in_mediation'
  | 'court_proceeding'
  | 'settled'
  | 'closed'
  | 'rejected';

export type MediationMode = 'in_person' | 'video_call' | 'hybrid';

export type MediationOutcome =
  | 'scheduled'
  | 'settled_amicably'
  | 'partial_settlement'
  | 'adjourned'
  | 'referred_to_court';

export type ReferralStatus = 'pending' | 'accepted' | 'acknowledged' | 'declined';

export type ComplaintStatus = 'open' | 'investigating' | 'resolved';

export type AIConfidenceLevel = 'high' | 'moderate' | 'low';

export type AIReviewStatus = 'pending_review' | 'approved' | 'corrected' | 'overridden';

export interface UserPublic {
  uid: string;
  displayName: string;
  role: UserRole;
  district: string;
  barRegistrationNo?: string;
  specialization?: string;
  preferredLanguage: LanguageCode;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface UserPrivate {
  uid: string;
  email: string;
  phone?: string;
  nidLast4?: string;
  address?: string;
  updatedAt?: Timestamp | null;
}

export interface LegalCase {
  caseId: string;
  caseNumber: string;
  citizenUid: string;
  citizenName: string;
  safeContactNote?: string;
  consentGiven: boolean;
  channel: IntakeChannel;
  district: string;
  upazila: string;
  category: LegalCategory;
  title: string;
  description: string;
  priority: CasePriority;
  status: CaseStatus;
  eligibilityVerified: boolean;
  emergencyFlag: boolean;
  assignedLawyerUid?: string;
  assignedLawyerName?: string;
  assignedMediatorUid?: string;
  assignedMediatorName?: string;
  nextHearingDate?: string;
  deadlineDate?: string;
  requiredDocs?: string[];
  submittedDocs?: string[];
  aiClassification?: string;
  aiSummary?: string;
  aiRiskNote?: string;
  aiConfidence?: AIConfidenceLevel;
  aiUncertaintyNote?: string;
  aiExtractedFacts?: string[];
  aiMissingInfo?: string[];
  aiFollowUpQuestions?: string[];
  aiCitations?: string[];
  aiNextSteps?: string[];
  aiReviewStatus?: AIReviewStatus;
  aiOfficerNote?: string;
  aiReviewedByName?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface CasePublicStatus {
  caseNumber: string;
  district: string;
  category: LegalCategory;
  status: CaseStatus;
  channel: IntakeChannel;
  nextHearingDate?: string;
  ownerUid: string;
  updatedAt?: Timestamp | null;
}

export interface CaseTimelineEvent {
  eventId: string;
  caseId: string;
  caseOwnerUid: string;
  caseLawyerUid?: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  actionType: string;
  note: string;
  createdAt?: Timestamp | null;
}

export interface CaseMessage {
  messageId: string;
  caseId: string;
  caseOwnerUid: string;
  caseLawyerUid?: string;
  senderUid: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt?: Timestamp | null;
}

export interface CaseDocumentRecord {
  docId: string;
  caseId: string;
  caseOwnerUid: string;
  caseLawyerUid?: string;
  uploadedByUid: string;
  uploadedByName: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  detectedType: string;
  summary: string;
  traceableFacts: string[];
  missingFields: string[];
  legibilityConfidence: string;
  createdAt?: Timestamp | null;
}

export interface MediationSession {
  mediationId: string;
  caseId: string;
  caseNumber: string;
  citizenUid: string;
  mediatorUid: string;
  mediatorName: string;
  district: string;
  scheduledAt: string;
  mode: MediationMode;
  applicantConfirmed: boolean;
  respondentConfirmed: boolean;
  outcome: MediationOutcome;
  settlementTerms?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface CaseReferral {
  referralId: string;
  caseId: string;
  caseNumber: string;
  citizenUid: string;
  fromDistrict: string;
  toDistrict: string;
  reason: string;
  status: ReferralStatus;
  requestedByUid: string;
  requestedByName: string;
  handledByUid?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface CommitteeMeeting {
  meetingId: string;
  district: string;
  chairpersonName: string;
  meetingDate: string;
  agenda: string;
  decisions: string;
  casesReviewedCount: number;
  createdByUid: string;
  createdAt?: Timestamp | null;
}

export interface Complaint {
  complaintId: string;
  caseNumber?: string;
  reporterUid: string;
  reporterName: string;
  district: string;
  subject: string;
  details: string;
  status: ComplaintStatus;
  resolutionNote?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface AuditLog {
  logId: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetPath: string;
  summary: string;
  createdAt?: Timestamp | null;
}

export interface AIAnalysisResult {
  detectedCategory?: LegalCategory;
  classification: string;
  recommendedPriority: CasePriority;
  summary: string;
  extractedFacts: string[];
  missingInfo: string[];
  followUpQuestions: string[];
  missingDocuments: string[];
  riskNote: string;
  confidenceLevel: AIConfidenceLevel;
  uncertaintyNote: string;
  citations: string[];
  suggestedNextSteps: string[];
  mediationRecommended: boolean;
  advisoryNotice?: string;
  retrievalMethod?: 'hybrid-vector' | 'lexical';
}

export interface DocumentTraceableFinding {
  fact: string;
  sourceLocation: string;
}

export interface DocumentAnalysisResult {
  detectedType: string;
  summary: string;
  extractedNames: string[];
  extractedDates: string[];
  extractedAmounts: string[];
  traceableFindings: DocumentTraceableFinding[];
  missingOrUnclearFields: string[];
  legibilityConfidence: string;
}

export interface RagCitation {
  sourceId: string;
  actNameEn: string;
  actNameBn: string;
  section: string;
  excerpt: string;
  officialUrl: string;
  relevanceScore: number;
}

export interface RagQueryResult {
  answer: string;
  verifiedProvisionsSummary: string;
  generalProceduralNote: string;
  insufficientEvidence: boolean;
  retrievalMethod: 'hybrid-vector' | 'lexical';
  groundedCitations: RagCitation[];
}

// Blueprint Volumetric & Regex Bounds (Synchronized with firebase-blueprint.json & firestore.rules)
export const FIELD_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  CASE_NUMBER_PATTERN: /^LBD-[0-9]{4}-[0-9]{4,6}$/,
  DISPLAY_NAME_MAX: 100,
  DISTRICT_MAX: 60,
  TITLE_MIN: 3,
  TITLE_MAX: 160,
  DESC_MIN: 5,
  DESC_MAX: 2500,
  SAFE_CONTACT_MAX: 200,
  NOTE_MAX: 600,
  MESSAGE_MAX: 1000,
  SETTLEMENT_MAX: 1500,
  AI_CLASS_MAX: 200,
  AI_SUMMARY_MAX: 1200,
  AI_RISK_MAX: 400,
  AI_UNCERTAINTY_MAX: 500,
  ARRAY_MAX: 10,
} as const;
