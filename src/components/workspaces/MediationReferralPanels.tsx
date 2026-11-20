import React, { useState } from 'react';
import { CheckCircle2, ArrowRightLeft, Handshake } from 'lucide-react';
import { MEDIATION_OUTCOME_LABELS, t } from '../../i18n';
import type {
  CaseReferral,
  LanguageCode,
  MediationOutcome,
  MediationSession,
  UserPublic,
} from '../../types';
import { updateMediationSession, updateReferralStatus } from '../../services/legalBdService';
import { fireCelebrationConfetti, fireSubtleMilestoneConfetti } from '../../utils/confetti';

interface MediationPanelProps {
  lang: LanguageCode;
  user: UserPublic;
  mediations: MediationSession[];
  lowBandwidth: boolean;
}

export const MediationPanel: React.FC<MediationPanelProps> = ({
  lang,
  user,
  mediations,
  lowBandwidth,
}) => {
  const [termsDrafts, setTermsDrafts] = useState<Record<string, string>>({});
  const isStaff = ['admin', 'dlao_officer', 'mediator', 'supervisor'].includes(user.role);

  const handleOutcome = async (med: MediationSession, outcome: MediationOutcome) => {
    const terms = termsDrafts[med.mediationId] ?? med.settlementTerms ?? '';
    await updateMediationSession(
      med.mediationId,
      med.caseId,
      med.caseNumber,
      med.citizenUid,
      { outcome, settlementTerms: terms },
      user
    );
    if (outcome === 'settled_amicably') {
      fireCelebrationConfetti(lowBandwidth);
    } else {
      fireSubtleMilestoneConfetti(lowBandwidth);
    }
  };

  const handleConfirmAttendance = async (
    med: MediationSession,
    party: 'applicant' | 'respondent'
  ) => {
    await updateMediationSession(
      med.mediationId,
      med.caseId,
      med.caseNumber,
      med.citizenUid,
      party === 'applicant'
        ? { applicantConfirmed: !med.applicantConfirmed }
        : { respondentConfirmed: !med.respondentConfirmed },
      user
    );
  };

  return (
    <div className="space-y-4">
      {mediations.length === 0 ? (
        <div className="p-10 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 text-center space-y-2">
          <Handshake className="w-8 h-8 mx-auto text-emerald-500/70" />
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {t(lang, 'No Digital Mediation Sessions Scheduled', 'কোনো ডিজিটাল মধ্যস্থতা সেশন নির্ধারিত নেই')}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t(
              lang,
              'Open any case in the DLAO Dashboard to assign a mediator and schedule an ADR session.',
              'ডিএলএও ড্যাশবোর্ড থেকে যেকোনো মামলা খুলে মধ্যস্থতাকারী নিয়োগ করুন।'
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {mediations.map((med) => (
            <div
              key={med.mediationId}
              className="p-6 rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono-tabular text-xs font-semibold text-[#059669] dark:text-emerald-400">
                    {med.caseNumber} · {med.district}
                  </div>
                  <h3 className="font-sans text-base font-semibold text-[#064E3B] dark:text-white mt-0.5">
                    {med.mediatorName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono-tabular">
                    {med.scheduledAt} · {med.mode.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {MEDIATION_OUTCOME_LABELS[med.outcome][lang]}
                </span>
              </div>

              {/* Participation & Availability */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-emerald-200/70 dark:border-emerald-900/60 text-xs">
                <button
                  type="button"
                  disabled={med.outcome === 'settled_amicably'}
                  onClick={() => handleConfirmAttendance(med, 'applicant')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors ${
                    med.applicantConfirmed
                      ? 'border-[#046C4E] bg-emerald-50 dark:bg-emerald-950/40 text-[#046C4E] dark:text-emerald-300'
                      : 'border-emerald-200/70 dark:border-emerald-900/60 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t(lang, 'Applicant Confirmed', 'আবেদনকারী নিশ্চিত')}
                </button>
                {isStaff && (
                  <button
                    type="button"
                    disabled={med.outcome === 'settled_amicably'}
                    onClick={() => handleConfirmAttendance(med, 'respondent')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors ${
                      med.respondentConfirmed
                        ? 'border-[#046C4E] bg-emerald-50 dark:bg-emerald-950/40 text-[#046C4E] dark:text-emerald-300'
                        : 'border-emerald-200/70 dark:border-emerald-900/60 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t(lang, 'Respondent Confirmed', 'প্রতিপক্ষ নিশ্চিত')}
                  </button>
                )}
              </div>

              {med.settlementTerms && (
                <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-[#07120E]/60 text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-semibold block mb-0.5">
                    {t(lang, 'Settlement Agreement:', 'আপস-মীমাংসার শর্তাবলি:')}
                  </span>
                  {med.settlementTerms}
                </div>
              )}

              {isStaff && med.outcome !== 'settled_amicably' && (
                <div className="space-y-3 pt-2 border-t border-emerald-200/70 dark:border-emerald-900/60">
                  <textarea
                    rows={2}
                    value={termsDrafts[med.mediationId] ?? med.settlementTerms ?? ''}
                    onChange={(e) =>
                      setTermsDrafts((prev) => ({ ...prev, [med.mediationId]: e.target.value }))
                    }
                    placeholder={t(
                      lang,
                      'Record settlement terms or mediation outcome note...',
                      'আপস-মীমাংসার শর্তাবলি বা মধ্যস্থতার ফলাফল লিখুন...'
                    )}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 bg-white dark:bg-[#07120E] text-xs"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleOutcome(med, 'settled_amicably')}
                      className="px-3.5 py-2 rounded-lg bg-[#059669] text-white text-xs font-medium hover:bg-[#047857]"
                    >
                      {t(lang, 'Finalize Amicable Settlement', 'সফল মীমাংসা ঘোষণা করুন')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOutcome(med, 'referred_to_court')}
                      className="px-3.5 py-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900/60 text-xs font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      {t(lang, 'Refer to Court', 'আদালতে প্রেরণ')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface ReferralPanelProps {
  lang: LanguageCode;
  user: UserPublic;
  referrals: CaseReferral[];
  lowBandwidth: boolean;
}

export const ReferralPanel: React.FC<ReferralPanelProps> = ({
  lang,
  user,
  referrals,
  lowBandwidth,
}) => {
  const isOfficer = ['admin', 'dlao_officer', 'supervisor'].includes(user.role);

  const handleAction = async (ref: CaseReferral, status: 'accepted' | 'acknowledged' | 'declined') => {
    await updateReferralStatus(
      ref.referralId,
      ref.caseId,
      ref.caseNumber,
      ref.citizenUid,
      ref.toDistrict,
      status,
      user
    );
    if (status === 'accepted') fireSubtleMilestoneConfetti(lowBandwidth);
  };

  return (
    <div className="rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-emerald-200/70 dark:border-emerald-900/60 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
        <ArrowRightLeft className="w-4 h-4 text-[#059669]" />
        <span>{t(lang, 'Inter-District Case Referrals (Unified Case ID Preserved)', 'আন্তঃজেলা মামলা স্থানান্তর তালিকা')}</span>
      </div>
      {referrals.length === 0 ? (
        <div className="p-10 text-center text-xs text-slate-500">
          {t(lang, 'No inter-district referrals active.', 'কোনো আন্তঃজেলা রেফারেল নেই।')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-emerald-50/50 dark:bg-[#07120E]/60 text-slate-500 border-b border-emerald-200/70 dark:border-emerald-900/60">
              <tr>
                <th className="py-3 px-4 font-medium">Case ID</th>
                <th className="py-3 px-4 font-medium">{t(lang, 'Transfer Route', 'স্থানান্তর রুট')}</th>
                <th className="py-3 px-4 font-medium">{t(lang, 'Reason', 'কারণ')}</th>
                <th className="py-3 px-4 font-medium">{t(lang, 'Status', 'অবস্থা')}</th>
                <th className="py-3 px-4 font-medium text-right">{t(lang, 'Action', 'পদক্ষেপ')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-200/60 dark:divide-emerald-900/60">
              {referrals.map((r) => (
                <tr key={r.referralId}>
                  <td className="py-3 px-4 font-mono-tabular font-semibold text-[#059669] dark:text-emerald-400 whitespace-nowrap">
                    {r.caseNumber}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-medium">
                    {r.fromDistrict} → {r.toDistrict}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs">{r.reason}</td>
                  <td className="py-3 px-4 font-semibold uppercase text-amber-700 dark:text-amber-400 whitespace-nowrap">
                    {r.status}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {isOfficer && r.status === 'pending' ? (
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAction(r, 'accepted')}
                          className="px-3 py-1.5 rounded-md bg-[#059669] text-white font-medium hover:bg-[#047857]"
                        >
                          {t(lang, 'Accept', 'গ্রহণ করুন')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(r, 'acknowledged')}
                          className="px-3 py-1.5 rounded-md border border-emerald-200/70 dark:border-emerald-900/60 font-medium"
                        >
                          {t(lang, 'Acknowledge', 'প্রাপ্তি স্বীকার')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400">{r.requestedByName}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
