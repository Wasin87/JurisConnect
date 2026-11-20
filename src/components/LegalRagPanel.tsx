import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Scale,
} from 'lucide-react';
import { CATEGORY_LABELS, t } from '../i18n';
import type { LanguageCode, LegalCategory, RagQueryResult } from '../types';
import { queryBangladeshLegalRag } from '../services/legalBdService';

interface LegalRagPanelProps {
  lang: LanguageCode;
}

const SAMPLE_QUESTIONS = {
  bn: [
    'স্বামী ৮ মাস ধরে ভরণপোষণ ও সন্তানের খরচ না দিলে কোন আইনে প্রতিকার পাব?',
    'বিনামূল্যে সরকারি আইনি সহায়তা (লিগ্যাল এইড) পাওয়ার যোগ্যতা কী?',
    'গার্মেন্টস কারখানায় ৪ মাসের বকেয়া মজুরি আদায়ের আইনি উপায় কী?',
    'জোরপূর্বক জমি বা ভিটা থেকে উচ্ছেদ করলে কত দিনের মধ্যে প্রতিকার চাওয়া যায়?',
  ],
  en: [
    'What statutory remedies exist in Bangladesh when a husband stops paying maintenance?',
    'Who qualifies for free legal aid under the Legal Aid Services Act, 2000?',
    'How can a factory worker recover unpaid wages and severance under the Labour Act?',
    'How does DLAO pre-case mediation under Section 21A work?',
  ],
};

export const LegalRagPanel: React.FC<LegalRagPanelProps> = ({ lang }) => {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<'ALL' | LegalCategory>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RagQueryResult | null>(null);

  const runQuery = async (targetQuestion: string) => {
    const trimmed = targetQuestion.trim();
    if (trimmed.length < 3) {
      setError(
        t(
          lang,
          'Please enter a clear legal question (at least 3 characters).',
          'অনুগ্রহ করে অন্তত ৩ অক্ষরের একটি প্রশ্ন লিখুন।'
        )
      );
      return;
    }
    setQuestion(trimmed);
    setLoading(true);
    setError(null);
    try {
      const res = await queryBangladeshLegalRag({
        question: trimmed,
        category: category === 'ALL' ? undefined : category,
        language: lang,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to query legal knowledge base.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runQuery(question);
  };

  return (
    <div className="space-y-6">
      {/* Header & Search Console */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-100 dark:border-emerald-900/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#059669] dark:text-[#6EE7B7]">
              <BookOpen className="w-4 h-4" />
              <span>BANGLADESH STATUTORY RAG · GROUNDED KNOWLEDGE BASE</span>
            </div>
            <h2 className="font-sans text-xl font-semibold text-slate-900 dark:text-white mt-1">
              {t(
                lang,
                'Verified Bangladesh Legal Knowledge Retrieval (RAG)',
                'বাংলাদেশ যাচাইকৃত আইন ও বিধি অনুসন্ধান (RAG)'
              )}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {t(
                lang,
                'Answers are grounded strictly in verified Bangladesh Acts and NLASO policies—never fabricated statutes or case citations.',
                'উত্তরসমূহ কেবল বাংলাদেশের যাচাইকৃত আইন ও এনএলএএসও নীতিমালা থেকে উদ্ধৃত—কোনো কাল্পনিক ধারা বা রায় তৈরি করা হয় না।'
              )}
            </p>
          </div>
          <div className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#065F46] dark:text-[#A7F3D0]">
              <ShieldCheck className="w-4 h-4 text-[#059669] dark:text-[#34D399]" />
              {t(lang, 'Advisory Reference Only', 'কেবল তথ্যগত নির্দেশিকা')}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t(
                  lang,
                  'Ask in Bangla or English about maintenance, legal aid eligibility, wages, land possession, or protection...',
                  'ভরণপোষণ, আইনি সহায়তার যোগ্যতা, বকেয়া মজুরি বা সুরক্ষা আদেশ সম্পর্কে বাংলা বা ইংরেজিতে প্রশ্ন লিখুন...'
                )}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-emerald-900/60 bg-slate-50 dark:bg-[#07120E] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as 'ALL' | LegalCategory)}
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">{t(lang, 'All Statutory Domains', 'সকল আইনি বিষয়')}</option>
              {(Object.keys(CATEGORY_LABELS) as LegalCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat][lang]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
              {loading ? t(lang, 'Retrieving...', 'অনুসন্ধান চলছে...') : t(lang, 'Query Statutes', 'আইন যাচাই করুন')}
            </button>
          </div>

          {/* Sample Questions */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {t(lang, 'Sample queries:', 'নমুনা প্রশ্ন:')}
            </span>
            {SAMPLE_QUESTIONS[lang].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => runQuery(q)}
                className="text-left px-2.5 py-1 rounded-md border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-[#07120E] text-slate-700 dark:text-slate-300 hover:border-[#059669] hover:text-[#059669] dark:hover:text-[#6EE7B7] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </form>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* RAG Output */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-5">
            {result.insufficientEvidence && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {t(
                    lang,
                    'Corpus Notice: Reliable statutory coverage for parts of this query may be limited in the verified corpus. Consult a District Legal Aid Officer for case-specific interpretation.',
                    'সতর্কতা: আপনার প্রশ্নের কিছু অংশ বর্তমান যাচাইকৃত আইন ভাণ্ডারে সীমিত। সুনির্দিষ্ট পরামর্শের জন্য অনুগ্রহ করে জেলা লিগ্যাল এইড অফিসারের সাথে যোগাযোগ করুন।'
                  )}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                <span>{t(lang, 'GROUNDED LEGAL SYNTHESIS', 'যাচাইকৃত আইনি বিশ্লেষণ')}</span>
                <span>MODE: {result.retrievalMethod.toUpperCase()}</span>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {result.answer}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 space-y-1.5">
              <div className="text-xs font-semibold text-[#065F46] dark:text-[#6EE7B7]">
                {t(lang, 'Verified Statutory Provisions', 'যাচাইকৃত আইনি বিধান')}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {result.verifiedProvisionsSummary}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#07120E] border border-slate-200 dark:border-emerald-900/50 space-y-1.5">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t(
                  lang,
                  'General Procedural Guidance (Non-Binding AI Explanation)',
                  'সাধারণ পদ্ধতিগত ব্যাখ্যা (বাধ্যতামূলক আইনি পরামর্শ নয়)'
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {result.generalProceduralNote}
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
              {t(lang, 'Retrieved Statutory Sources & Excerpts', 'উদ্ধৃত সরকারি আইন ও ধারাসমূহ')}
            </div>
            {result.groundedCitations.map((cit) => (
              <div
                key={cit.sourceId}
                className="p-5 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-[#059669] dark:text-[#6EE7B7]">
                      {lang === 'bn' ? cit.actNameBn : cit.actNameEn}
                    </div>
                    <div className="text-xs font-medium text-slate-900 dark:text-white mt-0.5">
                      {cit.section}
                    </div>
                  </div>
                  <span className="font-mono-tabular text-[11px] text-slate-500 shrink-0">
                    {Math.round(cit.relevanceScore * 100) / 100}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {cit.excerpt}
                </p>
                <a
                  href={cit.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#059669] dark:text-[#6EE7B7] hover:underline"
                >
                  <span>{t(lang, 'Official Source Reference', 'মূল সরকারি সূত্র')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
