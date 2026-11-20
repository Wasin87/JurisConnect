import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Send,
  Calendar,
  FileText,
  ArrowRightLeft,
  Scale,
  Loader2,
  ShieldAlert,
  Upload,
  BookOpen,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { auth, BOOTSTRAPPED_ADMIN_EMAIL, db, handleFirestoreError, OperationType } from '../firebase';
import {
  BANGLADESH_DISTRICTS,
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  MEDIATORS_ROSTER,
  PANEL_LAWYERS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  t,
} from '../i18n';
import type {
  AIReviewStatus,
  CaseDocumentRecord,
  CaseMessage,
  CaseStatus,
  CaseTimelineEvent,
  LanguageCode,
  LegalCase,
  MediationMode,
  UserPublic,
} from '../types';
import {
  analyzeCaseWithAI,
  analyzeDocumentWithAI,
  createCaseReferral,
  saveCaseDocumentRecord,
  scheduleMediationSession,
  sendCaseMessage,
  updateLegalCaseWorkflow,
} from '../services/legalBdService';
import { fireSubtleMilestoneConfetti } from '../utils/confetti';

interface CaseDetailDrawerProps {
  legalCase: LegalCase | null;
  user: UserPublic;
  lang: LanguageCode;
  lowBandwidth: boolean;
  onClose: () => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

export const CaseDetailDrawer: React.FC<CaseDetailDrawerProps> = ({
  legalCase,
  user,
  lang,
  lowBandwidth,
  onClose,
}) => {
  const [timeline, setTimeline] = useState<CaseTimelineEvent[]>([]);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [documents, setDocuments] = useState<CaseDocumentRecord[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [hearingDate, setHearingDate] = useState('');
  const [selectedLawyerUid, setSelectedLawyerUid] = useState(PANEL_LAWYERS[0].uid);
  const [selectedMediatorUid, setSelectedMediatorUid] = useState(MEDIATORS_ROSTER[0].uid);
  const [mediationDate, setMediationDate] = useState('2026-11-29 11:00 AM');
  const [mediationMode, setMediationMode] = useState<MediationMode>('hybrid');
  const [referralDistrict, setReferralDistrict] = useState(BANGLADESH_DISTRICTS[0]);
  const [referralReason, setReferralReason] = useState('');

  // Human-supervised AI review state
  const [reviewStatus, setReviewStatus] = useState<AIReviewStatus>('approved');
  const [editedClassification, setEditedClassification] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [officerReviewNote, setOfficerReviewNote] = useState('');

  const [aiBusy, setAiBusy] = useState(false);
  const [docBusy, setDocBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!legalCase) return;
    setHearingDate(legalCase.nextHearingDate || '');
    setEditedClassification(legalCase.aiClassification || '');
    setEditedSummary(legalCase.aiSummary || '');
    setOfficerReviewNote(legalCase.aiOfficerNote || '');
    setReviewStatus(legalCase.aiReviewStatus || 'approved');

    const currentFbUser = auth.currentUser;
    const uid = currentFbUser?.uid || user.uid;
    const isRootAdmin =
      currentFbUser?.email === BOOTSTRAPPED_ADMIN_EMAIL &&
      Boolean(currentFbUser?.emailVerified);

    const getMillis = (ts?: { toMillis?: () => number } | null) => ts?.toMillis?.() ?? 0;
    const unsubs: Array<() => void> = [];

    const tlPath = `cases/${legalCase.caseId}/timeline`;
    const msgPath = `cases/${legalCase.caseId}/messages`;
    const docsPath = `cases/${legalCase.caseId}/documents`;

    if (isRootAdmin) {
      unsubs.push(
        onSnapshot(
          query(collection(db, tlPath), orderBy('createdAt', 'desc')),
          (snap) => setTimeline(snap.docs.map((d) => d.data() as CaseTimelineEvent)),
          (err) => handleFirestoreError(err, OperationType.LIST, tlPath)
        )
      );
      unsubs.push(
        onSnapshot(
          query(collection(db, msgPath), orderBy('createdAt', 'asc')),
          (snap) => setMessages(snap.docs.map((d) => d.data() as CaseMessage)),
          (err) => handleFirestoreError(err, OperationType.LIST, msgPath)
        )
      );
      unsubs.push(
        onSnapshot(
          query(collection(db, docsPath), orderBy('createdAt', 'desc')),
          (snap) => setDocuments(snap.docs.map((d) => d.data() as CaseDocumentRecord)),
          (err) => handleFirestoreError(err, OperationType.LIST, docsPath)
        )
      );
    } else {
      const attachFilteredSubcollection = <T extends { createdAt?: { toMillis?: () => number } | null }>(
        path: string,
        actorField: 'actorUid' | 'senderUid' | 'uploadedByUid',
        direction: 'asc' | 'desc',
        setter: React.Dispatch<React.SetStateAction<T[]>>
      ) => {
        const buckets = new Map<string, Map<string, T>>();
        const sync = () => {
          const merged = new Map<string, T>();
          buckets.forEach((b) => b.forEach((val, key) => merged.set(key, val)));
          const sorted = Array.from(merged.values()).sort((a, b) => {
            const diff = getMillis(a.createdAt) - getMillis(b.createdAt);
            return direction === 'asc' ? diff : -diff;
          });
          setter(sorted);
        };

        const addQuery = (bucketKey: string, field: string) => {
          unsubs.push(
            onSnapshot(
              query(collection(db, path), where(field, '==', uid)),
              (snap) => {
                const bucket = new Map<string, T>();
                snap.docs.forEach((d) => bucket.set(d.id, d.data() as T));
                buckets.set(bucketKey, bucket);
                sync();
              },
              (err) => handleFirestoreError(err, OperationType.LIST, path)
            )
          );
        };

        if (legalCase.citizenUid === uid) {
          addQuery('owner', 'caseOwnerUid');
        } else if (legalCase.assignedLawyerUid === uid) {
          addQuery('lawyer', 'caseLawyerUid');
          addQuery('actor', actorField);
        } else {
          addQuery('actor', actorField);
        }
      };

      attachFilteredSubcollection<CaseTimelineEvent>(tlPath, 'actorUid', 'desc', setTimeline);
      attachFilteredSubcollection<CaseMessage>(msgPath, 'senderUid', 'asc', setMessages);
      attachFilteredSubcollection<CaseDocumentRecord>(docsPath, 'uploadedByUid', 'desc', setDocuments);
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [legalCase?.caseId, legalCase?.citizenUid, legalCase?.assignedLawyerUid, legalCase?.aiClassification, legalCase?.aiSummary, user.uid]);

  if (!legalCase) return null;

  const isOfficerOrAdmin = ['admin', 'dlao_officer', 'supervisor'].includes(user.role);
  const isLawyerOrAdmin = user.role === 'admin' || user.role === 'panel_lawyer';

  const handleRunAI = async () => {
    setAiBusy(true);
    setFeedback(null);
    try {
      const res = await analyzeCaseWithAI({
        title: legalCase.title,
        description: legalCase.description,
        category: legalCase.category,
        district: legalCase.district,
        submittedDocs: legalCase.submittedDocs || [],
        documentSummaries: documents.map(
          (d) => `${d.fileName} (${d.detectedType}): ${d.summary} Facts: ${d.traceableFacts.join('; ')}`
        ),
        language: lang,
      });
      await updateLegalCaseWorkflow(
        legalCase,
        {
          aiClassification: res.classification,
          aiSummary: res.summary,
          aiRiskNote: res.riskNote,
          aiConfidence: res.confidenceLevel,
          aiUncertaintyNote: res.uncertaintyNote,
          aiExtractedFacts: res.extractedFacts,
          aiMissingInfo: res.missingInfo,
          aiFollowUpQuestions: res.followUpQuestions,
          aiCitations: res.citations,
          aiNextSteps: res.suggestedNextSteps,
          requiredDocs: Array.from(
            new Set([...(legalCase.requiredDocs || []), ...res.missingDocuments])
          ).slice(0, 10),
        },
        user,
        'AI_CASE_ANALYSIS',
        `Explainable AI brief generated: ${res.classification} (Confidence: ${res.confidenceLevel}).`
      );
      setFeedback(t(lang, 'Explainable AI case intelligence synced to Firestore.', 'এআই কেস বিশ্লেষণ সংরক্ষিত হয়েছে।'));
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'AI analysis failed');
    } finally {
      setAiBusy(false);
    }
  };

  const handleUploadCaseDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 7 * 1024 * 1024) {
      setFeedback(t(lang, 'Document must be under 7 MB.', 'ফাইলের আকার ৭ মেগাবাইটের কম হতে হবে।'));
      return;
    }

    const mimeType = file.type || (file.name.endsWith('.txt') ? 'text/plain' : 'image/jpeg');
    setDocBusy(true);
    setFeedback(null);
    try {
      const base64Data = await fileToBase64(file);
      const analysis = await analyzeDocumentWithAI({
        fileName: file.name,
        mimeType,
        base64Data,
        language: lang,
      });
      await saveCaseDocumentRecord(
        legalCase,
        { fileName: file.name, mimeType, fileSizeBytes: file.size, analysis },
        user
      );
      setFeedback(
        t(
          lang,
          `Extracted traceable facts from "${file.name}".`,
          `"${file.name}" থেকে তথ্য যাচাই ও সংরক্ষণ সম্পন্ন হয়েছে।`
        )
      );
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Document intelligence extraction failed.');
    } finally {
      setDocBusy(false);
    }
  };

  const handleSubmitOfficerAiReview = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await updateLegalCaseWorkflow(
        legalCase,
        {
          aiReviewStatus: reviewStatus,
          aiOfficerNote: officerReviewNote.trim() || `AI output ${reviewStatus} by ${user.displayName}.`,
          aiReviewedByName: user.displayName,
          ...(editedClassification.trim() ? { aiClassification: editedClassification.trim() } : {}),
          ...(editedSummary.trim() ? { aiSummary: editedSummary.trim() } : {}),
          status: legalCase.status === 'submitted' ? 'dlao_review' : legalCase.status,
        },
        user,
        'OFFICER_AI_REVIEW',
        `Human supervision decision (${reviewStatus.toUpperCase()}): ${officerReviewNote.trim() || 'Reviewed AI brief.'}`
      );
      setFeedback(
        t(
          lang,
          'Human-supervised AI review decision recorded and audited.',
          'কর্মকর্তার এআই পর্যালোচনা ও অনুমোদন অডিট লগসহ সংরক্ষিত হয়েছে।'
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const handleApproveAndVerify = async () => {
    setBusy(true);
    try {
      await updateLegalCaseWorkflow(
        legalCase,
        { status: 'approved', eligibilityVerified: true },
        user,
        'DLAO_APPROVED',
        'Eligibility verified under Legal Aid Services Act 2000; approved for free legal aid.'
      );
      fireSubtleMilestoneConfetti(lowBandwidth);
      setFeedback(t(lang, 'Case approved for legal aid.', 'মামলাটি আইনি সহায়তার জন্য অনুমোদিত হয়েছে।'));
    } finally {
      setBusy(false);
    }
  };

  const handleAssignLawyer = async () => {
    const lawyer = PANEL_LAWYERS.find((l) => l.uid === selectedLawyerUid) || PANEL_LAWYERS[0];
    setBusy(true);
    try {
      await updateLegalCaseWorkflow(
        legalCase,
        {
          status: 'lawyer_assigned',
          eligibilityVerified: true,
          assignedLawyerUid: lawyer.uid,
          assignedLawyerName: lawyer.name,
        },
        user,
        'LAWYER_ASSIGNED',
        `Assigned panel advocate ${lawyer.name} (${lawyer.barId}).`
      );
      fireSubtleMilestoneConfetti(lowBandwidth);
      setFeedback(`${lawyer.name} assigned.`);
    } finally {
      setBusy(false);
    }
  };

  const handleScheduleMediation = async () => {
    const med = MEDIATORS_ROSTER.find((m) => m.uid === selectedMediatorUid) || MEDIATORS_ROSTER[0];
    setBusy(true);
    try {
      await scheduleMediationSession(legalCase, med.uid, med.name, mediationDate, mediationMode, user);
      fireSubtleMilestoneConfetti(lowBandwidth);
      setFeedback(t(lang, 'Digital mediation session scheduled.', 'ডিজিটাল মধ্যস্থতা সেশন নির্ধারিত হয়েছে।'));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateReferral = async () => {
    if (referralReason.trim().length < 4) return;
    setBusy(true);
    try {
      await createCaseReferral(legalCase, referralDistrict, referralReason.trim(), user);
      setReferralReason('');
      setFeedback(
        t(lang, `Inter-district referral sent to ${referralDistrict}.`, `${referralDistrict} জেলায় রেফারেল পাঠানো হয়েছে।`)
      );
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateHearingOrProgress = async (newStatus?: CaseStatus) => {
    setBusy(true);
    try {
      await updateLegalCaseWorkflow(
        legalCase,
        {
          nextHearingDate: hearingDate || legalCase.nextHearingDate,
          status: newStatus ?? legalCase.status,
        },
        user,
        'PROGRESS_UPDATE',
        progressNote.trim() || `Updated hearing schedule (${hearingDate || 'TBD'}) and status.`
      );
      setProgressNote('');
      setFeedback(t(lang, 'Progress synced in real time.', 'অগ্রগতি রিয়েল-টাইমে আপডেট হয়েছে।'));
    } finally {
      setBusy(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const text = newMessage.trim();
    setNewMessage('');
    await sendCaseMessage(legalCase, text, user);
  };

  const handleToggleEmergency = async () => {
    await updateLegalCaseWorkflow(
      legalCase,
      { emergencyFlag: !legalCase.emergencyFlag },
      user,
      'EMERGENCY_TOGGLED',
      !legalCase.emergencyFlag
        ? 'Citizen requested emergency safety escalation.'
        : 'Emergency escalation cleared.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white dark:bg-[#0D1B16] h-full overflow-y-auto border-l border-emerald-200/70 dark:border-emerald-900/60 shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0D1B16]/95 backdrop-blur-xs px-6 py-4 border-b border-emerald-200/70 dark:border-emerald-900/60 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
              <span className="font-semibold text-[#059669] dark:text-emerald-400">{legalCase.caseNumber}</span>
              <span>·</span>
              <span>{legalCase.district}</span>
              <span>·</span>
              <span>{CHANNEL_LABELS[legalCase.channel][lang]}</span>
            </div>
            <h2 className="font-sans text-lg font-semibold text-[#064E3B] dark:text-white truncate">
              {legalCase.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-emerald-950/60 shrink-0"
            aria-label="Close case details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {feedback && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-[#064E3B] dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#059669]" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Core Metadata Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-emerald-200/70 dark:border-emerald-900/60 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">{t(lang, 'Status', 'অবস্থা')}</span>
              <span className="font-semibold text-[#064E3B] dark:text-white">
                {STATUS_LABELS[legalCase.status][lang]}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">{t(lang, 'Priority', 'অগ্রাধিকার')}</span>
              <span className="font-semibold text-[#064E3B] dark:text-white">
                {PRIORITY_LABELS[legalCase.priority][lang]}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">{t(lang, 'Category', 'বিভাগ')}</span>
              <span className="font-semibold text-[#064E3B] dark:text-white">
                {CATEGORY_LABELS[legalCase.category][lang]}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">{t(lang, 'Next Hearing', 'পরবর্তী শুনানি')}</span>
              <span className="font-mono-tabular font-semibold text-[#064E3B] dark:text-white">
                {legalCase.nextHearingDate || t(lang, 'Pending', 'নির্ধারিত হয়নি')}
              </span>
            </div>
          </div>

          {/* Original Preserved Citizen Statement */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t(lang, 'Original Preserved Citizen Statement', 'আবেদনকারীর সংরক্ষিত মূল বক্তব্য')}
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              {legalCase.description}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span>
                {t(lang, 'Applicant:', 'আবেদনকারী:')} <strong className="text-slate-800 dark:text-slate-200">{legalCase.citizenName}</strong> ·{' '}
                {legalCase.upazila}, {legalCase.district}
              </span>
              <span>
                {t(lang, 'Safe Contact:', 'নিরাপদ যোগাযোগ:')} {legalCase.safeContactNote || 'Standard'}
              </span>
            </div>
            {legalCase.assignedLawyerName && (
              <div className="flex items-center gap-2 text-xs text-[#059669] dark:text-emerald-400 font-medium">
                <Scale className="w-3.5 h-3.5" />
                <span>
                  {t(lang, 'Assigned Counsel:', 'নিয়োগকৃত আইনজীবী:')} {legalCase.assignedLawyerName}
                </span>
              </div>
            )}
          </div>

          {/* Explainable AI Case Intelligence */}
          <div className="p-5 rounded-xl bg-emerald-50/50 dark:bg-[#07120E]/70 border border-emerald-200/80 dark:border-emerald-900/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#064E3B] dark:text-white">
                  <Sparkles className="w-4 h-4 text-[#059669]" />
                  <span>{t(lang, 'Explainable AI Case Intelligence (Advisory)', 'ব্যাখ্যাযোগ্য এআই কেস ইন্টেলিজেন্স (পরামর্শমূলক)')}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t(
                    lang,
                    'Evidence-linked findings with confidence & uncertainty. Human officers retain all final decisions.',
                    'প্রমাণ-ভিত্তিক বিশ্লেষণ ও অনিশ্চয়তার নির্দেশক — চূড়ান্ত সিদ্ধান্ত কেবল কর্মকর্তাদের।'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunAI}
                disabled={aiBusy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 text-xs font-medium text-[#064E3B] dark:text-emerald-200 hover:border-[#059669]"
              >
                {aiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" /> : <Sparkles className="w-3.5 h-3.5 text-[#059669]" />}
                {legalCase.aiSummary
                  ? t(lang, 'Refresh Explainable AI Brief', 'এআই বিশ্লেষণ আপডেট করুন')
                  : t(lang, 'Generate Explainable AI Brief', 'এআই দিয়ে কেস ব্রিফ তৈরি করুন')}
              </button>
            </div>

            {legalCase.aiSummary ? (
              <div className="space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[#059669] dark:text-emerald-400">{legalCase.aiClassification}</span>
                  <div className="flex items-center gap-3 font-mono-tabular text-[11px]">
                    {legalCase.aiConfidence && (
                      <span className="text-slate-600 dark:text-slate-300">
                        CONFIDENCE: {legalCase.aiConfidence.toUpperCase()}
                      </span>
                    )}
                    {legalCase.aiReviewStatus && (
                      <span className="font-semibold text-[#064E3B] dark:text-emerald-400">
                        SUPERVISION: {legalCase.aiReviewStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{legalCase.aiSummary}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {legalCase.aiExtractedFacts && legalCase.aiExtractedFacts.length > 0 && (
                    <div className="p-3 rounded-lg bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-1">
                      <div className="font-semibold text-[#064E3B] dark:text-emerald-200">
                        {t(lang, 'Extracted Key Facts', 'শনাক্তকৃত তথ্যসমূহ')}
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">
                        {legalCase.aiExtractedFacts.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {legalCase.aiMissingInfo && legalCase.aiMissingInfo.length > 0 && (
                    <div className="p-3 rounded-lg bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-1">
                      <div className="font-semibold text-amber-800 dark:text-amber-300">
                        {t(lang, 'Missing Information & Gaps', 'অসম্পূর্ণ তথ্য ও ঘাটতি')}
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">
                        {legalCase.aiMissingInfo.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {legalCase.aiCitations && legalCase.aiCitations.length > 0 && (
                  <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <BookOpen className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">{t(lang, 'Grounded Bangladesh Statutes:', 'প্রযোজ্য সরকারি আইন:')} </span>
                      {legalCase.aiCitations.join(' · ')}
                    </div>
                  </div>
                )}

                {legalCase.aiNextSteps && legalCase.aiNextSteps.length > 0 && (
                  <div className="text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-[#064E3B] dark:text-emerald-200">
                      {t(lang, 'Suggested Officer Next Steps:', 'পরামর্শকৃত পরবর্তী ধাপ:')}{' '}
                    </span>
                    {legalCase.aiNextSteps.join(' → ')}
                  </div>
                )}

                {(legalCase.aiUncertaintyNote || legalCase.aiRiskNote) && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      {legalCase.aiRiskNote && <div>{legalCase.aiRiskNote}</div>}
                      {legalCase.aiUncertaintyNote && <div className="mt-0.5">{legalCase.aiUncertaintyNote}</div>}
                    </div>
                  </div>
                )}

                {legalCase.aiOfficerNote && (
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200">
                    <strong>
                      {t(lang, 'Officer Supervision Note', 'কর্মকর্তার চূড়ান্ত পর্যবেক্ষণ')}
                      {legalCase.aiReviewedByName ? ` (${legalCase.aiReviewedByName})` : ''}:
                    </strong>{' '}
                    {legalCase.aiOfficerNote}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(
                  lang,
                  'Run Explainable AI Case Intelligence to extract facts, identify gaps, retrieve verified Bangladesh statutes, and surface uncertainty notes.',
                  'তথ্য বিশ্লেষণ, ঘাটতি শনাক্তকরণ ও যাচাইকৃত আইন উদ্ধৃত করতে এআই বিশ্লেষণ চালান।'
                )}
              </p>
            )}
          </div>

          {/* AI Document Intelligence Subcollection */}
          <div className="p-4 rounded-xl border border-emerald-200/70 dark:border-emerald-900/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#059669]" />
                {t(lang, 'Document Intelligence & Traceable Evidence', 'নথিপত্র ওসিআর ও প্রমাণ-সূত্র')}
              </h3>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-[#07120E]/60 text-xs font-medium text-[#064E3B] dark:text-emerald-200 hover:border-[#059669] cursor-pointer">
                {docBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" /> : <Upload className="w-3.5 h-3.5 text-[#059669]" />}
                <span>{docBusy ? t(lang, 'Extracting...', 'পড়া হচ্ছে...') : t(lang, 'Upload PDF / Image', 'নথি যোগ করুন')}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
                  disabled={docBusy}
                  onChange={handleUploadCaseDocument}
                  className="sr-only"
                />
              </label>
            </div>

            {documents.length > 0 ? (
              <div className="space-y-2.5">
                {documents.map((docItem) => (
                  <div
                    key={docItem.docId}
                    className="p-3.5 rounded-lg bg-emerald-50/40 dark:bg-[#07120E]/60 border border-emerald-200/70 dark:border-emerald-900/60 text-xs space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[#064E3B] dark:text-white">
                        {docItem.fileName} · {docItem.detectedType}
                      </span>
                      <span className="font-mono-tabular text-[11px] text-[#059669] dark:text-emerald-400">
                        Legibility: {docItem.legibilityConfidence}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{docItem.summary}</p>
                    {docItem.traceableFacts.length > 0 && (
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                        {docItem.traceableFacts.map((fact, idx) => (
                          <li key={idx}>{fact}</li>
                        ))}
                      </ul>
                    )}
                    {docItem.missingFields.length > 0 && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-400">
                        {t(lang, 'Missing / Unclear:', 'ঘাটতি / অস্পষ্ট:')} {docItem.missingFields.join(' · ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 text-xs">
                {(legalCase.submittedDocs || []).map((docName) => (
                  <span
                    key={docName}
                    className="inline-flex items-center gap-1 text-[#047857] dark:text-emerald-400"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {docName}
                  </span>
                ))}
                {(!legalCase.submittedDocs || legalCase.submittedDocs.length === 0) && (
                  <span className="text-slate-400">
                    {t(lang, 'Upload a PDF or image above for automated Bangla/English OCR extraction.', 'ওসিআর বিশ্লেষণের জন্য উপরে PDF বা ছবি আপলোড করুন।')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Human-Supervised AI Review (Officers / Admins Only) */}
          {isOfficerOrAdmin && (
            <div className="p-4 rounded-xl border border-emerald-200/70 dark:border-emerald-900/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#064E3B] dark:text-emerald-300">
                <UserCheck className="w-4 h-4 text-[#059669]" />
                <span>{t(lang, 'Human-Supervised AI Review & Correction', 'কর্মকর্তা কর্তৃক এআই পর্যালোচনা ও সংশোধন')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as AIReviewStatus)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="approved">{t(lang, 'Approve AI Assessment', 'এআই মূল্যায়ন অনুমোদন')}</option>
                  <option value="corrected">{t(lang, 'Correct AI Summary / Facts', 'সংশোধনসহ অনুমোদন')}</option>
                  <option value="overridden">{t(lang, 'Override AI Recommendation', 'এআই পরামর্শ পরিবর্তন')}</option>
                </select>
                <input
                  type="text"
                  value={editedClassification}
                  onChange={(e) => setEditedClassification(e.target.value)}
                  placeholder={t(lang, 'Verified legal classification...', 'যাচাইকৃত আইনি শ্রেণিবিন্যাস...')}
                  className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <textarea
                rows={2}
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                placeholder={t(lang, 'Review or refine the structured case brief...', 'কেস ব্রিফ পর্যালোচনা বা সংশোধন করুন...')}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={officerReviewNote}
                  onChange={(e) => setOfficerReviewNote(e.target.value)}
                  placeholder={t(lang, 'Officer rationale / supervision audit note...', 'কর্মকর্তার চূড়ান্ত মন্তব্য...')}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSubmitOfficerAiReview}
                  className="px-4 py-2 rounded-lg bg-[#059669] text-white text-xs font-medium hover:bg-[#047857] whitespace-nowrap"
                >
                  {t(lang, 'Save Officer Review', 'পর্যালোচনা সংরক্ষণ করুন')}
                </button>
              </div>
            </div>
          )}

          {/* Citizen Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleToggleEmergency}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                legalCase.emergencyFlag
                  ? 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {legalCase.emergencyFlag
                ? t(lang, 'Emergency Support Flagged', 'জরুরি সহায়তা চিহ্নিত')
                : t(lang, 'Request Emergency Escalation', 'জরুরি সহায়তা অনুরোধ')}
            </button>
          </div>

          {/* DLAO / Officer Management Controls */}
          {isOfficerOrAdmin && (
            <div className="p-4 rounded-xl border border-emerald-200/70 dark:border-emerald-900/60 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t(lang, 'DLAO Eligibility & Assignment Decisions', 'ডিএলএও যোগ্যতা যাচাই ও নিয়োগ সিদ্ধান্ত')}
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleApproveAndVerify}
                  className="px-3.5 py-2 rounded-lg bg-[#059669] text-white text-xs font-medium hover:bg-[#047857] transition-colors"
                >
                  {t(lang, 'Verify Eligibility & Approve', 'যোগ্যতা যাচাই ও অনুমোদন')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/70 dark:border-emerald-900/60">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedLawyerUid}
                    onChange={(e) => setSelectedLawyerUid(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  >
                    {PANEL_LAWYERS.map((l) => (
                      <option key={l.uid} value={l.uid}>
                        {l.name} ({l.district})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleAssignLawyer}
                    className="px-3 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium whitespace-nowrap"
                  >
                    {t(lang, 'Assign Lawyer', 'আইনজীবী নিয়োগ')}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedMediatorUid}
                    onChange={(e) => setSelectedMediatorUid(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  >
                    {MEDIATORS_ROSTER.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleScheduleMediation}
                    className="px-3 py-2 rounded-lg bg-amber-700 text-white text-xs font-medium whitespace-nowrap"
                  >
                    {t(lang, 'Send to Mediation', 'মধ্যস্থতায় পাঠান')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <select
                  value={referralDistrict}
                  onChange={(e) => setReferralDistrict(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  {BANGLADESH_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                  placeholder={t(lang, 'Inter-district transfer reason...', 'স্থানান্তরের কারণ লিখুন...')}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleCreateReferral}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  {t(lang, 'Transfer District', 'জেলা স্থানান্তর')}
                </button>
              </div>
            </div>
          )}

          {/* Hearing & Lawyer Progress Update */}
          {(isOfficerOrAdmin || isLawyerOrAdmin) && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{t(lang, 'Hearing Schedule & Progress Report', 'শুনানির তারিখ ও অগ্রগতি প্রতিবেদন')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="date"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono-tabular"
                />
                <input
                  type="text"
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  placeholder={t(lang, 'Court order / progress summary...', 'আদালতের আদেশ বা অগ্রগতি নোট...')}
                  className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleUpdateHearingOrProgress()}
                  className="px-3.5 py-2 rounded-lg bg-[#059669] text-white text-xs font-medium hover:bg-[#047857]"
                >
                  {t(lang, 'Save Progress Report', 'অগ্রগতি সংরক্ষণ করুন')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleUpdateHearingOrProgress('court_proceeding')}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t(lang, 'Move to Court Proceeding', 'আদালতে বিচারাধীন')}
                </button>
              </div>
            </div>
          )}

          {/* Two-column Timeline & Real-Time Messages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-emerald-200/70 dark:border-emerald-900/60">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                {t(lang, 'Real-Time Activity Timeline', 'রিয়েল-টাইম কার্যক্রমের ধারাক্রম')}
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {timeline.map((ev) => (
                  <div key={ev.eventId} className="pb-2.5 border-b border-emerald-200/50 dark:border-emerald-900/50 text-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{ev.actorName}</span>
                      <span className="font-mono-tabular">{ev.actionType}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{ev.note}</p>
                  </div>
                ))}
                {timeline.length === 0 && (
                  <p className="text-xs text-slate-400">{t(lang, 'Loading timeline events...', 'তথ্য লোড হচ্ছে...')}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                {t(lang, 'Client & Counsel Updates', 'নাগরিক ও আইনজীবী বার্তা')}
              </h3>
              <div className="flex-1 space-y-2.5 max-h-48 overflow-y-auto mb-3 pr-1">
                {messages.map((msg) => (
                  <div
                    key={msg.messageId}
                    className={`p-2.5 rounded-lg text-xs ${
                      msg.senderUid === user.uid
                        ? 'bg-[#059669] text-white ml-6'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 text-slate-800 dark:text-slate-200 mr-6'
                    }`}
                  >
                    <div className="font-semibold opacity-80 mb-0.5">{msg.senderName}</div>
                    <p>{msg.text}</p>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-xs text-slate-400">
                    {t(lang, 'Send a secure real-time update to start the thread.', 'বার্তা আদান-প্রদান শুরু করতে নিচে লিখুন।')}
                  </p>
                )}
              </div>
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={1000}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t(lang, 'Write a case update...', 'মামলার আপডেট লিখুন...')}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <button
                  type="submit"
                  className="p-2 rounded-lg bg-[#059669] text-white hover:bg-[#047857]"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
