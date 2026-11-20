import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  PhoneCall,
  Search,
  ArrowRight,
  Scale,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Languages,
  CheckCircle2,
  Globe,
  Building2,
  ArrowUpRight,
  BookOpen,
  Menu,
  X,
  FileSearch,
  Hash,
} from 'lucide-react';
import { CATEGORY_LABELS, CHANNEL_LABELS, STATUS_LABELS, t } from '../i18n';
import type { CasePublicStatus, CaseStatus, IntakeChannel, LanguageCode, UserPublic } from '../types';
import { lookupPublicCaseStatus } from '../services/legalBdService';
import {
  JurisConnectCrest,
  BangladeshJusticeSeal,
  DlaoSeal,
  UdcAccessSeal,
} from './BrandEmblems';
import { FeaturePhoneShowcase } from './FeaturePhoneShowcase';
import { InstitutionalSupportSection } from './InstitutionalSupportSection';

interface LandingViewProps {
  lang: LanguageCode;
  dark: boolean;
  lowBandwidth: boolean;
  highContrast: boolean;
  user: UserPublic | null;
  onToggleLang: () => void;
  onToggleDark: () => void;
  onToggleLowBandwidth: () => void;
  onToggleHighContrast: () => void;
  onOpenApply: (channel?: IntakeChannel) => void;
  onOpenUssdModal: (mode: 'ussd' | 'helpline') => void;
  onSignIn: (opts?: { mode?: 'signin' | 'signup'; role?: Exclude<UserPublic['role'], 'admin'>; targetTab?: string }) => void;
  onEnterWorkspace: (tab?: string) => void;
}

function getStageStepIndex(status: CaseStatus): number {
  if (status === 'closed' || status === 'settled') return 3;
  if (status === 'in_mediation' || status === 'court_proceeding' || status === 'lawyer_assigned') return 2;
  if (status === 'approved' || status === 'dlao_review') return 1;
  return 0;
}

export const LandingView: React.FC<LandingViewProps> = ({
  lang,
  dark,
  lowBandwidth,
  user,
  onToggleLang,
  onToggleDark,
  onOpenApply,
  onOpenUssdModal,
  onSignIn,
  onEnterWorkspace,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [caseQuery, setCaseQuery] = useState('LBD-2026-1042');
  const [trackedCase, setTrackedCase] = useState<CasePublicStatus | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackNotFound, setTrackNotFound] = useState(false);

  const runLookup = async (targetId: string) => {
    setCaseQuery(targetId);
    setTrackLoading(true);
    setTrackNotFound(false);
    setTrackedCase(null);
    try {
      const res = await lookupPublicCaseStatus(targetId);
      if (!res) {
        setTrackNotFound(true);
      } else {
        setTrackedCase(res);
      }
    } catch {
      setTrackNotFound(true);
    } finally {
      setTrackLoading(false);
    }
  };

  const handleTrackCase = async (e: React.FormEvent) => {
    e.preventDefault();
    await runLookup(caseQuery);
  };

  const activeStep = trackedCase ? getStageStepIndex(trackedCase.status) : -1;

  return (
    <div className="min-h-screen bg-[#F6FAF8] dark:bg-[#07120E] text-slate-900 dark:text-slate-100">
      {/* Top Navigation Bar: Logo + Wordmark | 4 Single-Line Links | Icon-Only Lang & Theme + Primary CTA */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#07120E]/95 backdrop-blur-md border-b border-emerald-200/70 dark:border-emerald-900/60">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-[64px] sm:h-[68px] flex items-center justify-between gap-4 sm:gap-8">
          {/* Brand Crest + Wordmark */}
          <a
            href="#top"
            className="inline-flex items-center gap-2.5 shrink-0 whitespace-nowrap group"
          >
            <JurisConnectCrest size={32} />
            <span className="font-sans text-lg sm:text-xl font-bold tracking-tight text-[#064E3B] dark:text-[#A7F3D0]">
              JurisConnect
            </span>
          </a>

          {/* 4 Single-Line Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#channels"
              className="hover:text-[#059669] dark:hover:text-[#6EE7B7] transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              {t(lang, 'Channels', 'সেবার মাধ্যম')}
            </a>
            <a
              href="#track"
              className="hover:text-[#059669] dark:hover:text-[#6EE7B7] transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              {t(lang, 'Track Case', 'মামলা ট্র্যাক')}
            </a>
            <a
              href="#workspaces"
              className="hover:text-[#059669] dark:hover:text-[#6EE7B7] transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              {t(lang, 'Workspaces', 'ড্যাশবোর্ড')}
            </a>
            <a
              href="#rights"
              className="hover:text-[#059669] dark:hover:text-[#6EE7B7] transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              {t(lang, 'AI & Legal RAG', 'এআই ও আইন')}
            </a>
          </nav>

          {/* Right Controls: Icon-Only Language Toggle + Icon-Only Theme Toggle + Primary CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleLang}
              aria-label={lang === 'en' ? 'Switch to Bengali' : 'Switch to English'}
              title={lang === 'en' ? 'বাংলা' : 'English'}
              className="w-9 h-9 rounded-lg border border-emerald-200/80 dark:border-emerald-900/70 bg-white dark:bg-[#0D1B16] text-slate-700 dark:text-slate-200 hover:border-[#10B981] hover:text-[#059669] dark:hover:text-[#6EE7B7] flex items-center justify-center transition-colors shrink-0"
            >
              <Languages className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onToggleDark}
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={dark ? 'Light Mode' : 'Dark Mode'}
              className="w-9 h-9 rounded-lg border border-emerald-200/80 dark:border-emerald-900/70 bg-white dark:bg-[#0D1B16] text-slate-700 dark:text-slate-200 hover:border-[#10B981] hover:text-[#059669] dark:hover:text-[#6EE7B7] flex items-center justify-center transition-colors shrink-0"
            >
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => onEnterWorkspace()}
                className="px-3.5 sm:px-4 py-2 rounded-lg bg-[#059669] text-white text-xs sm:text-sm font-medium hover:bg-[#047857] transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                {t(lang, 'Workspace', 'পোর্টাল')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSignIn({ mode: 'signin' })}
                className="px-3.5 sm:px-4 py-2 rounded-lg bg-[#059669] text-white text-xs sm:text-sm font-medium hover:bg-[#047857] transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                {t(lang, 'Sign In', 'সাইন ইন')}
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="lg:hidden w-9 h-9 rounded-lg border border-emerald-200/80 dark:border-emerald-900/70 flex items-center justify-center text-slate-700 dark:text-slate-200"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Compact Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] px-4 py-3 space-y-1 text-sm">
            {[
              { href: '#channels', label: t(lang, 'Channels & *16699#', 'সেবার মাধ্যম ও *১৬৬৯৯#') },
              { href: '#track', label: t(lang, 'Track Case', 'মামলা ট্র্যাক') },
              { href: '#workspaces', label: t(lang, 'Workspaces', 'ড্যাশবোর্ড') },
              { href: '#rights', label: t(lang, 'AI & Legal RAG', 'এআই ও আইন') },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </header>

      <main id="top">
        {/* Full-Screen Editorial Hero Banner with Overlaid Typography */}
        <section className="relative w-full min-h-[calc(100vh-68px)] flex flex-col justify-between overflow-hidden bg-[#031F16]">
          <img
            src="/src/assets/images/hero_jurisconnect_banner_1795163587761.jpg"
            alt="JurisConnect National Legal Aid & Judicial Coordination Center"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Measured Mint-Emerald Contrast Scrims */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#031D14]/95 via-[#062C20]/84 to-[#094734]/48" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#031D14] via-transparent to-[#031D14]/35" />

          {/* Hero Main Copy Overlaid Directly on Banner */}
          <div className="relative z-10 max-w-[1280px] w-full mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-8 flex-1 flex items-center">
            <motion.div
              initial={lowBandwidth ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-3xl space-y-5 sm:space-y-6"
            >
              <div className="flex items-center gap-3 text-xs sm:text-sm font-medium text-[#A7F3D0]">
                <BangladeshJusticeSeal size={28} className="shrink-0" />
                <span>
                  {t(
                    lang,
                    'National Legal Aid Digital Infrastructure · All 64 Districts of Bangladesh',
                    'জাতীয় ডিজিটাল আইনি সহায়তা অবকাঠামো · বাংলাদেশের ৬৪ জেলা'
                  )}
                </span>
              </div>

              <h1 className="font-sans text-3xl sm:text-5xl lg:text-[4rem] font-semibold tracking-tight text-white leading-[1.08] text-balance">
                {t(lang, 'Bridging People to Justice.', 'ন্যায়বিচারের সাথে মানুষের সেতুবন্ধন।')}
              </h1>

              <p className="text-sm sm:text-lg text-emerald-50/90 leading-relaxed max-w-2xl">
                {t(
                  lang,
                  'JurisConnect transforms unstructured Bangla and English citizen complaints and uploaded evidence into structured, Bangladesh-law-grounded case intelligence—connecting citizens, DLAO officers, panel advocates, and mediators in real time.',
                  'JurisConnect নাগরিকের বাংলা ও ইংরেজি অভিযোগ এবং আপলোডকৃত নথিপত্রকে বাংলাদেশের আইন-ভিত্তিক (RAG) ও ব্যাখ্যাযোগ্য কেস ইন্টেলিজেন্সে রূপান্তর করে—ডিএলএও, প্যানেল আইনজীবী ও মধ্যস্থতাকারীদের সাথে রিয়েল-টাইম সংযোগ স্থাপন করে।'
                )}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenApply('web')}
                  className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-lg bg-[#34D399] text-[#022C22] text-sm font-semibold hover:bg-[#6EE7B7] transition-all duration-150 active:scale-[0.98] whitespace-nowrap shadow-lg shadow-emerald-950/40"
                >
                  {t(lang, 'Apply for Legal Aid', 'আইনি সহায়তার আবেদন করুন')}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenUssdModal('ussd')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-emerald-200/30 bg-white/10 backdrop-blur-xs text-sm font-medium text-white hover:bg-white/20 transition-colors duration-150 whitespace-nowrap"
                >
                  <Hash className="w-4 h-4 text-[#6EE7B7]" />
                  {t(lang, 'Test *16699# Feature Phone', '*১৬৬৯৯# বাটন ফোন টেস্ট')}
                </button>
                <button
                  type="button"
                  onClick={() => (user ? onEnterWorkspace('rag') : onSignIn())}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border border-emerald-200/20 text-sm font-medium text-[#D1FAE5] hover:bg-white/10 transition-colors duration-150 whitespace-nowrap"
                >
                  <BookOpen className="w-4 h-4 text-[#6EE7B7]" />
                  {t(lang, 'Bangladesh Legal RAG', 'বাংলাদেশ আইন RAG')}
                </button>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-emerald-100/80">
                <span>{t(lang, 'Bangla-First AI NLP', 'বাংলা-প্রথম এআই')}</span>
                <span aria-hidden="true">·</span>
                <span>{t(lang, 'Document OCR Extraction', 'ডকুমেন্ট ওসিআর')}</span>
                <span aria-hidden="true">·</span>
                <span>{t(lang, 'Verified Statutory RAG', 'আইন-ভিত্তিক RAG')}</span>
                <span aria-hidden="true">·</span>
                <span>{t(lang, 'Human-Supervised Triage', 'মানব-তত্ত্বাবধান')}</span>
              </div>
            </motion.div>
          </div>

          {/* Bottom Full-Width Architectural KPI Anchor Inside Hero */}
          <div className="relative z-10 border-t border-emerald-200/15 bg-[#031A12]/85 backdrop-blur-md">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-emerald-200/15">
              <div className="py-4 sm:py-5 pr-4">
                <div className="font-mono-tabular text-xl sm:text-2xl font-semibold text-white">64</div>
                <div className="text-xs font-medium text-[#A7F3D0] mt-0.5">
                  {t(lang, 'District Legal Aid Offices', 'জেলা লিগ্যাল এইড অফিস')}
                </div>
              </div>
              <div className="py-4 sm:py-5 sm:px-5">
                <div className="font-mono-tabular text-xl sm:text-2xl font-semibold text-amber-300">16699</div>
                <div className="text-xs font-medium text-[#A7F3D0] mt-0.5">
                  {t(lang, '24/7 Toll-Free Voice Helpline', '২৪/৭ টোল-ফ্রি হেল্পলাইন')}
                </div>
              </div>
              <div className="py-4 sm:py-5 sm:px-5">
                <div className="font-mono-tabular text-xl sm:text-2xl font-semibold text-white">*16699#</div>
                <div className="text-xs font-medium text-[#A7F3D0] mt-0.5">
                  {t(lang, 'Offline Feature-Phone USSD', 'অফলাইন ইউএসএসডি সেবা')}
                </div>
              </div>
              <div className="py-4 sm:py-5 sm:pl-5">
                <div className="font-mono-tabular text-xl sm:text-2xl font-semibold text-[#6EE7B7]">1 ID</div>
                <div className="text-xs font-medium text-[#A7F3D0] mt-0.5">
                  {t(lang, 'Unified Real-Time Case Sync', 'এক নাগরিক · একটি কেস আইডি')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Official Institutional Coordination & Alignment Bar */}
        <section className="bg-white dark:bg-[#0D1B16] border-b border-emerald-200/70 dark:border-emerald-900/60">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="flex items-center gap-3">
              <BangladeshJusticeSeal size={38} className="shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {t(lang, 'Legal Aid Services Act, 2000', 'আইনগত সহায়তা আইন, ২০০০')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {t(lang, 'NLASO Policy & Eligibility Aligned', 'এনএলএএসও নীতিমালা সামঞ্জস্যপূর্ণ')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DlaoSeal size={38} className="shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {t(lang, 'District Legal Aid Offices', 'জেলা লিগ্যাল এইড অফিস')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {t(lang, '64-District Queue & Referral', '৬৪ জেলার তদারকি ও রেফারেল')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <UdcAccessSeal size={38} className="shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {t(lang, 'Union Digital Centres (UDC)', 'ইউনিয়ন ডিজিটাল সেন্টার')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {t(lang, 'Assisted Rural Citizen Intake', 'গ্রামীণ নাগরিকদের সহায়ক আবেদন')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <JurisConnectCrest size={38} className="shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {t(lang, 'Human-Supervised AI Desk', 'মানব-তত্ত্বাবধানে এআই ডেস্ক')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {t(lang, 'Zero Automatic Rejections', 'স্বয়ংক্রিয় বাতিলমুক্ত ব্যবস্থা')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 01. Bangla-First AI Intake & 9:16 Animated Button Phone Showcase */}
        <section id="channels" className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="max-w-2xl mb-8 sm:mb-10">
            <h2 className="font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white text-balance">
              {t(
                lang,
                '01. Bangla-First AI Intake & Offline Feature-Phone Access',
                '০১. বাংলা-প্রথম এআই বিশ্লেষণ ও বাটন ফোনে অফলাইন সেবা'
              )}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              {t(
                lang,
                'Whether a citizen submits a Bangla narrative online, visits a Union Digital Centre, or dials *16699# on a basic button phone, every channel feeds one unified, AI-structured case record.',
                'নাগরিক অনলাইনে বাংলায় অভিযোগ লিখুন, ইউনিয়ন ডিজিটাল সেন্টারে যান অথবা সাধারণ বাটন ফোনে *১৬৬৯৯# ডায়াল করুন—প্রতিটি মাধ্যম একটি সমন্বিত কেস আইডিতে যুক্ত হয়।'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            {/* Left 7 Cols: Bangla-First AI + Document OCR + Web/UDC/DLAO Channels */}
            <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 flex flex-col justify-between gap-7">
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#059669] dark:text-[#6EE7B7]">
                  <Globe className="w-4 h-4" />
                  <span>WEB PORTAL · UDC DESK · BANGLA NLP & OCR</span>
                </div>

                <h3 className="font-sans text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
                  {t(
                    lang,
                    'Natural Bangla Legal Understanding & Document Evidence Extraction',
                    'স্বাভাবিক বাংলা অভিযোগ বিশ্লেষণ ও নথিপত্র ওসিআর যাচাই'
                  )}
                </h3>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t(
                    lang,
                    'Citizens write in natural Bangla or English and upload PDF or photo evidence (Kabinnama, Income Certificate, GD, Land Khatian). Server-side AI extracts traceable facts, identifies missing papers, and grounds citations in Bangladesh statutes.',
                    'নাগরিকরা সহজ বাংলা বা ইংরেজিতে অভিযোগ লিখে কাবিননামা, আয়ের সনদ, জিডি বা খতিয়ানের ছবি/পিডিএফ আপলোড করতে পারেন। এআই মূল তথ্য আলাদা করে, ঘাটতি প্রমাণ শনাক্ত করে এবং বাংলাদেশি আইনের ধারা উদ্ধৃত করে।'
                  )}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/60 text-xs">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#059669] dark:text-[#6EE7B7]" />
                      <span>{t(lang, 'Bangla-First NLP', 'বাংলা-প্রথম এআই')}</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      {t(lang, 'Preserves original Bangla narrative verbatim', 'মূল বক্তব্য অপরিবর্তিত রাখে')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FileSearch className="w-3.5 h-3.5 text-[#059669] dark:text-[#6EE7B7]" />
                      <span>{t(lang, 'Traceable OCR', 'নথিপত্র ওসিআর')}</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      {t(lang, 'Page & clause source references for every fact', 'পৃষ্ঠা ও ধারাভিত্তিক প্রমাণ')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#059669] dark:text-[#6EE7B7]" />
                      <span>{t(lang, 'UDC & DLAO Sync', 'ইউডিসি ও ডিএলএও')}</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      {t(lang, 'Direct union-to-district queue routing', 'ইউনিয়ন থেকে জেলায় সরাসরি প্রেরণ')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenApply('web')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#059669] text-white text-xs sm:text-sm font-medium hover:bg-[#047857] transition-all duration-150 active:scale-[0.98]"
                >
                  {t(lang, 'Start Online Application', 'অনলাইন আবেদন শুরু করুন')}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenApply('udc_assisted')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/70 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-[#10B981] transition-colors duration-150"
                >
                  <Building2 className="w-4 h-4 text-[#059669] dark:text-[#6EE7B7]" />
                  {t(lang, 'Log UDC Assisted Intake', 'ইউডিসি সহায়ক আবেদন')}
                </button>
              </div>
            </div>

            {/* Right 5 Cols: 9:16 Animated Feature Phone / Button Phone Walkthrough */}
            <div className="lg:col-span-5 p-6 sm:p-8 rounded-2xl bg-[#042118] text-white border border-emerald-900/70 flex flex-col items-center justify-between gap-5">
              <div className="w-full text-center space-y-1">
                <div className="text-[11px] font-mono-tabular text-[#6EE7B7]">
                  04. HELPLINE 16699 · 05. USSD *16699#
                </div>
                <h3 className="font-sans text-lg sm:text-xl font-semibold text-white">
                  {t(lang, 'Offline Button-Phone & Voice Access', 'বাটন ফোন ইউএসএসডি ও ভয়েস হেল্পলাইন')}
                </h3>
                <p className="text-xs text-emerald-100/75">
                  {t(
                    lang,
                    'Watch live 9:16 dialing flow or click the phone to test keys manually',
                    '৯:১৬ বাটন ফোনের অ্যানিমেশন দেখুন বা ম্যানুয়ালি টেস্ট করতে ফোনে ক্লিক করুন'
                  )}
                </p>
              </div>

              <FeaturePhoneShowcase
                lang={lang}
                lowBandwidth={lowBandwidth}
                onOpenInteractiveModal={(mode) => onOpenUssdModal(mode)}
              />
            </div>
          </div>
        </section>

        {/* 02. Live Public Case Tracker with Visual Stage Stepper */}
        <section id="track" className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-emerald-200/70 dark:border-emerald-900/60">
          <div className="p-6 sm:p-10 rounded-2xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <div className="lg:col-span-5 space-y-3">
              <h2 className="font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {t(lang, '02. Live Unified Case Tracker', '০২. লাইভ কেস স্ট্যাটাস ট্র্যাকার')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {t(
                  lang,
                  'Verify real-time workflow stage, district jurisdiction, and scheduled hearing dates using your Unified Case ID—with zero personal identity exposure.',
                  'ব্যক্তিগত তথ্য গোপন রেখেই সমন্বিত কেস আইডি দিয়ে মামলার বর্তমান ধাপ, জেলা ও পরবর্তী শুনানির তারিখ যাচাই করুন।'
                )}
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">{t(lang, 'Sample IDs:', 'নমুনা আইডি:')}</span>
                {['LBD-2026-1042', 'LBD-2026-2088', 'LBD-2026-3015'].map((sampleId) => (
                  <button
                    key={sampleId}
                    type="button"
                    onClick={() => runLookup(sampleId)}
                    className="px-2.5 py-1 rounded-md bg-emerald-50/50 dark:bg-[#07120E] border border-emerald-200/80 dark:border-emerald-900/70 font-mono-tabular text-xs text-slate-700 dark:text-slate-300 hover:border-[#059669] hover:text-[#059669] transition-colors"
                  >
                    {sampleId}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-5">
              <form onSubmit={handleTrackCase} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={caseQuery}
                    onChange={(e) => setCaseQuery(e.target.value)}
                    placeholder="LBD-2026-1042"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-emerald-200/80 dark:border-emerald-900/70 bg-emerald-50/30 dark:bg-[#07120E] font-mono-tabular text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="px-6 py-3 rounded-lg bg-[#059669] text-white text-sm font-medium hover:bg-[#047857] transition-all duration-150 active:scale-[0.98] whitespace-nowrap"
                >
                  {trackLoading ? t(lang, 'Checking...', 'যাচাই হচ্ছে...') : t(lang, 'Check Status', 'অবস্থা দেখুন')}
                </button>
              </form>

              {trackedCase && (
                <div className="p-5 rounded-xl bg-emerald-50/40 dark:bg-[#07120E] border border-emerald-200/80 dark:border-emerald-900/60 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-mono-tabular font-semibold text-[#059669] dark:text-[#6EE7B7] text-base">
                        {trackedCase.caseNumber}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                        {trackedCase.district} · {CATEGORY_LABELS[trackedCase.category]?.[lang] || trackedCase.category} ·{' '}
                        {CHANNEL_LABELS[trackedCase.channel]?.[lang] || trackedCase.channel}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">
                        {STATUS_LABELS[trackedCase.status]?.[lang] || trackedCase.status}
                      </div>
                      {trackedCase.nextHearingDate && (
                        <div className="font-mono-tabular text-slate-500 dark:text-slate-400 mt-0.5">
                          Hearing: {trackedCase.nextHearingDate}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4-Step Visual Stage Progression */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-emerald-200/70 dark:border-emerald-900/60">
                    {[
                      t(lang, 'Submitted', 'দাখিল'),
                      t(lang, 'DLAO Review', 'ডিএলএও যাচাই'),
                      t(lang, 'Counsel / ADR', 'আইনজীবী / মধ্যস্থতা'),
                      t(lang, 'Resolved', 'নিষ্পত্তি'),
                    ].map((stepLabel, idx) => {
                      const done = idx <= activeStep;
                      return (
                        <div key={stepLabel} className="space-y-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-colors ${
                              done ? 'bg-[#10B981]' : 'bg-emerald-100 dark:bg-emerald-950'
                            }`}
                          />
                          <div
                            className={`text-[11px] font-medium flex items-center gap-1 ${
                              done ? 'text-[#059669] dark:text-[#6EE7B7]' : 'text-slate-400'
                            }`}
                          >
                            {done && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                            <span className="truncate">{stepLabel}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {trackNotFound && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t(
                    lang,
                    'No public record found for that ID yet. Sign in to submit a case or load sample district records in the workspace.',
                    'এই কেস আইডির কোনো রেকর্ড পাওয়া যায়নি। সাইন ইন করে নতুন আবেদন করুন অথবা ওয়ার্কস্পেস থেকে নমুনা তথ্য লোড করুন।'
                  )}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 03. Role-Based Workspaces & Mediation Showcase */}
        <section id="workspaces" className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-emerald-200/70 dark:border-emerald-900/60">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 space-y-6 flex flex-col justify-center">
              <h2 className="font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white text-balance">
                {t(
                  lang,
                  '03. Six real-time role workspaces on one unified database',
                  '০৩. এক ডাটাবেজে ৬টি ভূমিকাভিত্তিক রিয়েল-টাইম ওয়ার্কস্পেস'
                )}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {t(
                  lang,
                  'Every stakeholder works inside a dedicated interface tailored to their statutory duties—with instant Firestore synchronization and immutable audit trails.',
                  'প্রতিটি অংশীজনের জন্য নির্ধারিত ড্যাশবোর্ড—রিয়েল-টাইম ফায়ারবেস সিঙ্ক এবং পূর্ণাঙ্গ অডিট লগসহ।'
                )}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  { id: 'citizen', num: '01', title: t(lang, 'Citizen Portal', 'নাগরিক পোর্টাল'), desc: t(lang, 'Track cases, hearings & messages', 'মামলা, শুনানি ও বার্তা ট্র্যাকিং') },
                  { id: 'dlao', num: '02', title: t(lang, 'DLAO Dashboard', 'ডিএলএও ড্যাশবোর্ড'), desc: t(lang, 'Verify eligibility & assign lawyers', 'যোগ্যতা যাচাই ও আইনজীবী নিয়োগ') },
                  { id: 'lawyer', num: '03', title: t(lang, 'Lawyer Workspace', 'আইনজীবী পোর্টাল'), desc: t(lang, 'Court dates & progress reports', 'শুনানির তারিখ ও অগ্রগতি রিপোর্ট') },
                  { id: 'mediation', num: '04', title: t(lang, 'Digital Mediation', 'ডিজিটাল মধ্যস্থতা'), desc: t(lang, 'ADR scheduling & settlements', 'সেশন নির্ধারণ ও আপস-মীমাংসা') },
                  { id: 'referrals', num: '05', title: t(lang, 'District Referrals', 'আন্তঃজেলা রেফারেল'), desc: t(lang, 'Cross-district transfer tracking', 'একই আইডিতে জেলা স্থানান্তর') },
                  { id: 'supervisory', num: '06', title: t(lang, 'Supervisory & AI', 'তদারকি ও এনএলএএসও'), desc: t(lang, 'Committee minutes, CSV & audit', 'কমিটি সভা, রিপোর্ট ও অডিট') },
                ].map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => {
                      if (user) {
                        onEnterWorkspace(ws.id);
                      } else {
                        const roleMap: Record<string, Exclude<UserPublic['role'], 'admin'>> = {
                          citizen: 'citizen',
                          dlao: 'dlao_officer',
                          lawyer: 'panel_lawyer',
                          mediation: 'mediator',
                          referrals: 'dlao_officer',
                          supervisory: 'supervisor',
                        };
                        onSignIn({
                          mode: 'signin',
                          role: roleMap[ws.id] || 'citizen',
                          targetTab: ws.id,
                        });
                      }
                    }}
                    className="p-4 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 text-left hover:border-[#10B981] hover:-translate-y-0.5 transition-all duration-150 group"
                  >
                    <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-400 mb-1">
                      <span>{ws.num}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#059669] dark:group-hover:text-[#6EE7B7] transition-colors" />
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white group-hover:text-[#059669] dark:group-hover:text-[#6EE7B7]">
                      {ws.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ws.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="rounded-2xl overflow-hidden border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#0D1B16] flex flex-col">
                <div className="aspect-[4/3] overflow-hidden bg-emerald-100/50 dark:bg-emerald-950/60">
                  <img
                    src="/src/assets/images/mediation_chambers_1795155275512.jpg"
                    alt="Digital Mediation Chambers"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-mono-tabular text-[#059669] dark:text-[#6EE7B7]">ADR & MEDIATION</div>
                    <div className="font-sans font-semibold text-base text-slate-900 dark:text-white mt-1">
                      {t(lang, 'Dignified Dispute Resolution', 'সম্মানজনক আপস-মীমাংসা')}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t(
                      lang,
                      'Hybrid and in-person ADR tracking with party confirmations and signed settlement outcomes.',
                      'হাইব্রিড ও সরাসরি মধ্যস্থতা সেশন এবং মীমাসা নথিভুক্তকরণ।'
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#0D1B16] flex flex-col">
                <div className="aspect-[4/3] overflow-hidden bg-emerald-100/50 dark:bg-emerald-950/60">
                  <img
                    src="/src/assets/images/lawyer_counsel_portrait_1795155274406.jpg"
                    alt="Senior Panel Advocate"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="p-5 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-mono-tabular text-amber-700 dark:text-amber-400">PANEL ADVOCATES</div>
                    <div className="font-sans font-semibold text-base text-slate-900 dark:text-white mt-1">
                      {t(lang, 'Verified Legal Representation', 'যাচাইকৃত প্যানেল আইনজীবী')}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t(
                      lang,
                      'Direct hearing date synchronization and real-time client progress updates.',
                      'শুনানির তারিখ ও রিয়েল-টাইম অগ্রগতি আপডেট।'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 04. AI Case Intelligence, Bangladesh Legal RAG & Governance */}
        <section id="rights" className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-emerald-200/70 dark:border-emerald-900/60 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white text-balance">
                {t(
                  lang,
                  '04. Explainable AI & Human-Supervised Legal Intelligence',
                  '০৪. ব্যাখ্যাযোগ্য এআই এবং মানব-তত্ত্বাবধানে আইনি বিশ্লেষণ'
                )}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {t(
                  lang,
                  'AI assists authorized legal-aid professionals with structured extraction, OCR, and statutory RAG citations—while human DLAO officers, lawyers, and mediators retain all decision authority.',
                  'এআই অনুমোদিত কর্মকর্তাদের তথ্য বিশ্লেষণ, ওসিআর এবং বাংলাদেশি আইনের উদ্ধৃতি দিয়ে সহায়তা করে—চূড়ান্ত আইনি সিদ্ধান্ত সর্বদা মানব কর্মকর্তাদের হাতে থাকে।'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => (user ? onEnterWorkspace('rag') : onSignIn())}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#059669] text-white text-xs font-medium hover:bg-[#047857] whitespace-nowrap w-fit transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[#A7F3D0]" />
              {t(lang, 'Open Bangladesh Legal RAG Console', 'বাংলাদেশ আইন RAG কনসোল খুলুন')}
            </button>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-emerald-100 dark:divide-emerald-900/60">
            <div className="p-6 sm:p-7 space-y-2.5">
              <div className="flex items-center gap-2 text-[#059669] dark:text-[#6EE7B7] font-semibold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>{t(lang, 'Bangla-First NLP & Document OCR', 'বাংলা-প্রথম বিশ্লেষণ ও ডকুমেন্ট ওসিআর')}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t(
                  lang,
                  'Extracts names, dates, districts, missing proof, and follow-up questions from natural Bangla complaints and uploaded PDF/photo evidence while preserving the original citizen narrative verbatim.',
                  'স্বাভাবিক বাংলা অভিযোগ ও আপলোড করা নথি (পিডিএফ/ছবি) থেকে মূল তথ্য, ঘাটতি প্রমাণ ও প্রশ্ন শনাক্ত করে এবং নাগরিকের মূল বক্তব্য অপরিবর্তিত রাখে।'
                )}
              </p>
            </div>

            <div className="p-6 sm:p-7 space-y-2.5">
              <div className="flex items-center gap-2 text-[#065F46] dark:text-white font-semibold text-sm">
                <BookOpen className="w-4 h-4 text-[#059669] dark:text-[#6EE7B7]" />
                <span>{t(lang, 'Bangladesh Legal RAG Grounding', 'বাংলাদেশ আইন-ভিত্তিক RAG')}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t(
                  lang,
                  'Retrieves verified statutes (Legal Aid Services Act 2000, Family Courts Act 2023, Labour Act 2006, Domestic Violence Act 2010) with official citations and explicit insufficient-evidence flags.',
                  'আইনগত সহায়তা আইন ২০০০, পারিবারিক আদালত আইন ২০২৩ ও শ্রম আইনসহ যাচাইকৃত বাংলাদেশি আইনের ধারা উদ্ধৃত করে।'
                )}
              </p>
            </div>

            <div className="p-6 sm:p-7 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#059669] dark:text-[#6EE7B7]" />
                <span>{t(lang, 'Human Supervision & Zero Auto-Rejection', 'মানব-তত্ত্বাবধান ও নিরাপদ যোগাযোগ')}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t(
                  lang,
                  'AI outputs remain strictly advisory with confidence & uncertainty notes. DLAO officers approve, correct, or override assessments inside an audited workspace with PII isolation.',
                  'এআই-এর প্রতিটি বিশ্লেষণ সহায়ক মাত্র; কোনো আবেদন স্বয়ংক্রিয়ভাবে বাতিল হয় না এবং ডিএলএও অফিসার চূড়ান্ত অনুমোদন দেন।'
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Official Institutional Support Network Animated Carousel (Immediately Above Footer) */}
        <InstitutionalSupportSection lang={lang} lowBandwidth={lowBandwidth} />
      </main>

      {/* Rich Institutional Footer */}
      <footer className="bg-[#031F16] text-slate-300 border-t border-emerald-900/70">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8">
          {/* Brand & Official Coordination */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <JurisConnectCrest size={36} />
              <div>
                <div className="font-sans text-lg font-bold text-white leading-tight">JurisConnect</div>
                <div className="text-xs text-[#6EE7B7]">
                  {t(lang, 'Bridging People to Justice.', 'ন্যায়বিচারের সাথে মানুষের সেতুবন্ধন।')}
                </div>
              </div>
            </div>
            <p className="text-xs text-emerald-100/70 leading-relaxed max-w-md">
              {t(
                lang,
                'An AI-powered Legal Aid Intelligence & Case Management Platform connecting citizens across all 64 districts of Bangladesh with District Legal Aid Offices (DLAO), panel advocates, and ADR mediators under human supervision.',
                'বাংলাদেশের ৬৪ জেলার নাগরিকদের সাথে জেলা লিগ্যাল এইড অফিস (ডিএলএও), প্যানেল আইনজীবী ও মধ্যস্থতাকারীদের মানব-তত্ত্বাবধানে সংযুক্ত করার এআই-সমৃদ্ধ ডিজিটাল প্ল্যাটফর্ম।'
              )}
            </p>
            <div className="flex items-center gap-3 pt-1">
              <DlaoSeal size={30} />
              <UdcAccessSeal size={30} />
              <span className="text-[11px] text-emerald-100/70">
                {t(lang, 'Aligned with Legal Aid Services Act, 2000 (Act No. VI)', 'আইনগত সহায়তা প্রদান আইন, ২০০০-এর সাথে সামঞ্জস্যপূর্ণ')}
              </span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div className="lg:col-span-2 space-y-3 text-xs">
            <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
              {t(lang, 'Platform', 'প্ল্যাটফর্ম')}
            </div>
            <ul className="space-y-2 text-emerald-100/70">
              <li>
                <a href="#channels" className="hover:text-white transition-colors">
                  {t(lang, 'Intake Channels', 'আবেদন মাধ্যম')}
                </a>
              </li>
              <li>
                <a href="#track" className="hover:text-white transition-colors">
                  {t(lang, 'Track Case ID', 'মামলা ট্র্যাক করুন')}
                </a>
              </li>
              <li>
                <a href="#workspaces" className="hover:text-white transition-colors">
                  {t(lang, 'Role Workspaces', 'ওয়ার্কস্পেস')}
                </a>
              </li>
              <li>
                <a href="#rights" className="hover:text-white transition-colors">
                  {t(lang, 'AI & Legal RAG', 'এআই ও আইন')}
                </a>
              </li>
            </ul>
          </div>

          {/* Interactive Services */}
          <div className="lg:col-span-3 space-y-3 text-xs">
            <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
              {t(lang, 'Citizen Services', 'নাগরিক সেবা')}
            </div>
            <ul className="space-y-2 text-emerald-100/70">
              <li>
                <button type="button" onClick={() => onOpenApply('web')} className="hover:text-white transition-colors">
                  {t(lang, 'Apply Online for Legal Aid', 'অনলাইন আইনি আবেদন')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onOpenUssdModal('ussd')} className="hover:text-white transition-colors">
                  {t(lang, 'Launch *16699# Button Phone Simulator', '*১৬৬৯৯# বাটন ফোন সিমুলেটর')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onOpenUssdModal('helpline')} className="hover:text-white transition-colors">
                  {t(lang, '16699 Emergency Helpline Intake', '১৬৬৯৯ জরুরি কল এন্ট্রি')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => (user ? onEnterWorkspace('rag') : onSignIn())}
                  className="hover:text-white transition-colors"
                >
                  {t(lang, 'Query Bangladesh Legal RAG', 'বাংলাদেশ আইন RAG দেখুন')}
                </button>
              </li>
            </ul>
          </div>

          {/* 24/7 Access & Helpline */}
          <div className="lg:col-span-2 space-y-3 text-xs">
            <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
              {t(lang, '24/7 Toll-Free', '২৪/৭ টোল-ফ্রি')}
            </div>
            <div className="space-y-2 font-mono-tabular">
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                <span>16699</span>
              </div>
              <div className="flex items-center gap-2 text-[#6EE7B7] font-semibold">
                <Scale className="w-3.5 h-3.5 shrink-0" />
                <span>*16699# USSD</span>
              </div>
              <div className="text-emerald-100/70 font-sans text-[11px]">
                {t(lang, '64 District Legal Aid Committees', '৬৪টি জেলা লিগ্যাল এইড কমিটি')}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-emerald-900/60 py-5 px-4 sm:px-6">
          <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-emerald-100/65">
            <div>
              © {new Date().getFullYear()} JurisConnect ·{' '}
              {t(
                lang,
                'AI-assisted legal aid intelligence; human professionals retain all final legal decisions.',
                'এআই সহায়ক প্রযুক্তি; চূড়ান্ত আইনি সিদ্ধান্ত সর্বদা অনুমোদিত মানব কর্মকর্তাদের।'
              )}
            </div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={onToggleLang} className="hover:text-white transition-colors">
                {lang === 'en' ? 'বাংলা সংস্করণ' : 'English Edition'}
              </button>
              <button type="button" onClick={onToggleDark} className="hover:text-white transition-colors">
                {dark ? t(lang, 'Light Theme', 'লাইট থিম') : t(lang, 'Dark Theme', 'ডার্ক থিম')}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
