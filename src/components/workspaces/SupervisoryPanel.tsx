import React, { useState } from 'react';
import {
  FileCheck,
  MessageSquareWarning,
  Shield,
  Users,
  Plus,
  Download,
} from 'lucide-react';
import { BANGLADESH_DISTRICTS, ROLE_LABELS, STATUS_LABELS, t } from '../../i18n';
import type {
  AuditLog,
  CommitteeMeeting,
  Complaint,
  ComplaintStatus,
  LanguageCode,
  LegalCase,
  UserPublic,
  UserRole,
} from '../../types';
import {
  createCommitteeMeeting,
  resolveComplaint,
  submitComplaint,
  updateUserRoleAdmin,
} from '../../services/legalBdService';
import { fireSubtleMilestoneConfetti } from '../../utils/confetti';

interface SupervisoryPanelProps {
  lang: LanguageCode;
  user: UserPublic;
  cases: LegalCase[];
  meetings: CommitteeMeeting[];
  complaints: Complaint[];
  auditLogs: AuditLog[];
  directoryUsers: UserPublic[];
  lowBandwidth: boolean;
}

export const SupervisoryPanel: React.FC<SupervisoryPanelProps> = ({
  lang,
  user,
  cases,
  meetings,
  complaints,
  auditLogs,
  directoryUsers,
  lowBandwidth,
}) => {
  const [subTab, setSubTab] = useState<'analytics' | 'meetings' | 'complaints' | 'audit' | 'roles'>('analytics');

  // Meeting form state
  const [mDistrict, setMDistrict] = useState(user.district || 'Dhaka');
  const [mChair, setMChair] = useState('District & Sessions Judge (DLAO Chair)');
  const [mDate, setMDate] = useState('2026-11-20');
  const [mAgenda, setMAgenda] = useState('');
  const [mDecisions, setMDecisions] = useState('');
  const [mCount, setMCount] = useState(18);
  const [busy, setBusy] = useState(false);

  // Complaint form state
  const [cDistrict, setCDistrict] = useState(user.district || 'Dhaka');
  const [cCaseNo, setCCaseNo] = useState('');
  const [cSubject, setCSubject] = useState('');
  const [cDetails, setCDetails] = useState('');
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});

  const isOfficerOrAdmin = ['admin', 'supervisor', 'dlao_officer'].includes(user.role);
  const isAdmin = user.role === 'admin';

  // Compute district summary
  const districtMap = new Map<string, { total: number; settled: number; critical: number }>();
  for (const c of cases) {
    const cur = districtMap.get(c.district) || { total: 0, settled: 0, critical: 0 };
    cur.total += 1;
    if (c.status === 'settled' || c.status === 'closed') cur.settled += 1;
    if (c.priority === 'critical' || c.emergencyFlag) cur.critical += 1;
    districtMap.set(c.district, cur);
  }
  const districtStats = Array.from(districtMap.entries()).sort((a, b) => b[1].total - a[1].total);
  const maxCases = Math.max(1, ...districtStats.map((d) => d[1].total));

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mAgenda.trim() || !mDecisions.trim()) return;
    setBusy(true);
    try {
      await createCommitteeMeeting(mDistrict, mChair, mDate, mAgenda, mDecisions, mCount, user);
      setMAgenda('');
      setMDecisions('');
      fireSubtleMilestoneConfetti(lowBandwidth);
    } finally {
      setBusy(false);
    }
  };

  const handleAddComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cSubject.trim() || !cDetails.trim()) return;
    setBusy(true);
    try {
      await submitComplaint(cDistrict, cSubject, cDetails, cCaseNo, user);
      setCSubject('');
      setCDetails('');
      setCCaseNo('');
    } finally {
      setBusy(false);
    }
  };

  const handleResolveComplaint = async (cmp: Complaint, status: ComplaintStatus) => {
    const note = resolutionDrafts[cmp.complaintId] || 'Reviewed and resolved by District Supervisory Committee.';
    await resolveComplaint(cmp.complaintId, status, note);
    if (status === 'resolved') fireSubtleMilestoneConfetti(lowBandwidth);
  };

  const handleExportDistrictCsv = () => {
    const escapeCsv = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
    const headers = ['Case Number', 'District', 'Category', 'Priority', 'Status', 'Channel', 'AI Review Status', 'Updated At'];
    const rows = cases.map((c) => [
      escapeCsv(c.caseNumber),
      escapeCsv(c.district),
      escapeCsv(c.category),
      escapeCsv(c.priority),
      escapeCsv(c.status),
      escapeCsv(c.channel),
      escapeCsv(c.aiReviewStatus || 'pending_review'),
      escapeCsv(
        typeof c.updatedAt === 'string'
          ? c.updatedAt
          : c.updatedAt && typeof c.updatedAt === 'object' && 'toDate' in c.updatedAt
          ? c.updatedAt.toDate().toISOString()
          : ''
      ),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `jurisconnect-caseload-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-emerald-100/60 dark:bg-emerald-950/50 rounded-lg w-fit">
        {[
          { id: 'analytics', label: t(lang, 'District Analytics', 'জেলা পরিসংখ্যান') },
          { id: 'meetings', label: t(lang, 'Committee Meetings', 'কমিটি সভা') },
          { id: 'complaints', label: t(lang, 'Complaints & Exceptions', 'অভিযোগ ব্যবস্থাপনা') },
          { id: 'audit', label: t(lang, 'Audit Trail', 'অডিট লগ') },
          ...(isAdmin ? [{ id: 'roles', label: t(lang, 'Role Access (RBAC)', 'ভূমিকা নিয়ন্ত্রণ') }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id as typeof subTab)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              subTab === tab.id
                ? 'bg-white dark:bg-[#0D1B16] text-[#064E3B] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-[#064E3B] dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-sans text-lg font-semibold text-[#064E3B] dark:text-white">
                  {t(lang, 'District Caseload & Settlement Distribution', 'জেলাভিত্তিক মামলা ও নিষ্পত্তির হার')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t(lang, 'Live NLASO & District Chairman monitoring feed', 'এনএলএএসও ও জেলা চেয়ারম্যান তদারকি')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportDistrictCsv}
                disabled={cases.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-[#07120E] text-xs font-medium text-[#064E3B] dark:text-emerald-200 hover:border-[#059669] disabled:opacity-40 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-[#059669]" />
                {t(lang, 'Export CSV Report', 'সিএসভি রিপোর্ট ডাউনলোড')}
              </button>
            </div>
            {districtStats.length === 0 ? (
              <p className="text-xs text-slate-500 py-6">
                {t(lang, 'No active case metrics yet. Submit or seed district cases.', 'এখনও কোনো মামলার তথ্য নেই।')}
              </p>
            ) : (
              <div className="space-y-4">
                {districtStats.map(([dist, stat]) => (
                  <div key={dist} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{dist}</span>
                      <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                        {stat.total} {t(lang, 'total', 'মোট')} · {stat.settled} {t(lang, 'settled', 'মীমাংসিত')} · {stat.critical} {t(lang, 'urgent', 'জরুরি')}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-emerald-100/70 dark:bg-emerald-950/60 overflow-hidden">
                      <div
                        className="h-full bg-[#059669] rounded-full transition-all"
                        style={{ width: `${Math.round((stat.total / maxCases) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-4">
            <h3 className="font-sans text-lg font-semibold text-[#064E3B] dark:text-white">
              {t(lang, 'Status Breakdown', 'অবস্থা অনুযায়ী বিভাজন')}
            </h3>
            <div className="divide-y divide-emerald-200/60 dark:divide-emerald-900/60 text-xs">
              {(['submitted', 'dlao_review', 'approved', 'lawyer_assigned', 'in_mediation', 'court_proceeding', 'settled'] as const).map(
                (st) => {
                  const count = cases.filter((c) => c.status === st).length;
                  return (
                    <div key={st} className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">{STATUS_LABELS[st][lang]}</span>
                      <span className="font-mono-tabular font-semibold text-[#064E3B] dark:text-white">{count}</span>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'meetings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-3">
            {meetings.map((m) => (
              <div key={m.meetingId} className="p-5 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-[#059669] dark:text-emerald-400">{m.district} DLAO Committee</span>
                  <span className="font-mono-tabular">{m.meetingDate} · {m.casesReviewedCount} cases</span>
                </div>
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{m.agenda}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{m.decisions}</p>
                <div className="text-xs text-slate-400">{m.chairpersonName}</div>
              </div>
            ))}
            {meetings.length === 0 && (
              <div className="p-8 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 text-center text-xs text-slate-500">
                {t(lang, 'No committee meeting minutes recorded yet.', 'এখনও কোনো কমিটি সভার কার্যবিবরণী সংরক্ষিত হয়নি।')}
              </div>
            )}
          </div>

          {isOfficerOrAdmin && (
            <form
              onSubmit={handleAddMeeting}
              className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-4 h-fit"
            >
              <div className="flex items-center gap-2 font-semibold text-sm text-[#064E3B] dark:text-white">
                <FileCheck className="w-4 h-4 text-[#059669]" />
                <span>{t(lang, 'Record Committee Decision', 'কমিটি সভার সিদ্ধান্ত সংরক্ষণ')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={mDistrict}
                  onChange={(e) => setMDistrict(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs"
                >
                  {BANGLADESH_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={mDate}
                  onChange={(e) => setMDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs font-mono-tabular"
                />
              </div>
              <input
                type="text"
                required
                value={mChair}
                onChange={(e) => setMChair(e.target.value)}
                placeholder="Chairperson name"
                className="w-full px-3 py-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs"
              />
              <input
                type="text"
                required
                value={mAgenda}
                onChange={(e) => setMAgenda(e.target.value)}
                placeholder={t(lang, 'Meeting agenda...', 'সভার আলোচ্য বিষয়...')}
                className="w-full px-3 py-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs"
              />
              <textarea
                rows={3}
                required
                value={mDecisions}
                onChange={(e) => setMDecisions(e.target.value)}
                placeholder={t(lang, 'Key resolutions & directives...', 'গৃহীত সিদ্ধান্ত ও নির্দেশনা...')}
                className="w-full px-3 py-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs"
              />
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs text-slate-500">
                  {t(lang, 'Cases Reviewed:', 'পর্যালোচিত মামলা:')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  value={mCount}
                  onChange={(e) => setMCount(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs font-mono-tabular"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#059669] text-white text-xs font-medium hover:bg-[#047857]"
              >
                <Plus className="w-3.5 h-3.5" />
                {t(lang, 'Save Meeting Minutes', 'কার্যবিবরণী সংরক্ষণ করুন')}
              </button>
            </form>
          )}
        </div>
      )}

      {subTab === 'complaints' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-3">
            {complaints.map((cmp) => (
              <div key={cmp.complaintId} className="p-5 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono-tabular text-slate-500">{cmp.district} {cmp.caseNumber ? `· ${cmp.caseNumber}` : ''}</span>
                  <span className={`font-semibold ${cmp.status === 'resolved' ? 'text-[#046C4E] dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                    {cmp.status.toUpperCase()}
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{cmp.subject}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">{cmp.details}</p>
                {cmp.resolutionNote && (
                  <p className="text-xs text-[#046C4E] dark:text-emerald-400">
                    {t(lang, 'Resolution:', 'সমাধান:')} {cmp.resolutionNote}
                  </p>
                )}
                {isOfficerOrAdmin && cmp.status !== 'resolved' && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={resolutionDrafts[cmp.complaintId] || ''}
                      onChange={(e) => setResolutionDrafts((p) => ({ ...p, [cmp.complaintId]: e.target.value }))}
                      placeholder={t(lang, 'Resolution note...', 'নিষ্পত্তি নোট...')}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleResolveComplaint(cmp, 'resolved')}
                      className="px-3 py-1.5 rounded-lg bg-[#059669] text-white text-xs font-medium hover:bg-[#047857]"
                    >
                      {t(lang, 'Resolve', 'সমাধান করুন')}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {complaints.length === 0 && (
              <div className="p-8 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 text-center text-xs text-slate-500">
                {t(lang, 'No active service complaints or exceptions.', 'কোনো অভিযোগ বা ব্যতিক্রম নথিভুক্ত নেই।')}
              </div>
            )}
          </div>

          <form
            onSubmit={handleAddComplaint}
            className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-4 h-fit"
          >
            <div className="flex items-center gap-2 font-semibold text-sm text-[#064E3B] dark:text-white">
              <MessageSquareWarning className="w-4 h-4 text-amber-600" />
              <span>{t(lang, 'Submit Grievance or Exception', 'অভিযোগ বা ব্যতিক্রম দাখিল করুন')}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={cDistrict}
                onChange={(e) => setCDistrict(e.target.value)}
                className="px-3 py-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs"
              >
                {BANGLADESH_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <input
                type="text"
                value={cCaseNo}
                onChange={(e) => setCCaseNo(e.target.value)}
                placeholder="Case ID (optional)"
                className="px-3 py-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs font-mono-tabular"
              />
            </div>
            <input
              type="text"
              required
              value={cSubject}
              onChange={(e) => setCSubject(e.target.value)}
              placeholder={t(lang, 'Complaint subject...', 'অভিযোগের বিষয়...')}
              className="w-full px-3 py-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs"
            />
            <textarea
              rows={3}
              required
              value={cDetails}
              onChange={(e) => setCDetails(e.target.value)}
              placeholder={t(lang, 'Explain delay or service issue...', 'বিলম্ব বা সেবার সমস্যার বিবরণ...')}
              className="w-full px-3 py-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-2.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium transition-colors"
            >
              {t(lang, 'File Grievance', 'অভিযোগ জমা দিন')}
            </button>
          </form>
        </div>
      )}

      {subTab === 'audit' && (
        <div className="rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-emerald-200/70 dark:border-emerald-900/60 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Shield className="w-4 h-4 text-[#059669]" />
            <span>{t(lang, 'Immutable Real-Time Activity & Security Audit Trail', 'অপরিবর্তনীয় রিয়েল-টাইম অডিট লগ')}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-50/50 dark:bg-[#07120E]/60 text-slate-500 dark:text-slate-400 border-b border-emerald-200/70 dark:border-emerald-900/60">
                <tr>
                  <th className="py-2.5 px-4 font-medium">{t(lang, 'Action', 'কার্যক্রম')}</th>
                  <th className="py-2.5 px-4 font-medium">{t(lang, 'Actor', 'ব্যবহারকারী')}</th>
                  <th className="py-2.5 px-4 font-medium">{t(lang, 'Summary', 'বিবরণ')}</th>
                  <th className="py-2.5 px-4 font-medium">{t(lang, 'Target', 'লক্ষ্য')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-200/60 dark:divide-emerald-900/60">
                {auditLogs.map((log) => (
                  <tr key={log.logId} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30">
                    <td className="py-2.5 px-4 font-mono-tabular font-semibold text-[#059669] dark:text-emerald-400 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {log.actorName} <span className="text-slate-400">({log.actorRole})</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{log.summary}</td>
                    <td className="py-2.5 px-4 font-mono-tabular text-slate-400 whitespace-nowrap">{log.targetPath}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      {t(lang, 'No audit entries logged yet.', 'এখনও কোনো অডিট লগ তৈরি হয়নি।')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'roles' && isAdmin && (
        <div className="rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-emerald-200/70 dark:border-emerald-900/60 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Users className="w-4 h-4 text-[#059669]" />
            <span>{t(lang, 'User Role Assignment (Admin RBAC)', 'ব্যবহারকারীর ভূমিকা নিয়ন্ত্রণ')}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-50/50 dark:bg-[#07120E]/60 text-slate-500 border-b border-emerald-200/70 dark:border-emerald-900/60">
                <tr>
                  <th className="py-2.5 px-4 font-medium">{t(lang, 'User', 'ব্যবহারকারী')}</th>
                  <th className="py-2.5 px-4 font-medium">{t(lang, 'District', 'জেলা')}</th>
                  <th className="py-2.5 px-4 font-medium">{t(lang, 'Current Role', 'বর্তমান ভূমিকা')}</th>
                  <th className="py-2.5 px-4 font-medium">{t(lang, 'Change Role', 'ভূমিকা পরিবর্তন')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-200/60 dark:divide-emerald-900/60">
                {directoryUsers.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">{u.displayName}</td>
                    <td className="py-2.5 px-4 text-slate-500">{u.district}</td>
                    <td className="py-2.5 px-4 font-medium text-[#059669] dark:text-emerald-400">
                      {ROLE_LABELS[u.role]?.[lang] || u.role}
                    </td>
                    <td className="py-2.5 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => updateUserRoleAdmin(u.uid, e.target.value as UserRole, user)}
                        className="px-2.5 py-1.5 rounded-md border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs"
                      >
                        {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r][lang]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
