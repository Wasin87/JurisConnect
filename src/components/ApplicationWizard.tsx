import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  X,
  FileCheck2,
  ArrowRight,
  Loader2,
  Upload,
  FileText,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import {
  BANGLADESH_DISTRICTS,
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  DISTRICT_UPAZILAS,
  STANDARD_DOCUMENTS,
  t,
} from '../i18n';
import type {
  AIAnalysisResult,
  CasePriority,
  IntakeChannel,
  LanguageCode,
  LegalCategory,
  UserPublic,
} from '../types';
import {
  analyzeCaseWithAI,
  analyzeDocumentWithAI,
  createLegalCase,
  type StagedDocumentUpload,
} from '../services/legalBdService';
import { fireCelebrationConfetti } from '../utils/confetti';

interface ApplicationWizardProps {
  open: boolean;
  lang: LanguageCode;
  user: UserPublic | null;
  lowBandwidth: boolean;
  initialChannel?: IntakeChannel;
  onClose: () => void;
  onRequireAuth: () => void;
  onCreated: (caseId: string, caseNumber: string) => void;
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

export const ApplicationWizard: React.FC<ApplicationWizardProps> = ({
  open,
  lang,
  user,
  lowBandwidth,
  initialChannel = 'web',
  onClose,
  onRequireAuth,
  onCreated,
}) => {
  const [channel, setChannel] = useState<IntakeChannel>(initialChannel);
  const [citizenName, setCitizenName] = useState(user?.displayName || '');
  const [district, setDistrict] = useState(user?.district || 'Dhaka');
  const [upazila, setUpazila] = useState(DISTRICT_UPAZILAS['Dhaka'][0]);
  const [category, setCategory] = useState<LegalCategory>('family_maintenance');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [safeContactNote, setSafeContactNote] = useState('');
  const [emergencyFlag, setEmergencyFlag] = useState(false);
  const [consentGiven, setConsentGiven] = useState(true);
  const [submittedDocs, setSubmittedDocs] = useState<string[]>([STANDARD_DOCUMENTS[0]]);

  const [stagedDocs, setStagedDocs] = useState<StagedDocumentUpload[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdCaseNumber, setCreatedCaseNumber] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setChannel(initialChannel);
      if (user?.displayName && !citizenName) {
        setCitizenName(user.displayName);
      }
      if (user?.district) {
        setDistrict(user.district);
        const list = DISTRICT_UPAZILAS[user.district] || [`${user.district} Sadar`];
        setUpazila(list[0]);
      }
      setCreatedCaseNumber(null);
      setSubmitError(null);
    }
  }, [open, initialChannel, user]);

  if (!open) return null;

  const upazilas = DISTRICT_UPAZILAS[district] || [`${district} Sadar`];

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    const list = DISTRICT_UPAZILAS[newDistrict] || [`${newDistrict} Sadar`];
    setUpazila(list[0]);
  };

  const toggleDoc = (docName: string) => {
    setSubmittedDocs((prev) =>
      prev.includes(docName) ? prev.filter((d) => d !== docName) : [...prev, docName]
    );
  };

  const handleLoadFictionalDemo = () => {
    setChannel('udc_assisted');
    setCitizenName('রহিমা খাতুন (Fictional Demo)');
    setDistrict('Dhaka');
    setUpazila('Savar');
    setCategory('family_maintenance');
    setTitle('বকেয়া ভরণপোষণ ও দুই সন্তানের খোরপোশের জন্য আইনি সহায়তা (Fictional Demo)');
    setDescription(
      'আমি রহিমা খাতুন, সাভার উপজেলার বিরুলিয়া ইউনিয়নের বাসিন্দা। আমার স্বামী করিম মিয়া গত ৮ মাস ধরে আমাকে ও আমার দুই স্কুলপড়ুয়া সন্তানকে কোনো ভরণপোষণ বা খোরপোশ দিচ্ছেন না। আমাদের বিবাহ ২০২৮ সালে ৩ লক্ষ টাকা দেনমোহরে নিবন্ধিত হয়। আমি বর্তমানে সেলাইয়ের কাজ করে কোনোমতে সংসার চালাই এবং অর্থের অভাবে আদালতে মামলা করতে পারছি না। আমার ইউনিয়ন পরিষদের আয় সনদ ও কাবিননামার কপি আছে।'
    );
    setSafeContactNote('সকাল ১০টা থেকে বিকাল ৩টার মধ্যে ফোন করা নিরাপদ');
    setSubmittedDocs([
      'National ID (NID) / Birth Certificate',
      'Union Parishad / Ward Income Certificate',
      'Witness or Marriage / Kabinnama Copy',
    ]);
    setAiResult(null);
    setAiError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setDocError(null);
    if (file.size > 7 * 1024 * 1024) {
      setDocError(
        t(
          lang,
          'File exceeds 7 MB size limit. Please choose a smaller PDF or image.',
          'ফাইলের আকার ৭ মেগাবাইটের বেশি। অনুগ্রহ করে ছোট ফাইল আপলোড করুন।'
        )
      );
      return;
    }

    const mimeType = file.type || (file.name.endsWith('.txt') ? 'text/plain' : 'image/jpeg');
    setDocLoading(true);
    try {
      const base64Data = await fileToBase64(file);
      const analysis = await analyzeDocumentWithAI({
        fileName: file.name,
        mimeType,
        base64Data,
        language: lang,
      });
      setStagedDocs((prev) => [
        ...prev.slice(0, 4),
        {
          fileName: file.name,
          mimeType,
          fileSizeBytes: file.size,
          analysis,
        },
      ]);
      if (analysis.detectedType && !submittedDocs.includes(analysis.detectedType)) {
        setSubmittedDocs((prev) => [...prev.slice(0, 9), analysis.detectedType]);
      }
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Unable to process document.');
    } finally {
      setDocLoading(false);
    }
  };

  const handleRunAI = async () => {
    setAiError(null);
    if (description.trim().length < 10) {
      setAiError(
        t(
          lang,
          'Please write at least 10 characters in the complaint narrative for AI analysis.',
          'এআই বিশ্লেষণের জন্য অভিযোগের বিবরণে কমপক্ষে ১০টি অক্ষর লিখুন।'
        )
      );
      return;
    }
    setAiLoading(true);
    try {
      const result = await analyzeCaseWithAI({
        title: title.trim() || CATEGORY_LABELS[category].en,
        description: description.trim(),
        category,
        district,
        submittedDocs,
        documentSummaries: stagedDocs.map(
          (d) =>
            `${d.fileName} (${d.analysis.detectedType}): ${d.analysis.summary} Facts: ${d.analysis.traceableFindings
              .map((f) => `[${f.sourceLocation}] ${f.fact}`)
              .join('; ')}`
        ),
        language: lang,
      });
      setAiResult(result);
      if (result.detectedCategory && result.detectedCategory in CATEGORY_LABELS) {
        setCategory(result.detectedCategory);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to run AI analysis.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!consentGiven) {
      setSubmitError(
        t(
          lang,
          'Informed consent is required to register your legal aid record.',
          'আবেদন নিবন্ধনের জন্য আপনার সম্মতি প্রয়োজন।'
        )
      );
      return;
    }
    if (title.trim().length < 3 || description.trim().length < 5) {
      setSubmitError(
        t(
          lang,
          'Please enter a clear case title and narrative.',
          'অনুগ্রহ করে মামলার শিরোনাম ও বিবরণ লিখুন।'
        )
      );
      return;
    }

    setSubmitting(true);
    try {
      const priority: CasePriority = emergencyFlag
        ? 'critical'
        : aiResult?.recommendedPriority || 'medium';

      const requiredDocs = Array.from(
        new Set([
          STANDARD_DOCUMENTS[0],
          STANDARD_DOCUMENTS[1],
          ...(aiResult?.missingDocuments?.slice(0, 3) || []),
        ])
      ).slice(0, 10);

      const { caseId, caseNumber } = await createLegalCase(
        {
          citizenName: citizenName.trim() || user.displayName,
          safeContactNote: safeContactNote.trim() || 'Standard daytime contact',
          consentGiven,
          channel,
          district,
          upazila,
          category,
          title: title.trim(),
          description: description.trim(),
          priority,
          emergencyFlag,
          submittedDocs,
          requiredDocs,
          aiClassification: aiResult?.classification,
          aiSummary: aiResult?.summary,
          aiRiskNote: aiResult?.riskNote,
          aiConfidence: aiResult?.confidenceLevel,
          aiUncertaintyNote: aiResult?.uncertaintyNote,
          aiExtractedFacts: aiResult?.extractedFacts,
          aiMissingInfo: aiResult?.missingInfo,
          aiFollowUpQuestions: aiResult?.followUpQuestions,
          aiCitations: aiResult?.citations,
          aiNextSteps: aiResult?.suggestedNextSteps,
          stagedDocuments: stagedDocs,
        },
        user
      );

      setCreatedCaseNumber(caseNumber);
      fireCelebrationConfetti(lowBandwidth);
      onCreated(caseId, caseNumber);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 rounded-2xl shadow-xl my-8 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-emerald-200/70 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-[#07120E]/60">
          <div>
            <h2 className="font-sans text-xl font-semibold text-[#064E3B] dark:text-white">
              {t(lang, 'Unified Legal Aid Application & AI Intake', 'সমন্বিত আইনি সহায়তা আবেদন ও এআই বিশ্লেষণ')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                lang,
                'Bangla-First AI Understanding · Traceable Document OCR · Human Officer Supervision',
                'বাংলা-সমৃদ্ধ এআই বিশ্লেষণ · নথি ওসিআর · অনুমোদিত কর্মকর্তার চূড়ান্ত সিদ্ধান্ত'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!createdCaseNumber && (
              <button
                type="button"
                onClick={handleLoadFictionalDemo}
                className="px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-medium text-[#047857] dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
              >
                {t(lang, 'Load Fictional Demo (বাংলা)', 'নমুনা বাংলা আবেদন লোড করুন (কাল্পনিক)')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close application form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[82vh] overflow-y-auto">
          {createdCaseNumber ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#059669] dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-sans text-2xl font-semibold text-[#064E3B] dark:text-white">
                {t(lang, 'Application & Evidence Synced to JurisConnect', 'আবেদন ও নথিপত্র সফলভাবে নিবন্ধিত হয়েছে')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                {t(
                  lang,
                  'Your original statement, AI-assisted brief, and uploaded document evidence are now live for District Legal Aid Officer review.',
                  'আপনার মূল বক্তব্য, এআই সারসংক্ষেপ ও সংযুক্ত নথিপত্র জেলা লিগ্যাল এইড অফিসারের পর্যালোচনার জন্য সংরক্ষিত হয়েছে।'
                )}
              </p>
              <div className="inline-block px-5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 font-mono-tabular text-lg font-semibold text-[#064E3B] dark:text-emerald-300">
                {createdCaseNumber}
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setCreatedCaseNumber(null);
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-lg bg-[#059669] text-white text-sm font-medium hover:bg-[#047857] transition-colors"
                >
                  {t(lang, 'View in Portal', 'পোর্টালে দেখুন')}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {t(lang, 'Intake Channel', 'আবেদনের মাধ্যম')}
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as IntakeChannel)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  >
                    {(Object.keys(CHANNEL_LABELS) as IntakeChannel[]).map((ch) => (
                      <option key={ch} value={ch}>
                        {CHANNEL_LABELS[ch][lang]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {t(lang, 'Applicant Full Name', 'আবেদনকারীর পূর্ণ নাম')}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    placeholder={t(lang, 'e.g., Rahima Khatun', 'যেমন: রহিমা খাতুন')}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {t(lang, 'District (DLAO)', 'জেলা (ডিএলএও)')}
                  </label>
                  <select
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  >
                    {BANGLADESH_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {t(lang, 'Upazila / Thana', 'উপজেলা / থানা')}
                  </label>
                  <select
                    value={upazila}
                    onChange={(e) => setUpazila(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  >
                    {upazilas.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {t(lang, 'Legal Category', 'আইনি বিভাগ')}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as LegalCategory)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  >
                    {(Object.keys(CATEGORY_LABELS) as LegalCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat][lang]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t(lang, 'Case Subject / Title', 'মামলার বিষয় / শিরোনাম')}
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t(
                    lang,
                    'e.g., Request for unpaid spousal and child maintenance support',
                    'যেমন: বকেয়া ভরণপোষণ ও আইনি সহায়তার আবেদন'
                  )}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t(
                      lang,
                      'Citizen Narrative (Natural Bangla or English — Preserved Verbatim)',
                      'আপনার অভিযোগের মূল বিবরণ (স্বাভাবিক বাংলা বা ইংরেজিতে লিখুন — অবিকৃতভাবে সংরক্ষিত থাকবে)'
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={handleRunAI}
                    disabled={aiLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-[#047857] dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {t(lang, 'Run Bangla-First AI Analysis', 'এআই দিয়ে বিবরণ ও নথি বিশ্লেষণ করুন')}
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  maxLength={2500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t(
                    lang,
                    'Explain what happened in natural Bangla or English, including names, dates, location, and relief sought...',
                    'কী ঘটেছে তা স্বাভাবিক বাংলায় লিখুন—তারিখ, স্থান, সংশ্লিষ্ট ব্যক্তির নাম এবং আপনি কী প্রতিকার চান তা উল্লেখ করুন...'
                  )}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>

              {/* Real AI Document Upload & OCR Extraction */}
              <div className="p-4 rounded-xl bg-emerald-50/40 dark:bg-[#07120E]/60 border border-emerald-200/70 dark:border-emerald-900/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#064E3B] dark:text-white">
                      <FileText className="w-4 h-4 text-[#059669]" />
                      <span>
                        {t(
                          lang,
                          'Supporting Document Upload & AI Document Intelligence (OCR)',
                          'সহায়ক নথিপত্র আপলোড ও এআই ওসিআর বিশ্লেষণ'
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {t(
                        lang,
                        'Upload PDF, JPG, PNG, or TXT (max 7 MB). Facts are extracted with source section traceability.',
                        'PDF, JPG, PNG বা TXT আপলোড করুন (সর্বোচ্চ ৭ মেগাবাইট)। তথ্য উৎস-নির্দেশনাসহ বের করা হবে।'
                      )}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 text-xs font-medium text-[#064E3B] dark:text-emerald-200 hover:border-[#059669] cursor-pointer transition-colors">
                    {docLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" /> : <Upload className="w-3.5 h-3.5 text-[#059669]" />}
                    <span>
                      {docLoading
                        ? t(lang, 'Extracting OCR...', 'নথি পড়া হচ্ছে...')
                        : t(lang, 'Upload & Extract Document', 'নথি আপলোড করুন')}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
                      disabled={docLoading}
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                {docError && <p className="text-xs text-red-600 dark:text-red-400">{docError}</p>}

                {stagedDocs.length > 0 && (
                  <div className="space-y-2.5 pt-1">
                    {stagedDocs.map((docItem, idx) => (
                      <div
                        key={`${docItem.fileName}-${idx}`}
                        className="p-3.5 rounded-lg bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#064E3B] dark:text-white">
                            {docItem.fileName} · {docItem.analysis.detectedType}
                          </span>
                          <span className="font-mono-tabular text-[11px] text-[#059669] dark:text-emerald-400">
                            Legibility: {docItem.analysis.legibilityConfidence}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{docItem.analysis.summary}</p>
                        {docItem.analysis.traceableFindings.length > 0 && (
                          <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                            {docItem.analysis.traceableFindings.slice(0, 5).map((f, fIdx) => (
                              <li key={fIdx}>
                                <span className="font-mono-tabular font-semibold text-[#064E3B] dark:text-emerald-200">
                                  [{f.sourceLocation}]
                                </span>{' '}
                                {f.fact}
                              </li>
                            ))}
                          </ul>
                        )}
                        {docItem.analysis.missingOrUnclearFields.length > 0 && (
                          <div className="text-[11px] text-amber-700 dark:text-amber-400">
                            {t(lang, 'Unclear / Missing:', 'অস্পষ্ট বা ঘাটতি:')} {docItem.analysis.missingOrUnclearFields.join(' · ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {aiError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{aiError}</span>
                </div>
              )}

              {aiResult && (
                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-[#07120E]/70 border border-emerald-200 dark:border-emerald-900/60 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#064E3B] dark:text-emerald-300">
                      {aiResult.classification}
                    </span>
                    <span className="font-mono-tabular text-[#059669] dark:text-emerald-400">
                      Priority: {aiResult.recommendedPriority.toUpperCase()} · Confidence: {aiResult.confidenceLevel.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {aiResult.summary}
                  </p>

                  {aiResult.extractedFacts.length > 0 && (
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-[#064E3B] dark:text-emerald-200">
                        {t(lang, 'Extracted Case Facts:', 'শনাক্তকৃত মূল তথ্য:')}
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">
                        {aiResult.extractedFacts.map((fact, idx) => (
                          <li key={idx}>{fact}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiResult.followUpQuestions.length > 0 && (
                    <div className="p-3 rounded-lg bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-[#059669] dark:text-emerald-400">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{t(lang, 'AI Follow-up Questions (Clarify Missing Details)', 'অতিরিক্ত তথ্য যাচাইয়ের প্রশ্ন')}</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">
                        {aiResult.followUpQuestions.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiResult.citations.length > 0 && (
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-[#064E3B] dark:text-emerald-200">
                        <BookOpen className="w-3.5 h-3.5 text-[#059669]" />
                        <span>{t(lang, 'Grounded Statutory References:', 'প্রযোজ্য সরকারি আইনসমূহ:')}</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">{aiResult.citations.join(' · ')}</div>
                    </div>
                  )}

                  <div className="text-[11px] text-amber-800 dark:text-amber-300 border-t border-emerald-200/70 dark:border-emerald-900/60 pt-2">
                    <strong>{t(lang, 'Uncertainty & Advisory Notice:', 'সীমাবদ্ধতা ও পরামর্শ:')}</strong> {aiResult.uncertaintyNote}{' '}
                    {aiResult.advisoryNotice}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>{t(lang, 'Supporting Documents Checklist', 'সংযুক্ত নথিপত্রের তালিকা')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STANDARD_DOCUMENTS.map((docItem) => {
                    const checked = submittedDocs.includes(docItem);
                    return (
                      <label
                        key={docItem}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'border-[#059669] bg-emerald-50/70 dark:bg-emerald-950/30 text-slate-900 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDoc(docItem)}
                          className="rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
                        />
                        <span className="truncate">{docItem}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {t(lang, 'Safe Contact Window / Privacy Preference', 'নিরাপদ যোগাযোগের সময় ও নির্দেশনা')}
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={safeContactNote}
                    onChange={(e) => setSafeContactNote(e.target.value)}
                    placeholder={t(
                      lang,
                      'e.g., Call only between 10 AM – 2 PM',
                      'যেমন: শুধু সকাল ১০টা – দুপুর ২টার মধ্যে কল করুন'
                    )}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <label className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emergencyFlag}
                      onChange={(e) => setEmergencyFlag(e.target.checked)}
                      className="rounded border-red-300 text-red-600 focus:ring-red-600"
                    />
                    <span>
                      {t(lang, 'Urgent Safety / Protection Risk', 'জরুরি নিরাপত্তা ঝুঁকি / সুরক্ষা প্রয়োজন')}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentGiven}
                        onChange={(e) => setConsentGiven(e.target.checked)}
                        className="rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
                      />
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                      {t(
                        lang,
                        'I give informed consent for JurisConnect & DLAO review',
                        'JurisConnect ও ডিএলএও যাচাইয়ের জন্য আমি অবহিত সম্মতি প্রদান করছি'
                      )}
                    </span>
                  </label>
                </div>
              </div>

              {submitError && (
                <p className="text-xs text-red-600 dark:text-red-400">{submitError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-emerald-200/70 dark:border-emerald-900/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t(lang, 'Cancel', 'বাতিল')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#059669] text-white text-sm font-medium hover:bg-[#047857] disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {submitting
                    ? t(lang, 'Syncing to Firestore...', 'সংরক্ষণ হচ্ছে...')
                    : user
                    ? t(lang, 'Submit & Generate Case ID', 'জমা দিন ও কেস আইডি নিন')
                    : t(lang, 'Sign In with Google to Submit', 'গুগল দিয়ে সাইন ইন করে জমা দিন')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
