import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  collection,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  db,
  auth,
  googleProvider,
  handleFirestoreError,
  OperationType,
  BOOTSTRAPPED_ADMIN_EMAIL,
} from '../firebase';
import { ROLE_LABELS } from '../i18n';
import {
  FIELD_LIMITS,
  type AIAnalysisResult,
  type AIConfidenceLevel,
  type AIReviewStatus,
  type CasePriority,
  type CasePublicStatus,
  type CaseStatus,
  type ComplaintStatus,
  type DocumentAnalysisResult,
  type IntakeChannel,
  type LanguageCode,
  type LegalCase,
  type LegalCategory,
  type MediationMode,
  type MediationOutcome,
  type RagQueryResult,
  type ReferralStatus,
  type UserPrivate,
  type UserPublic,
  type UserRole,
} from '../types';

export type OperationalRole = Exclude<UserRole, 'admin'>;

const ALLOWED_OPERATIONAL_ROLES: OperationalRole[] = [
  'citizen',
  'dlao_officer',
  'panel_lawyer',
  'mediator',
  'supervisor',
];

function sanitizeOperationalRole(role?: UserRole): OperationalRole {
  if (role && ALLOWED_OPERATIONAL_ROLES.includes(role as OperationalRole)) {
    return role as OperationalRole;
  }
  return 'citizen';
}

let pendingAuthProfileOverrides: {
  displayName?: string;
  role?: OperationalRole;
  district?: string;
} | null = null;

const inFlightProfileSync = new Map<string, Promise<UserPublic | null>>();

export class AuthRoleMismatchError extends Error {
  registeredRole: UserRole;
  selectedRole: UserRole;

  constructor(message: string, registeredRole: UserRole, selectedRole: UserRole) {
    super(message);
    this.name = 'AuthRoleMismatchError';
    this.registeredRole = registeredRole;
    this.selectedRole = selectedRole;
  }
}

function clampStr(val: string | undefined, max: number): string {
  return (val ?? '').trim().slice(0, max);
}

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `LBD-${year}-${num}`;
}

export async function ensureUserProfile(
  preferredLanguage: LanguageCode,
  overrides?: {
    displayName?: string;
    role?: OperationalRole;
    district?: string;
  }
): Promise<UserPublic | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const existingTask = inFlightProfileSync.get(user.uid);
  if (existingTask) {
    return existingTask;
  }

  const effectiveOverrides = overrides ?? pendingAuthProfileOverrides ?? undefined;

  const syncTask = (async (): Promise<UserPublic | null> => {
    const userRef = doc(db, 'users', user.uid);
    const privateRef = doc(db, 'users', user.uid, 'private', 'info');

    try {
      const snap = await getDoc(userRef);
      const isRootAdmin = user.email === BOOTSTRAPPED_ADMIN_EMAIL && user.emailVerified;

      if (!snap.exists()) {
        const chosenRole: UserRole = isRootAdmin
          ? 'admin'
          : sanitizeOperationalRole(effectiveOverrides?.role);
        const chosenName = clampStr(
          effectiveOverrides?.displayName ||
            user.displayName ||
            user.email?.split('@')[0] ||
            'Citizen User',
          FIELD_LIMITS.DISPLAY_NAME_MAX
        );
        const chosenDistrict = clampStr(
          effectiveOverrides?.district || 'Dhaka',
          FIELD_LIMITS.DISTRICT_MAX
        );

        const profile: Omit<UserPublic, 'createdAt' | 'updatedAt'> & {
          createdAt: ReturnType<typeof serverTimestamp>;
          updatedAt: ReturnType<typeof serverTimestamp>;
        } = {
          uid: user.uid,
          displayName: chosenName,
          role: chosenRole,
          district: chosenDistrict,
          preferredLanguage,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const privateInfo: Omit<UserPrivate, 'updatedAt'> & {
          updatedAt: ReturnType<typeof serverTimestamp>;
        } = {
          uid: user.uid,
          email: clampStr(user.email || 'user@legalbd.gov.bd', 160),
          updatedAt: serverTimestamp(),
        };

        const batch = writeBatch(db);
        batch.set(userRef, profile);
        batch.set(privateRef, privateInfo);
        await batch.commit();

        const fresh = await getDoc(userRef);
        return fresh.data() as UserPublic;
      }

      const existing = snap.data() as UserPublic;
      if (isRootAdmin && existing.role !== 'admin') {
        await updateDoc(userRef, {
          role: 'admin',
          updatedAt: serverTimestamp(),
        });
        return { ...existing, role: 'admin' };
      }
      return existing;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      inFlightProfileSync.delete(user.uid);
    }
  })();

  inFlightProfileSync.set(user.uid, syncTask);
  return syncTask;
}

export async function registerWithEmailRole(params: {
  name: string;
  email: string;
  password: string;
  role: OperationalRole;
  district?: string;
  preferredLanguage: LanguageCode;
}): Promise<UserPublic> {
  const safeName = clampStr(params.name, FIELD_LIMITS.DISPLAY_NAME_MAX);
  const safeRole = sanitizeOperationalRole(params.role);
  const safeDistrict = clampStr(params.district || 'Dhaka', FIELD_LIMITS.DISTRICT_MAX);

  pendingAuthProfileOverrides = {
    displayName: safeName,
    role: safeRole,
    district: safeDistrict,
  };

  try {
    const cred = await createUserWithEmailAndPassword(auth, params.email.trim(), params.password);
    if (safeName) {
      await updateProfile(cred.user, { displayName: safeName }).catch(() => undefined);
    }
    sendEmailVerification(cred.user).catch(() => undefined);

    const profile = await ensureUserProfile(params.preferredLanguage, {
      displayName: safeName,
      role: safeRole,
      district: safeDistrict,
    });
    if (!profile) {
      throw new Error('Failed to initialize user profile.');
    }
    return profile;
  } finally {
    pendingAuthProfileOverrides = null;
  }
}

export async function signInWithEmailRole(params: {
  name?: string;
  email: string;
  password: string;
  role: OperationalRole;
  preferredLanguage: LanguageCode;
}): Promise<UserPublic> {
  const safeRole = sanitizeOperationalRole(params.role);
  const trimmedName = clampStr(params.name, FIELD_LIMITS.DISPLAY_NAME_MAX);

  pendingAuthProfileOverrides = {
    displayName: trimmedName || undefined,
    role: safeRole,
  };

  try {
    const cred = await signInWithEmailAndPassword(auth, params.email.trim(), params.password);
    let profile = await ensureUserProfile(params.preferredLanguage, {
      displayName: trimmedName || undefined,
      role: safeRole,
    });
    if (!profile) {
      throw new Error('Failed to load user profile.');
    }

    if (profile.role !== 'admin' && profile.role !== safeRole) {
      await signOut(auth);
      const registeredLabel = ROLE_LABELS[profile.role]?.[params.preferredLanguage] || profile.role;
      const selectedLabel = ROLE_LABELS[safeRole]?.[params.preferredLanguage] || safeRole;
      const msg =
        params.preferredLanguage === 'bn'
          ? `রোল অমিল: এই অ্যাকাউন্টটি "${registeredLabel}" হিসেবে নিবন্ধিত, "${selectedLabel}" হিসেবে নয়। অনুগ্রহ করে সঠিক রোল নির্বাচন করে সাইন ইন করুন।`
          : `Role mismatch: This account is registered as "${registeredLabel}", not "${selectedLabel}". Please select "${registeredLabel}" to sign in.`;
      throw new AuthRoleMismatchError(msg, profile.role, safeRole);
    }

    if (trimmedName && trimmedName !== profile.displayName) {
      await updateProfile(cred.user, { displayName: trimmedName }).catch(() => undefined);
      await updateUserProfileFields(profile.uid, { displayName: trimmedName });
      profile = { ...profile, displayName: trimmedName };
    }

    return profile;
  } finally {
    pendingAuthProfileOverrides = null;
  }
}

export async function signInWithGoogleRole(params: {
  name?: string;
  role: OperationalRole;
  district?: string;
  preferredLanguage: LanguageCode;
}): Promise<UserPublic> {
  const safeRole = sanitizeOperationalRole(params.role);
  const trimmedName = clampStr(params.name, FIELD_LIMITS.DISPLAY_NAME_MAX);
  const safeDistrict = clampStr(params.district || 'Dhaka', FIELD_LIMITS.DISTRICT_MAX);

  pendingAuthProfileOverrides = {
    displayName: trimmedName || undefined,
    role: safeRole,
    district: safeDistrict,
  };

  try {
    await signInWithPopup(auth, googleProvider);
    const profile = await ensureUserProfile(params.preferredLanguage, {
      displayName: trimmedName || undefined,
      role: safeRole,
      district: safeDistrict,
    });
    if (!profile) {
      throw new Error('Failed to initialize Google account profile.');
    }
    return profile;
  } finally {
    pendingAuthProfileOverrides = null;
  }
}

export async function resetPasswordByEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export function mapFirebaseAuthError(err: unknown, lang: LanguageCode): string {
  if (err instanceof AuthRoleMismatchError) {
    return err.message;
  }
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: string }).code || '')
      : '';

  switch (code) {
    case 'auth/operation-not-allowed':
      return lang === 'bn'
        ? 'Firebase Console-এ Email/Password অথেন্টিকেশন চালু করা নেই। Authentication > Sign-in method থেকে Email/Password চালু করুন।'
        : 'Email/Password sign-in is not yet enabled in Firebase Console. Enable it under Authentication > Sign-in method.';
    case 'auth/email-already-in-use':
      return lang === 'bn'
        ? 'এই ইমেইলটি ইতিমধ্যেই নিবন্ধিত। অনুগ্রহ করে সাইন ইন করুন।'
        : 'This email is already registered. Please switch to Sign In.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return lang === 'bn'
        ? 'ইমেইল বা পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে পুনরায় যাচাই করুন।'
        : 'Invalid email or password. Please verify your credentials and try again.';
    case 'auth/weak-password':
      return lang === 'bn'
        ? 'পাসওয়ার্ড দুর্বল। অনুগ্রহ করে কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।'
        : 'Password is too weak. Please enter at least 6 characters.';
    case 'auth/invalid-email':
      return lang === 'bn'
        ? 'সঠিক ইমেইল ঠিকানা প্রদান করুন।'
        : 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return lang === 'bn'
        ? 'অতিরিক্ত চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
        : 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
      return lang === 'bn'
        ? 'Google সাইন-ইন পপআপ সম্পন্ন হওয়ার আগেই বন্ধ করা হয়েছে।'
        : 'Google sign-in popup was closed before completion.';
    default:
      return err instanceof Error
        ? err.message
        : lang === 'bn'
          ? 'অথেন্টিকেশন ব্যর্থ হয়েছে।'
          : 'Authentication failed. Please try again.';
  }
}

export async function updateUserProfileFields(
  uid: string,
  updates: Partial<Pick<UserPublic, 'displayName' | 'district' | 'barRegistrationNo' | 'specialization' | 'preferredLanguage'>>
) {
  const path = `users/${uid}`;
  try {
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.displayName !== undefined) payload.displayName = clampStr(updates.displayName, FIELD_LIMITS.DISPLAY_NAME_MAX);
    if (updates.district !== undefined) payload.district = clampStr(updates.district, FIELD_LIMITS.DISTRICT_MAX);
    if (updates.barRegistrationNo !== undefined) payload.barRegistrationNo = clampStr(updates.barRegistrationNo, 60);
    if (updates.specialization !== undefined) payload.specialization = clampStr(updates.specialization, 100);
    if (updates.preferredLanguage !== undefined) payload.preferredLanguage = updates.preferredLanguage;
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateUserPrivatePII(
  uid: string,
  email: string,
  phone: string,
  nidLast4: string,
  address: string
) {
  const path = `users/${uid}/private/info`;
  try {
    await setDoc(
      doc(db, 'users', uid, 'private', 'info'),
      {
        uid,
        email: clampStr(email, 160),
        phone: clampStr(phone, 30),
        nidLast4: clampStr(nidLast4, 10),
        address: clampStr(address, 250),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateUserRoleAdmin(targetUid: string, newRole: UserRole, actor: UserPublic) {
  const path = `users/${targetUid}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', targetUid), {
      role: newRole,
      updatedAt: serverTimestamp(),
    });
    const logId = makeId('log');
    batch.set(doc(db, 'auditLogs', logId), {
      logId,
      actorUid: actor.uid,
      actorName: clampStr(actor.displayName, FIELD_LIMITS.DISPLAY_NAME_MAX),
      actorRole: actor.role,
      action: 'ROLE_UPDATED',
      targetPath: path,
      summary: clampStr(`Updated role for ${targetUid} to ${newRole}`, 300),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export interface StagedDocumentUpload {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  analysis: DocumentAnalysisResult;
}

export interface CreateCaseInput {
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
  emergencyFlag: boolean;
  submittedDocs: string[];
  requiredDocs: string[];
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
  stagedDocuments?: StagedDocumentUpload[];
}

export async function createLegalCase(input: CreateCaseInput, actor: UserPublic): Promise<{ caseId: string; caseNumber: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');

  const caseId = makeId('case');
  const caseNumber = generateCaseNumber();
  const eventId = makeId('ev');
  const logId = makeId('log');

  const safeTitle = clampStr(input.title, FIELD_LIMITS.TITLE_MAX);
  const safeDesc = clampStr(input.description, FIELD_LIMITS.DESC_MAX);
  if (safeTitle.length < FIELD_LIMITS.TITLE_MIN || safeDesc.length < FIELD_LIMITS.DESC_MIN) {
    throw new Error('Title and description must meet minimum length requirements.');
  }

  const batch = writeBatch(db);

  const publicStatusDoc = {
    caseNumber,
    district: clampStr(input.district, FIELD_LIMITS.DISTRICT_MAX),
    category: input.category,
    status: 'submitted' as CaseStatus,
    channel: input.channel,
    ownerUid: user.uid,
    updatedAt: serverTimestamp(),
  };

  const caseDoc: Record<string, unknown> = {
    caseId,
    caseNumber,
    citizenUid: user.uid,
    citizenName: clampStr(input.citizenName || actor.displayName, FIELD_LIMITS.DISPLAY_NAME_MAX),
    safeContactNote: clampStr(input.safeContactNote || 'Standard daytime contact permitted', FIELD_LIMITS.SAFE_CONTACT_MAX),
    consentGiven: Boolean(input.consentGiven),
    channel: input.channel,
    district: clampStr(input.district, FIELD_LIMITS.DISTRICT_MAX),
    upazila: clampStr(input.upazila, FIELD_LIMITS.DISTRICT_MAX),
    category: input.category,
    title: safeTitle,
    description: safeDesc,
    priority: input.priority,
    status: 'submitted' as CaseStatus,
    eligibilityVerified: false,
    emergencyFlag: Boolean(input.emergencyFlag),
    requiredDocs: input.requiredDocs.slice(0, FIELD_LIMITS.ARRAY_MAX).map((s) => clampStr(s, 140)),
    submittedDocs: input.submittedDocs.slice(0, FIELD_LIMITS.ARRAY_MAX).map((s) => clampStr(s, 140)),
    aiReviewStatus: 'pending_review' as AIReviewStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.aiClassification) caseDoc.aiClassification = clampStr(input.aiClassification, FIELD_LIMITS.AI_CLASS_MAX);
  if (input.aiSummary) caseDoc.aiSummary = clampStr(input.aiSummary, FIELD_LIMITS.AI_SUMMARY_MAX);
  if (input.aiRiskNote) caseDoc.aiRiskNote = clampStr(input.aiRiskNote, FIELD_LIMITS.AI_RISK_MAX);
  if (input.aiConfidence) caseDoc.aiConfidence = input.aiConfidence;
  if (input.aiUncertaintyNote) caseDoc.aiUncertaintyNote = clampStr(input.aiUncertaintyNote, FIELD_LIMITS.AI_UNCERTAINTY_MAX);
  if (input.aiExtractedFacts?.length) caseDoc.aiExtractedFacts = input.aiExtractedFacts.slice(0, 10).map((s) => clampStr(s, 220));
  if (input.aiMissingInfo?.length) caseDoc.aiMissingInfo = input.aiMissingInfo.slice(0, 10).map((s) => clampStr(s, 200));
  if (input.aiFollowUpQuestions?.length) caseDoc.aiFollowUpQuestions = input.aiFollowUpQuestions.slice(0, 8).map((s) => clampStr(s, 240));
  if (input.aiCitations?.length) caseDoc.aiCitations = input.aiCitations.slice(0, 8).map((s) => clampStr(s, 240));
  if (input.aiNextSteps?.length) caseDoc.aiNextSteps = input.aiNextSteps.slice(0, 8).map((s) => clampStr(s, 240));

  batch.set(doc(db, 'casePublicStatus', caseNumber), publicStatusDoc);
  batch.set(doc(db, 'cases', caseId), caseDoc);

  // Atomically attach any staged AI-analyzed documents in the same batch
  if (input.stagedDocuments?.length) {
    for (const staged of input.stagedDocuments.slice(0, 5)) {
      const docId = makeId('doc');
      const facts = staged.analysis.traceableFindings
        .slice(0, 10)
        .map((f) => clampStr(`[${f.sourceLocation}] ${f.fact}`, 260));
      batch.set(doc(db, 'cases', caseId, 'documents', docId), {
        docId,
        caseId,
        caseOwnerUid: user.uid,
        uploadedByUid: user.uid,
        uploadedByName: clampStr(actor.displayName, FIELD_LIMITS.DISPLAY_NAME_MAX),
        fileName: clampStr(staged.fileName, 160),
        mimeType: clampStr(staged.mimeType, 80),
        fileSizeBytes: Math.max(0, Math.min(10485760, Math.floor(staged.fileSizeBytes))),
        detectedType: clampStr(staged.analysis.detectedType || 'Supporting Document', 120),
        summary: clampStr(staged.analysis.summary || 'Document processed.', 1200),
        traceableFacts: facts,
        missingFields: staged.analysis.missingOrUnclearFields.slice(0, 8).map((m) => clampStr(m, 200)),
        legibilityConfidence: clampStr(staged.analysis.legibilityConfidence || 'moderate', 40),
        createdAt: serverTimestamp(),
      });
    }
  }

  batch.set(doc(db, 'cases', caseId, 'timeline', eventId), {
    eventId,
    caseId,
    caseOwnerUid: user.uid,
    actorUid: user.uid,
    actorName: clampStr(actor.displayName, FIELD_LIMITS.DISPLAY_NAME_MAX),
    actorRole: actor.role,
    actionType: 'CASE_SUBMITTED',
    note: clampStr(`Unified Case ${caseNumber} submitted via ${input.channel} in ${input.district} District.`, FIELD_LIMITS.NOTE_MAX),
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'auditLogs', logId), {
    logId,
    actorUid: user.uid,
    actorName: clampStr(actor.displayName, FIELD_LIMITS.DISPLAY_NAME_MAX),
    actorRole: actor.role,
    action: 'CASE_CREATED',
    targetPath: `cases/${caseId}`,
    summary: clampStr(`Created ${caseNumber} (${input.category}) in ${input.district}`, 300),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return { caseId, caseNumber };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `cases/${caseId}`);
  }
}

export async function updateLegalCaseWorkflow(
  legalCase: LegalCase,
  updates: Partial<{
    status: CaseStatus;
    priority: CasePriority;
    eligibilityVerified: boolean;
    emergencyFlag: boolean;
    safeContactNote: string;
    assignedLawyerUid: string;
    assignedLawyerName: string;
    assignedMediatorUid: string;
    assignedMediatorName: string;
    nextHearingDate: string;
    deadlineDate: string;
    requiredDocs: string[];
    submittedDocs: string[];
    district: string;
    aiClassification: string;
    aiSummary: string;
    aiRiskNote: string;
    aiConfidence: AIConfidenceLevel;
    aiUncertaintyNote: string;
    aiExtractedFacts: string[];
    aiMissingInfo: string[];
    aiFollowUpQuestions: string[];
    aiCitations: string[];
    aiNextSteps: string[];
    aiReviewStatus: AIReviewStatus;
    aiOfficerNote: string;
    aiReviewedByName: string;
  }>,
  actor: UserPublic,
  timelineAction: string,
  timelineNote: string
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');

  const batch = writeBatch(db);
  const casePayload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  const publicPayload: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (updates.status !== undefined) {
    casePayload.status = updates.status;
    publicPayload.status = updates.status;
  }
  if (updates.district !== undefined) {
    casePayload.district = clampStr(updates.district, FIELD_LIMITS.DISTRICT_MAX);
    publicPayload.district = clampStr(updates.district, FIELD_LIMITS.DISTRICT_MAX);
  }
  if (updates.nextHearingDate !== undefined) {
    casePayload.nextHearingDate = clampStr(updates.nextHearingDate, 40);
    publicPayload.nextHearingDate = clampStr(updates.nextHearingDate, 40);
  }
  if (updates.priority !== undefined) casePayload.priority = updates.priority;
  if (updates.eligibilityVerified !== undefined) casePayload.eligibilityVerified = updates.eligibilityVerified;
  if (updates.emergencyFlag !== undefined) casePayload.emergencyFlag = updates.emergencyFlag;
  if (updates.safeContactNote !== undefined) casePayload.safeContactNote = clampStr(updates.safeContactNote, FIELD_LIMITS.SAFE_CONTACT_MAX);
  if (updates.assignedLawyerUid !== undefined) casePayload.assignedLawyerUid = clampStr(updates.assignedLawyerUid, 128);
  if (updates.assignedLawyerName !== undefined) casePayload.assignedLawyerName = clampStr(updates.assignedLawyerName, 100);
  if (updates.assignedMediatorUid !== undefined) casePayload.assignedMediatorUid = clampStr(updates.assignedMediatorUid, 128);
  if (updates.assignedMediatorName !== undefined) casePayload.assignedMediatorName = clampStr(updates.assignedMediatorName, 100);
  if (updates.deadlineDate !== undefined) casePayload.deadlineDate = clampStr(updates.deadlineDate, 40);
  if (updates.requiredDocs !== undefined) casePayload.requiredDocs = updates.requiredDocs.slice(0, FIELD_LIMITS.ARRAY_MAX).map((s) => clampStr(s, 140));
  if (updates.submittedDocs !== undefined) casePayload.submittedDocs = updates.submittedDocs.slice(0, FIELD_LIMITS.ARRAY_MAX).map((s) => clampStr(s, 140));
  if (updates.aiClassification !== undefined) casePayload.aiClassification = clampStr(updates.aiClassification, FIELD_LIMITS.AI_CLASS_MAX);
  if (updates.aiSummary !== undefined) casePayload.aiSummary = clampStr(updates.aiSummary, FIELD_LIMITS.AI_SUMMARY_MAX);
  if (updates.aiRiskNote !== undefined) casePayload.aiRiskNote = clampStr(updates.aiRiskNote, FIELD_LIMITS.AI_RISK_MAX);
  if (updates.aiConfidence !== undefined) casePayload.aiConfidence = updates.aiConfidence;
  if (updates.aiUncertaintyNote !== undefined) casePayload.aiUncertaintyNote = clampStr(updates.aiUncertaintyNote, FIELD_LIMITS.AI_UNCERTAINTY_MAX);
  if (updates.aiExtractedFacts !== undefined) casePayload.aiExtractedFacts = updates.aiExtractedFacts.slice(0, 10).map((s) => clampStr(s, 220));
  if (updates.aiMissingInfo !== undefined) casePayload.aiMissingInfo = updates.aiMissingInfo.slice(0, 10).map((s) => clampStr(s, 200));
  if (updates.aiFollowUpQuestions !== undefined) casePayload.aiFollowUpQuestions = updates.aiFollowUpQuestions.slice(0, 8).map((s) => clampStr(s, 240));
  if (updates.aiCitations !== undefined) casePayload.aiCitations = updates.aiCitations.slice(0, 8).map((s) => clampStr(s, 240));
  if (updates.aiNextSteps !== undefined) casePayload.aiNextSteps = updates.aiNextSteps.slice(0, 8).map((s) => clampStr(s, 240));
  if (updates.aiReviewStatus !== undefined) casePayload.aiReviewStatus = updates.aiReviewStatus;
  if (updates.aiOfficerNote !== undefined) casePayload.aiOfficerNote = clampStr(updates.aiOfficerNote, 600);
  if (updates.aiReviewedByName !== undefined) casePayload.aiReviewedByName = clampStr(updates.aiReviewedByName, 100);

  batch.update(doc(db, 'cases', legalCase.caseId), casePayload);

  if (updates.status !== undefined || updates.district !== undefined || updates.nextHearingDate !== undefined) {
    batch.update(doc(db, 'casePublicStatus', legalCase.caseNumber), publicPayload);
  }

  const eventId = makeId('ev');
  const timelineDoc: Record<string, unknown> = {
    eventId,
    caseId: legalCase.caseId,
    caseOwnerUid: legalCase.citizenUid,
    actorUid: user.uid,
    actorName: clampStr(actor.displayName, FIELD_LIMITS.DISPLAY_NAME_MAX),
    actorRole: actor.role,
    actionType: clampStr(timelineAction, 60),
    note: clampStr(timelineNote, FIELD_LIMITS.NOTE_MAX),
    createdAt: serverTimestamp(),
  };
  const effectiveLawyer = updates.assignedLawyerUid ?? legalCase.assignedLawyerUid;
  if (effectiveLawyer) timelineDoc.caseLawyerUid = effectiveLawyer;

  batch.set(doc(db, 'cases', legalCase.caseId, 'timeline', eventId), timelineDoc);

  const logId = makeId('log');
  batch.set(doc(db, 'auditLogs', logId), {
    logId,
    actorUid: user.uid,
    actorName: clampStr(actor.displayName, FIELD_LIMITS.DISPLAY_NAME_MAX),
    actorRole: actor.role,
    action: clampStr(timelineAction, 80),
    targetPath: `cases/${legalCase.caseId}`,
    summary: clampStr(`${legalCase.caseNumber}: ${timelineNote}`, 300),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `cases/${legalCase.caseId}`);
  }
}

export async function sendCaseMessage(legalCase: LegalCase, text: string, actor: UserPublic) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');
  const safeText = clampStr(text, FIELD_LIMITS.MESSAGE_MAX);
  if (!safeText) return;

  const messageId = makeId('msg');
  const msgDoc: Record<string, unknown> = {
    messageId,
    caseId: legalCase.caseId,
    caseOwnerUid: legalCase.citizenUid,
    senderUid: user.uid,
    senderName: clampStr(actor.displayName, FIELD_LIMITS.DISPLAY_NAME_MAX),
    senderRole: actor.role,
    text: safeText,
    createdAt: serverTimestamp(),
  };
  if (legalCase.assignedLawyerUid) msgDoc.caseLawyerUid = legalCase.assignedLawyerUid;

  try {
    await setDoc(doc(db, 'cases', legalCase.caseId, 'messages', messageId), msgDoc);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `cases/${legalCase.caseId}/messages/${messageId}`);
  }
}

export async function scheduleMediationSession(
  legalCase: LegalCase,
  mediatorUid: string,
  mediatorName: string,
  scheduledAt: string,
  mode: MediationMode,
  actor: UserPublic
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');
  const mediationId = makeId('med');
  const eventId = makeId('ev');
  const logId = makeId('log');

  const batch = writeBatch(db);
  batch.set(doc(db, 'mediations', mediationId), {
    mediationId,
    caseId: legalCase.caseId,
    caseNumber: legalCase.caseNumber,
    citizenUid: legalCase.citizenUid,
    mediatorUid: clampStr(mediatorUid, 128),
    mediatorName: clampStr(mediatorName, 100),
    district: legalCase.district,
    scheduledAt: clampStr(scheduledAt, 60),
    mode,
    applicantConfirmed: false,
    respondentConfirmed: false,
    outcome: 'scheduled' as MediationOutcome,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'cases', legalCase.caseId), {
    status: 'in_mediation' as CaseStatus,
    assignedMediatorUid: clampStr(mediatorUid, 128),
    assignedMediatorName: clampStr(mediatorName, 100),
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'casePublicStatus', legalCase.caseNumber), {
    status: 'in_mediation' as CaseStatus,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'cases', legalCase.caseId, 'timeline', eventId), {
    eventId,
    caseId: legalCase.caseId,
    caseOwnerUid: legalCase.citizenUid,
    actorUid: user.uid,
    actorName: clampStr(actor.displayName, 100),
    actorRole: actor.role,
    actionType: 'MEDIATION_SCHEDULED',
    note: clampStr(`Mediation scheduled for ${scheduledAt} (${mode}) with ${mediatorName}.`, 600),
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'auditLogs', logId), {
    logId,
    actorUid: user.uid,
    actorName: clampStr(actor.displayName, 100),
    actorRole: actor.role,
    action: 'MEDIATION_SCHEDULED',
    targetPath: `mediations/${mediationId}`,
    summary: clampStr(`Scheduled mediation for ${legalCase.caseNumber}`, 300),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `mediations/${mediationId}`);
  }
}

export async function updateMediationSession(
  mediationId: string,
  caseId: string,
  caseNumber: string,
  citizenUid: string,
  updates: Partial<{
    applicantConfirmed: boolean;
    respondentConfirmed: boolean;
    outcome: MediationOutcome;
    settlementTerms: string;
    mode: MediationMode;
    scheduledAt: string;
  }>,
  actor: UserPublic
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');

  const batch = writeBatch(db);
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.applicantConfirmed !== undefined) payload.applicantConfirmed = updates.applicantConfirmed;
  if (updates.respondentConfirmed !== undefined) payload.respondentConfirmed = updates.respondentConfirmed;
  if (updates.outcome !== undefined) payload.outcome = updates.outcome;
  if (updates.mode !== undefined) payload.mode = updates.mode;
  if (updates.scheduledAt !== undefined) payload.scheduledAt = clampStr(updates.scheduledAt, 60);
  if (updates.settlementTerms !== undefined) payload.settlementTerms = clampStr(updates.settlementTerms, FIELD_LIMITS.SETTLEMENT_MAX);

  batch.update(doc(db, 'mediations', mediationId), payload);

  if (updates.outcome === 'settled_amicably' || updates.outcome === 'referred_to_court') {
    const newCaseStatus: CaseStatus = updates.outcome === 'settled_amicably' ? 'settled' : 'court_proceeding';
    batch.update(doc(db, 'cases', caseId), {
      status: newCaseStatus,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'casePublicStatus', caseNumber), {
      status: newCaseStatus,
      updatedAt: serverTimestamp(),
    });
    const eventId = makeId('ev');
    batch.set(doc(db, 'cases', caseId, 'timeline', eventId), {
      eventId,
      caseId,
      caseOwnerUid: citizenUid,
      actorUid: user.uid,
      actorName: clampStr(actor.displayName, 100),
      actorRole: actor.role,
      actionType: 'MEDIATION_OUTCOME',
      note: clampStr(
        updates.outcome === 'settled_amicably'
          ? `Dispute settled amicably via Digital Mediation. ${updates.settlementTerms || ''}`
          : 'Mediation concluded; referred to formal court proceeding.',
        600
      ),
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `mediations/${mediationId}`);
  }
}

export async function createCaseReferral(
  legalCase: LegalCase,
  toDistrict: string,
  reason: string,
  actor: UserPublic
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');
  const referralId = makeId('ref');
  const eventId = makeId('ev');
  const logId = makeId('log');

  const batch = writeBatch(db);
  batch.set(doc(db, 'referrals', referralId), {
    referralId,
    caseId: legalCase.caseId,
    caseNumber: legalCase.caseNumber,
    citizenUid: legalCase.citizenUid,
    fromDistrict: legalCase.district,
    toDistrict: clampStr(toDistrict, FIELD_LIMITS.DISTRICT_MAX),
    reason: clampStr(reason, 600),
    status: 'pending' as ReferralStatus,
    requestedByUid: user.uid,
    requestedByName: clampStr(actor.displayName, 100),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'cases', legalCase.caseId, 'timeline', eventId), {
    eventId,
    caseId: legalCase.caseId,
    caseOwnerUid: legalCase.citizenUid,
    actorUid: user.uid,
    actorName: clampStr(actor.displayName, 100),
    actorRole: actor.role,
    actionType: 'INTER_DISTRICT_REFERRAL',
    note: clampStr(`Inter-district transfer initiated from ${legalCase.district} to ${toDistrict}: ${reason}`, 600),
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'auditLogs', logId), {
    logId,
    actorUid: user.uid,
    actorName: clampStr(actor.displayName, 100),
    actorRole: actor.role,
    action: 'REFERRAL_CREATED',
    targetPath: `referrals/${referralId}`,
    summary: clampStr(`Referred ${legalCase.caseNumber} to ${toDistrict}`, 300),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `referrals/${referralId}`);
  }
}

export async function updateReferralStatus(
  referralId: string,
  caseId: string,
  caseNumber: string,
  citizenUid: string,
  toDistrict: string,
  status: ReferralStatus,
  actor: UserPublic
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');

  const batch = writeBatch(db);
  batch.update(doc(db, 'referrals', referralId), {
    status,
    handledByUid: user.uid,
    updatedAt: serverTimestamp(),
  });

  if (status === 'accepted') {
    batch.update(doc(db, 'cases', caseId), {
      district: clampStr(toDistrict, FIELD_LIMITS.DISTRICT_MAX),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'casePublicStatus', caseNumber), {
      district: clampStr(toDistrict, FIELD_LIMITS.DISTRICT_MAX),
      updatedAt: serverTimestamp(),
    });
    const eventId = makeId('ev');
    batch.set(doc(db, 'cases', caseId, 'timeline', eventId), {
      eventId,
      caseId,
      caseOwnerUid: citizenUid,
      actorUid: user.uid,
      actorName: clampStr(actor.displayName, 100),
      actorRole: actor.role,
      actionType: 'REFERRAL_ACCEPTED',
      note: clampStr(`Case jurisdiction accepted by ${toDistrict} DLAO under unified ID ${caseNumber}.`, 600),
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `referrals/${referralId}`);
  }
}

export async function createCommitteeMeeting(
  district: string,
  chairpersonName: string,
  meetingDate: string,
  agenda: string,
  decisions: string,
  casesReviewedCount: number,
  actor: UserPublic
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');
  const meetingId = makeId('meet');
  try {
    await setDoc(doc(db, 'committeeMeetings', meetingId), {
      meetingId,
      district: clampStr(district, 60),
      chairpersonName: clampStr(chairpersonName, 100),
      meetingDate: clampStr(meetingDate, 40),
      agenda: clampStr(agenda, 400),
      decisions: clampStr(decisions, 1500),
      casesReviewedCount: Math.max(0, Math.min(10000, Math.floor(casesReviewedCount))),
      createdByUid: user.uid,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `committeeMeetings/${meetingId}`);
  }
}

export async function submitComplaint(
  district: string,
  subject: string,
  details: string,
  caseNumber: string,
  actor: UserPublic
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');
  const complaintId = makeId('cmp');
  const payload: Record<string, unknown> = {
    complaintId,
    reporterUid: user.uid,
    reporterName: clampStr(actor.displayName, 100),
    district: clampStr(district, 60),
    subject: clampStr(subject, 200),
    details: clampStr(details, 1200),
    status: 'open' as ComplaintStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (caseNumber.trim()) payload.caseNumber = clampStr(caseNumber, 32);

  try {
    await setDoc(doc(db, 'complaints', complaintId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `complaints/${complaintId}`);
  }
}

export async function resolveComplaint(complaintId: string, status: ComplaintStatus, resolutionNote: string) {
  try {
    await updateDoc(doc(db, 'complaints', complaintId), {
      status,
      resolutionNote: clampStr(resolutionNote, 800),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `complaints/${complaintId}`);
  }
}

export async function lookupPublicCaseStatus(caseNumber: string): Promise<CasePublicStatus | null> {
  const cleaned = caseNumber.trim().toUpperCase();
  if (!FIELD_LIMITS.CASE_NUMBER_PATTERN.test(cleaned)) {
    return null;
  }
  try {
    const snap = await getDoc(doc(db, 'casePublicStatus', cleaned));
    if (!snap.exists()) return null;
    return snap.data() as CasePublicStatus;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `casePublicStatus/${cleaned}`);
  }
}

export async function analyzeCaseWithAI(params: {
  title: string;
  description: string;
  category: LegalCategory;
  district: string;
  submittedDocs: string[];
  documentSummaries?: string[];
  language: LanguageCode;
}): Promise<AIAnalysisResult> {
  const res = await fetch('/api/ai/analyze-case', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'AI analysis failed');
  }
  return data as AIAnalysisResult;
}

export async function analyzeDocumentWithAI(params: {
  fileName: string;
  mimeType: string;
  base64Data: string;
  language: LanguageCode;
}): Promise<DocumentAnalysisResult> {
  const res = await fetch('/api/ai/analyze-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Document analysis failed');
  }
  return data as DocumentAnalysisResult;
}

export async function queryBangladeshLegalRag(params: {
  question: string;
  category?: string;
  language: LanguageCode;
}): Promise<RagQueryResult> {
  const res = await fetch('/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Legal RAG query failed');
  }
  return data as RagQueryResult;
}

export async function saveCaseDocumentRecord(
  legalCase: LegalCase,
  staged: StagedDocumentUpload,
  actor: UserPublic
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');

  const docId = makeId('doc');
  const eventId = makeId('ev');
  const logId = makeId('log');
  const batch = writeBatch(db);

  const facts = staged.analysis.traceableFindings
    .slice(0, 10)
    .map((f) => clampStr(`[${f.sourceLocation}] ${f.fact}`, 260));

  const docRecord: Record<string, unknown> = {
    docId,
    caseId: legalCase.caseId,
    caseOwnerUid: legalCase.citizenUid,
    uploadedByUid: user.uid,
    uploadedByName: clampStr(actor.displayName, FIELD_LIMITS.DISPLAY_NAME_MAX),
    fileName: clampStr(staged.fileName, 160),
    mimeType: clampStr(staged.mimeType, 80),
    fileSizeBytes: Math.max(0, Math.min(10485760, Math.floor(staged.fileSizeBytes))),
    detectedType: clampStr(staged.analysis.detectedType || 'Supporting Document', 120),
    summary: clampStr(staged.analysis.summary || 'Document processed.', 1200),
    traceableFacts: facts,
    missingFields: staged.analysis.missingOrUnclearFields.slice(0, 8).map((m) => clampStr(m, 200)),
    legibilityConfidence: clampStr(staged.analysis.legibilityConfidence || 'moderate', 40),
    createdAt: serverTimestamp(),
  };
  if (legalCase.assignedLawyerUid) docRecord.caseLawyerUid = legalCase.assignedLawyerUid;

  batch.set(doc(db, 'cases', legalCase.caseId, 'documents', docId), docRecord);

  const updatedSubmitted = Array.from(
    new Set([...(legalCase.submittedDocs || []), staged.analysis.detectedType || staged.fileName])
  )
    .slice(0, FIELD_LIMITS.ARRAY_MAX)
    .map((s) => clampStr(s, 140));

  batch.update(doc(db, 'cases', legalCase.caseId), {
    submittedDocs: updatedSubmitted,
    updatedAt: serverTimestamp(),
  });

  const tlDoc: Record<string, unknown> = {
    eventId,
    caseId: legalCase.caseId,
    caseOwnerUid: legalCase.citizenUid,
    actorUid: user.uid,
    actorName: clampStr(actor.displayName, FIELD_LIMITS.DISPLAY_NAME_MAX),
    actorRole: actor.role,
    actionType: 'DOCUMENT_EXTRACTED',
    note: clampStr(`Document Intelligence processed "${staged.fileName}" (${staged.analysis.detectedType}).`, 600),
    createdAt: serverTimestamp(),
  };
  if (legalCase.assignedLawyerUid) tlDoc.caseLawyerUid = legalCase.assignedLawyerUid;
  batch.set(doc(db, 'cases', legalCase.caseId, 'timeline', eventId), tlDoc);

  batch.set(doc(db, 'auditLogs', logId), {
    logId,
    actorUid: user.uid,
    actorName: clampStr(actor.displayName, FIELD_LIMITS.DISPLAY_NAME_MAX),
    actorRole: actor.role,
    action: 'DOCUMENT_OCR_ANALYZED',
    targetPath: `cases/${legalCase.caseId}/documents/${docId}`,
    summary: clampStr(`${legalCase.caseNumber}: Extracted facts from ${staged.fileName}`, 300),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `cases/${legalCase.caseId}/documents/${docId}`);
  }
}

export async function seedSampleBangladeshCases(actor: UserPublic): Promise<number> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');

  const samples: Array<{
    caseId: string;
    caseNumber: string;
    citizenName: string;
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
    submittedDocs: string[];
    requiredDocs: string[];
  }> = [
    {
      caseId: 'seed_case_dhk_1042',
      caseNumber: 'LBD-2026-1042',
      citizenName: 'Rahima Begum',
      channel: 'helpline_16699',
      district: 'Dhaka',
      upazila: 'Savar',
      category: 'family_maintenance',
      title: 'Spousal & Child Maintenance Claim under Family Courts Ordinance',
      description: 'Applicant seeks monthly maintenance for two school-going children after abandonment. Income certificate issued by Savar Union Parishad.',
      priority: 'high',
      status: 'in_mediation',
      eligibilityVerified: true,
      emergencyFlag: false,
      assignedLawyerUid: 'lawyer_farhana_dhaka',
      assignedLawyerName: 'Adv. Farhana Yasmin',
      assignedMediatorUid: 'med_shafiq_dhaka',
      assignedMediatorName: 'Justice (Retd.) Shafiqur Rahman',
      nextHearingDate: '2026-11-28',
      deadlineDate: '2026-11-25',
      submittedDocs: ['National ID (NID) / Birth Certificate', 'Union Parishad / Ward Income Certificate'],
      requiredDocs: ['National ID (NID) / Birth Certificate', 'Union Parishad / Ward Income Certificate', 'Witness or Marriage / Kabinnama Copy'],
    },
    {
      caseId: 'seed_case_ctg_2088',
      caseNumber: 'LBD-2026-2088',
      citizenName: 'Md. Karim Uddin',
      channel: 'udc_assisted',
      district: 'Chattogram',
      upazila: 'Sitakunda',
      category: 'labor_wages',
      title: 'Unpaid 4-Month Factory Wages & Severance Settlement',
      description: 'Submitted through Sitakunda UDC. Garment worker seeking unpaid wages and overtime dues after sudden unit closure.',
      priority: 'high',
      status: 'lawyer_assigned',
      eligibilityVerified: true,
      emergencyFlag: false,
      assignedLawyerUid: 'lawyer_tasnim_ctg',
      assignedLawyerName: 'Adv. Tasnim Chowdhury',
      nextHearingDate: '2026-12-03',
      deadlineDate: '2026-11-29',
      submittedDocs: ['National ID (NID) / Birth Certificate', 'DLAO Eligibility Declaration Form'],
      requiredDocs: ['National ID (NID) / Birth Certificate', 'DLAO Eligibility Declaration Form'],
    },
    {
      caseId: 'seed_case_syl_3015',
      caseNumber: 'LBD-2026-3015',
      citizenName: 'Salma Akter',
      channel: 'ussd_16699',
      district: 'Sylhet',
      upazila: 'Beanibazar',
      category: 'domestic_violence',
      title: 'Urgent Protection Order & Safe Shelter Assistance',
      description: 'Initiated via *16699# USSD emergency menu. Safe contact strictly between 10:00 AM and 2:00 PM only.',
      priority: 'critical',
      status: 'dlao_review',
      eligibilityVerified: false,
      emergencyFlag: true,
      deadlineDate: '2026-11-21',
      submittedDocs: ['Plaint / General Diary (GD) / FIR Copy'],
      requiredDocs: ['National ID (NID) / Birth Certificate', 'Plaint / General Diary (GD) / FIR Copy'],
    },
    {
      caseId: 'seed_case_raj_4119',
      caseNumber: 'LBD-2026-4119',
      citizenName: 'Harun-or-Rashid',
      channel: 'web',
      district: 'Rajshahi',
      upazila: 'Paba',
      category: 'land_property',
      title: 'Agricultural Homestead Boundary Demarcation Dispute',
      description: 'Senior citizen requesting free legal representation and ADR mediation regarding inherited 12-decimal homestead plot.',
      priority: 'medium',
      status: 'settled',
      eligibilityVerified: true,
      emergencyFlag: false,
      assignedLawyerUid: 'lawyer_kamrul_raj',
      assignedLawyerName: 'Adv. Kamrul Islam',
      submittedDocs: ['National ID (NID) / Birth Certificate', 'Land Khatian / Deed / Rent Agreement'],
      requiredDocs: ['National ID (NID) / Birth Certificate', 'Land Khatian / Deed / Rent Agreement'],
    },
  ];

  const batch = writeBatch(db);
  for (const item of samples) {
    batch.set(doc(db, 'casePublicStatus', item.caseNumber), {
      caseNumber: item.caseNumber,
      district: item.district,
      category: item.category,
      status: item.status,
      channel: item.channel,
      nextHearingDate: item.nextHearingDate || '',
      ownerUid: user.uid,
      updatedAt: serverTimestamp(),
    });

    const caseObj: Record<string, unknown> = {
      caseId: item.caseId,
      caseNumber: item.caseNumber,
      citizenUid: user.uid,
      citizenName: item.citizenName,
      safeContactNote: item.emergencyFlag ? 'Safe window 10:00–14:00 only' : 'Standard daytime phone/SMS',
      consentGiven: true,
      channel: item.channel,
      district: item.district,
      upazila: item.upazila,
      category: item.category,
      title: item.title,
      description: item.description,
      priority: item.priority,
      status: item.status,
      eligibilityVerified: item.eligibilityVerified,
      emergencyFlag: item.emergencyFlag,
      requiredDocs: item.requiredDocs,
      submittedDocs: item.submittedDocs,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (item.assignedLawyerUid) caseObj.assignedLawyerUid = item.assignedLawyerUid;
    if (item.assignedLawyerName) caseObj.assignedLawyerName = item.assignedLawyerName;
    if (item.assignedMediatorUid) caseObj.assignedMediatorUid = item.assignedMediatorUid;
    if (item.assignedMediatorName) caseObj.assignedMediatorName = item.assignedMediatorName;
    if (item.nextHearingDate) caseObj.nextHearingDate = item.nextHearingDate;
    if (item.deadlineDate) caseObj.deadlineDate = item.deadlineDate;

    batch.set(doc(db, 'cases', item.caseId), caseObj);

    const evId = `seed_ev_${item.caseId}`;
    batch.set(doc(db, 'cases', item.caseId, 'timeline', evId), {
      eventId: evId,
      caseId: item.caseId,
      caseOwnerUid: user.uid,
      actorUid: user.uid,
      actorName: clampStr(actor.displayName, 100),
      actorRole: actor.role,
      actionType: 'CASE_INITIALIZED',
      note: `Case ${item.caseNumber} registered in ${item.district} DLAO queue.`,
      createdAt: serverTimestamp(),
    });
  }

  // Seed one active mediation & one inter-district referral & one meeting
  batch.set(doc(db, 'mediations', 'seed_med_1042'), {
    mediationId: 'seed_med_1042',
    caseId: 'seed_case_dhk_1042',
    caseNumber: 'LBD-2026-1042',
    citizenUid: user.uid,
    mediatorUid: 'med_shafiq_dhaka',
    mediatorName: 'Justice (Retd.) Shafiqur Rahman',
    district: 'Dhaka',
    scheduledAt: '2026-11-24 11:00 AM',
    mode: 'hybrid',
    applicantConfirmed: true,
    respondentConfirmed: false,
    outcome: 'scheduled',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'referrals', 'seed_ref_2088'), {
    referralId: 'seed_ref_2088',
    caseId: 'seed_case_ctg_2088',
    caseNumber: 'LBD-2026-2088',
    citizenUid: user.uid,
    fromDistrict: 'Chattogram',
    toDistrict: 'Dhaka',
    reason: 'Employer head office registered in Dhaka Labor Appellate jurisdiction.',
    status: 'pending',
    requestedByUid: user.uid,
    requestedByName: clampStr(actor.displayName, 100),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'committeeMeetings', 'seed_meet_dhk'), {
    meetingId: 'seed_meet_dhk',
    district: 'Dhaka',
    chairpersonName: 'District & Sessions Judge (Dhaka DLAO Chair)',
    meetingDate: '2026-11-15',
    agenda: 'Monthly panel advocate assignment audit & fast-track mediation review',
    decisions: 'Approved 42 new legal aid applications; mandated 7-day SLA on domestic violence protection orders.',
    casesReviewedCount: 42,
    createdByUid: user.uid,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return samples.length;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'cases/seed');
  }
}

export function getPublicCollectionRefs() {
  return {
    casesCol: collection(db, 'cases'),
    mediationsCol: collection(db, 'mediations'),
    referralsCol: collection(db, 'referrals'),
    meetingsCol: collection(db, 'committeeMeetings'),
    complaintsCol: collection(db, 'complaints'),
    auditLogsCol: collection(db, 'auditLogs'),
    usersCol: collection(db, 'users'),
  };
}
