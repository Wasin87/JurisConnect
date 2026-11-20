import React, { useState } from 'react';
import {
  LayoutDashboard,
  Scale,
  Briefcase,
  Handshake,
  ArrowRightLeft,
  ShieldCheck,
  UserCheck,
  Plus,
  Search,
  LogOut,
  Home,
  Database,
  Sun,
  Moon,
  Languages,
  PhoneCall,
  Menu,
  X,
  BookOpen,
} from 'lucide-react';
import {
  BANGLADESH_DISTRICTS,
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  PRIORITY_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
  t,
} from '../i18n';
import type {
  AuditLog,
  CaseReferral,
  CaseStatus,
  CommitteeMeeting,
  Complaint,
  IntakeChannel,
  LanguageCode,
  LegalCase,
  MediationSession,
  UserPublic,
} from '../types';
import {
  seedSampleBangladeshCases,
  updateLegalCaseWorkflow,
  updateUserPrivatePII,
  updateUserProfileFields,
} from '../services/legalBdService';
import { MediationPanel, ReferralPanel } from './workspaces/MediationReferralPanels';
import { SupervisoryPanel } from './workspaces/SupervisoryPanel';
import { LegalRagPanel } from './LegalRagPanel';
import { JurisConnectCrest } from './BrandEmblems';
import { fireSubtleMilestoneConfetti } from '../utils/confetti';

export type WorkspaceTab =
  | 'citizen'
  | 'dlao'
  | 'lawyer'
  | 'mediation'
  | 'referrals'
  | 'rag'
  | 'supervisory'
  | 'profile';

interface WorkspaceShellProps {
  user: UserPublic;
  userEmail: string;
  activeTab: WorkspaceTab;
  lang: LanguageCode;
  dark: boolean;
  lowBandwidth: boolean;
  cases: LegalCase[];
  mediations: MediationSession[];
  referrals: CaseReferral[];
  meetings: CommitteeMeeting[];
  complaints: Complaint[];
  auditLogs: AuditLog[];
  directoryUsers: UserPublic[];
  loadingData: boolean;
  onSelectTab: (tab: WorkspaceTab) => void;
  onSelectCase: (legalCase: LegalCase) => void;
  onOpenApply: (channel?: IntakeChannel) => void;
  onOpenUssdModal: (mode: 'ussd' | 'helpline') => void;
  onToggleLang: () => void;
  onToggleDark: () => void;
  onGoHome: () => void;
  onSignOut: () => void;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  user,
  userEmail,
  activeTab,
  lang,
  dark,
  lowBandwidth,
  cases,
  mediations,
  referrals,
  meetings,
  complaints,
  auditLogs,
  directoryUsers,
  loadingData,
  onSelectTab,
  onSelectCase,
  onOpenApply,
  onOpenUssdModal,
  onToggleLang,
  onToggleDark,
  onGoHome,
  onSignOut,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CaseStatus>('ALL');
  const [seeding, setSeeding] = useState(false);

  // Profile / PII state
  const [profName, setProfName] = useState(user.displayName);
  const [profDistrict, setProfDistrict] = useState(user.district);
  const [profPhone, setProfPhone] = useState('');
  const [profNid, setProfNid] = useState('');
  const [profAddress, setProfAddress] = useState('');
  const [profSaved, setProfSaved] = useState(false);

  const isOfficerOrAdmin = ['admin', 'dlao_officer', 'supervisor'].includes(user.role);

  const navItems: Array<{ id: WorkspaceTab; label: string; icon: React.ReactNode }> = [
    { id: 'citizen', label: t(lang, 'Citizen Portal', 'নাগরিক পোর্টাল'), icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'dlao', label: t(lang, 'DLAO Queue', 'ডিএলএও ড্যাশবোর্ড'), icon: <Scale className="w-4 h-4" /> },
    { id: 'lawyer', label: t(lang, 'Lawyer Caseload', 'আইনজীবী পোর্টাল'), icon: <Briefcase className="w-4 h-4" /> },
    { id: 'mediation', label: t(lang, 'Digital Mediation', 'ডিজিটাল মধ্যস্থতা'), icon: <Handshake className="w-4 h-4" /> },
    { id: 'referrals', label: t(lang, 'District Referrals', 'আন্তঃজেলা রেফারেল'), icon: <ArrowRightLeft className="w-4 h-4" /> },
    { id: 'rag', label: t(lang, 'Bangladesh Legal RAG', 'বাংলাদেশ আইন (RAG)'), icon: <BookOpen className="w-4 h-4" /> },
    { id: 'supervisory', label: t(lang, 'Supervisory & AI', 'তদারকি ও অডিট'), icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'profile', label: t(lang, 'Safe Profile & PII', 'নিরাপদ প্রোফাইল'), icon: <UserCheck className="w-4 h-4" /> },
  ];

  const filteredCases = cases.filter((c) => {
    if (activeTab === 'citizen' && user.role !== 'admin') {
      if (c.citizenUid !== user.uid) return false;
    }
    if (activeTab === 'lawyer') {
      if (user.role !== 'admin' && c.assignedLawyerUid !== user.uid && !c.assignedLawyerName) {
        return false;
      }
      if (!c.assignedLawyerName) return false;
    }
    if (districtFilter !== 'ALL' && c.district !== districtFilter) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.caseNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.citizenName.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleQuickApprove = async (c: LegalCase, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateLegalCaseWorkflow(
      c,
      { status: 'approved', eligibilityVerified: true },
      user,
      'DLAO_APPROVED',
      'Quick eligibility verification & approval from DLAO dashboard.'
    );
    fireSubtleMilestoneConfetti(lowBandwidth);
  };

  const handleSeedSamples = async () => {
    setSeeding(true);
    try {
      await seedSampleBangladeshCases(user);
      fireSubtleMilestoneConfetti(lowBandwidth);
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfileFields(user.uid, {
      displayName: profName,
      district: profDistrict,
      preferredLanguage: lang,
    });
    await updateUserPrivatePII(user.uid, userEmail, profPhone, profNid, profAddress);
    setProfSaved(true);
    setTimeout(() => setProfSaved(false), 3000);
  };

  const activeNavLabel = navItems.find((n) => n.id === activeTab)?.label || 'Workspace';

  return (
    <div className="min-h-screen flex bg-[#F6FAF8] dark:bg-[#07120E] text-slate-900 dark:text-slate-100">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 256px Workspace Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 shrink-0 bg-white dark:bg-[#0D1B16] border-r border-emerald-200/70 dark:border-emerald-900/60 flex flex-col justify-between transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="px-5 py-4 border-b border-emerald-200/70 dark:border-emerald-900/60 flex items-center justify-between">
            <button
              type="button"
              onClick={onGoHome}
              className="inline-flex items-center gap-2.5 font-sans text-lg font-bold tracking-tight text-[#064E3B] dark:text-[#A7F3D0] whitespace-nowrap"
            >
              <JurisConnectCrest size={28} />
              <span>JurisConnect</span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-md text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#059669] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-emerald-200/70 dark:border-emerald-900/60 space-y-3 text-xs">
          <div className="space-y-0.5">
            <div className="font-semibold text-slate-900 dark:text-white truncate">{user.displayName}</div>
            <div className="text-[#059669] dark:text-[#6EE7B7] font-medium truncate">
              {ROLE_LABELS[user.role]?.[lang] || user.role}
            </div>
            <div className="text-slate-400 truncate">{user.district}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGoHome}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-md border border-emerald-200/80 dark:border-emerald-900/70 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
            >
              <Home className="w-3.5 h-3.5" />
              {t(lang, 'Public Site', 'মূল পাতা')}
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="p-2 rounded-md border border-emerald-200/80 dark:border-emerald-900/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* SaaS Breadcrumb Top Bar */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#07120E]/95 backdrop-blur-xs border-b border-emerald-200/70 dark:border-emerald-900/60 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-emerald-200/80 dark:border-emerald-900/70"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
              <span className="hidden sm:inline">JurisConnect</span>
              <span className="hidden sm:inline">/</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate">{activeNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenUssdModal('ussd')}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200/80 dark:border-emerald-900/70 bg-white dark:bg-[#0D1B16] text-xs font-medium hover:border-[#10B981] whitespace-nowrap"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#059669] dark:text-[#6EE7B7]" />
              16699 / *16699#
            </button>
            <button
              type="button"
              onClick={onToggleLang}
              aria-label={lang === 'en' ? 'Switch to Bengali' : 'Switch to English'}
              title={lang === 'en' ? 'বাংলা' : 'English'}
              className="w-9 h-9 rounded-lg border border-emerald-200/80 dark:border-emerald-900/70 bg-white dark:bg-[#0D1B16] text-slate-700 dark:text-slate-200 hover:border-[#10B981] flex items-center justify-center shrink-0"
            >
              <Languages className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleDark}
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={dark ? 'Light Mode' : 'Dark Mode'}
              className="w-9 h-9 rounded-lg border border-emerald-200/80 dark:border-emerald-900/70 bg-white dark:bg-[#0D1B16] text-slate-700 dark:text-slate-200 hover:border-[#10B981] flex items-center justify-center shrink-0"
            >
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => onOpenApply('web')}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-[#059669] text-white text-xs font-medium hover:bg-[#047857] transition-all active:scale-[0.98] whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t(lang, 'New Application', 'নতুন আবেদন')}</span>
              <span className="sm:hidden">{t(lang, 'Apply', 'আবেদন')}</span>
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 max-w-[1280px] w-full mx-auto space-y-5 sm:space-y-6">
          {/* Structural 4-Column KPI Strip */}
          <div className="rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-emerald-100 dark:divide-emerald-900/60">
            <div className="p-4 sm:p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t(lang, 'Synced Cases', 'সক্রিয় মামলা')}</div>
              <div className="font-mono-tabular text-2xl font-semibold text-slate-900 dark:text-white mt-1">
                {cases.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{t(lang, 'Unified case records', 'সমন্বিত ডিজিটাল নথি')}</div>
            </div>
            <div className="p-4 sm:p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t(lang, 'Urgent / Emergency', 'জরুরি অগ্রাধিকার')}</div>
              <div className="font-mono-tabular text-2xl font-semibold text-red-600 dark:text-red-400 mt-1">
                {cases.filter((c) => c.emergencyFlag || c.priority === 'critical').length}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{t(lang, 'Priority safety triage', 'তাৎক্ষণিক নিরাপত্তা পর্যবেক্ষণ')}</div>
            </div>
            <div className="p-4 sm:p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t(lang, 'Active Mediations', 'চলমান মধ্যস্থতা')}</div>
              <div className="font-mono-tabular text-2xl font-semibold text-amber-700 dark:text-amber-400 mt-1">
                {mediations.filter((m) => m.outcome === 'scheduled').length}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{t(lang, 'Scheduled ADR sessions', 'নির্ধারিত মধ্যস্থতা সেশন')}</div>
            </div>
            <div className="p-4 sm:p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t(lang, 'Settled Amicably', 'সফল মীমাংসা')}</div>
              <div className="font-mono-tabular text-2xl font-semibold text-[#059669] dark:text-[#6EE7B7] mt-1">
                {cases.filter((c) => c.status === 'settled' || c.status === 'closed').length}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{t(lang, 'Completed resolutions', 'সম্পন্নকৃত নিষ্পত্তি')}</div>
            </div>
          </div>

          {/* Case Table Views: Citizen / DLAO / Lawyer */}
          {(activeTab === 'citizen' || activeTab === 'dlao' || activeTab === 'lawyer') && (
            <div className="space-y-4">
              {!isOfficerOrAdmin && activeTab === 'dlao' && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
                  {t(
                    lang,
                    'Role-Based Access Control active: Citizen accounts view their own synchronized cases here. District Officers & Admins manage full district queues.',
                    'রোল-ভিত্তিক নিরাপত্তা সক্রিয়: নাগরিক অ্যাকাউন্ট এখানে নিজেদের মামলা দেখতে পাবেন। জেলা অফিসাররা সম্পূর্ণ জেলার তালিকা পরিচালনা করেন।'
                  )}
                </div>
              )}

              {/* Segmented Quick-Status Tabs + Search & District Filter */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1 p-1 bg-emerald-100/60 dark:bg-emerald-950/60 rounded-lg w-fit">
                  {(
                    [
                      { id: 'ALL', label: t(lang, 'All Cases', 'সকল মামলা') },
                      { id: 'submitted', label: t(lang, 'Submitted', 'দাখিলকৃত') },
                      { id: 'dlao_review', label: t(lang, 'DLAO Review', 'ডিএলএও যাচাই') },
                      { id: 'in_mediation', label: t(lang, 'In Mediation', 'মধ্যস্থতা') },
                      { id: 'settled', label: t(lang, 'Settled', 'মীমাংসিত') },
                    ] as const
                  ).map((seg) => (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => setStatusFilter(seg.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        statusFilter === seg.id
                          ? 'bg-white dark:bg-[#0D1B16] text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {seg.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative min-w-[210px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t(lang, 'Search Case ID, name, district...', 'কেস আইডি, নাম বা জেলা খুঁজুন...')}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-[#0D1B16] text-xs focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    />
                  </div>
                  <select
                    value={districtFilter}
                    onChange={(e) => setDistrictFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-[#0D1B16] text-xs"
                  >
                    <option value="ALL">{t(lang, 'All Districts', 'সকল জেলা')}</option>
                    {BANGLADESH_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  {user.role === 'admin' && cases.length === 0 && (
                    <button
                      type="button"
                      disabled={seeding}
                      onClick={handleSeedSamples}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-[#0D1B16] text-xs font-medium hover:border-[#10B981] whitespace-nowrap"
                    >
                      <Database className="w-3.5 h-3.5 text-[#059669] dark:text-[#6EE7B7]" />
                      {seeding
                        ? t(lang, 'Seeding...', 'লোড হচ্ছে...')
                        : t(lang, 'Seed 4 Sample Cases', '৪টি নমুনা মামলা লোড করুন')}
                    </button>
                  )}
                </div>
              </div>

              {/* High-Density Data Table */}
              <div className="rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 overflow-hidden">
                {loadingData ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 animate-pulse" />
                    ))}
                  </div>
                ) : filteredCases.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {t(lang, 'No matching cases in this view', 'এই তালিকায় কোনো মামলা পাওয়া যায়নি')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t(
                        lang,
                        'Submit a new legal aid application or load sample Bangladesh district records.',
                        'নতুন আইনি সহায়তার আবেদন করুন অথবা নমুনা মামলার তথ্য লোড করুন।'
                      )}
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenApply('web')}
                        className="px-4 py-2 rounded-lg bg-[#059669] text-white text-xs font-medium hover:bg-[#047857]"
                      >
                        {t(lang, 'Submit First Case', 'প্রথম আবেদন করুন')}
                      </button>
                      {user.role === 'admin' && cases.length === 0 && (
                        <button
                          type="button"
                          onClick={handleSeedSamples}
                          className="px-4 py-2 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 text-xs font-medium"
                        >
                          {t(lang, 'Load Sample Cases', 'নমুনা মামলা লোড করুন')}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-emerald-50/60 dark:bg-emerald-950/40 text-slate-500 dark:text-slate-400 border-b border-emerald-100 dark:border-emerald-900/60">
                        <tr>
                          <th className="py-3 px-4 font-medium">Case ID</th>
                          <th className="py-3 px-4 font-medium">{t(lang, 'Applicant & Subject', 'আবেদনকারী ও বিষয়')}</th>
                          <th className="py-3 px-4 font-medium">{t(lang, 'District & Channel', 'জেলা ও মাধ্যম')}</th>
                          <th className="py-3 px-4 font-medium">{t(lang, 'Priority', 'অগ্রাধিকার')}</th>
                          <th className="py-3 px-4 font-medium">{t(lang, 'Status', 'অবস্থা')}</th>
                          <th className="py-3 px-4 font-medium text-right">{t(lang, 'Action', 'পদক্ষেপ')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100/80 dark:divide-emerald-900/50">
                        {filteredCases.map((c) => (
                          <tr
                            key={c.caseId}
                            onClick={() => onSelectCase(c)}
                            className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-4 font-mono-tabular font-semibold text-[#059669] dark:text-[#6EE7B7] whitespace-nowrap">
                              {c.caseNumber}
                            </td>
                            <td className="py-3 px-4 max-w-xs">
                              <div className="font-medium text-slate-900 dark:text-white truncate">{c.title}</div>
                              <div className="text-slate-500 dark:text-slate-400 truncate">
                                {c.citizenName} · {CATEGORY_LABELS[c.category]?.[lang]}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="text-slate-800 dark:text-slate-200">{c.district}</div>
                              <div className="text-slate-400">{CHANNEL_LABELS[c.channel]?.[lang]}</div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`font-medium ${
                                  c.priority === 'critical'
                                    ? 'text-red-600 dark:text-red-400'
                                    : c.priority === 'high'
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {PRIORITY_LABELS[c.priority]?.[lang]}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                              {STATUS_LABELS[c.status]?.[lang]}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {isOfficerOrAdmin && (c.status === 'submitted' || c.status === 'dlao_review') ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickApprove(c, e)}
                                  className="px-3 py-1.5 rounded-md bg-[#059669] text-white font-medium hover:bg-[#047857]"
                                >
                                  {t(lang, 'Approve', 'অনুমোদন')}
                                </button>
                              ) : (
                                <span className="text-[#059669] dark:text-[#6EE7B7] font-medium">
                                  {t(lang, 'Manage', 'বিস্তারিত')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'mediation' && (
            <MediationPanel
              lang={lang}
              user={user}
              mediations={mediations}
              lowBandwidth={lowBandwidth}
            />
          )}

          {activeTab === 'referrals' && (
            <ReferralPanel
              lang={lang}
              user={user}
              referrals={referrals}
              lowBandwidth={lowBandwidth}
            />
          )}

          {activeTab === 'rag' && <LegalRagPanel lang={lang} />}

          {activeTab === 'supervisory' && (
            <SupervisoryPanel
              lang={lang}
              user={user}
              cases={cases}
              meetings={meetings}
              complaints={complaints}
              auditLogs={auditLogs}
              directoryUsers={directoryUsers}
              lowBandwidth={lowBandwidth}
            />
          )}

          {activeTab === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="max-w-xl p-6 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-4"
            >
              <h3 className="font-sans text-lg font-semibold text-slate-900 dark:text-white">
                {t(lang, 'Safe Profile & Isolated Contact Information', 'নিরাপদ প্রোফাইল ও যোগাযোগের তথ্য')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(
                  lang,
                  'Personal contact details are isolated in a private subcollection accessible only to you and authorized administrators.',
                  'ব্যক্তিগত তথ্য আলাদা সুরক্ষিত সংগ্রহশালায় সংরক্ষিত থাকে।'
                )}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t(lang, 'Display Name', 'নাম')}
                  </label>
                  <input
                    type="text"
                    required
                    value={profName}
                    onChange={(e) => setProfName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t(lang, 'Home District', 'জেলা')}
                  </label>
                  <select
                    value={profDistrict}
                    onChange={(e) => setProfDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs"
                  >
                    {BANGLADESH_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t(lang, 'Phone Number (Private)', 'ফোন নম্বর (গোপন)')}
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={profPhone}
                    onChange={(e) => setProfPhone(e.target.value)}
                    placeholder="+8801XXXXXXXXX"
                    className="w-full px-3 py-2 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t(lang, 'NID Last 4 Digits (Private)', 'এনআইডি শেষ ৪ সংখ্যা')}
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={profNid}
                    onChange={(e) => setProfNid(e.target.value)}
                    placeholder="e.g. 4829"
                    className="w-full px-3 py-2 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs font-mono-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t(lang, 'Safe Mailing Address (Private)', 'নিরাপদ ঠিকানা')}
                </label>
                <input
                  type="text"
                  maxLength={250}
                  value={profAddress}
                  onChange={(e) => setProfAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {profSaved ? (
                  <span className="text-xs text-[#059669] dark:text-[#6EE7B7] font-medium">
                    {t(lang, 'Profile & PII saved securely.', 'তথ্য নিরাপদে সংরক্ষিত হয়েছে।')}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">{userEmail}</span>
                )}
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#059669] text-white text-xs font-medium hover:bg-[#047857]"
                >
                  {t(lang, 'Save Safe Profile', 'সংরক্ষণ করুন')}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
};
