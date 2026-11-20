import React, { useEffect, useState } from 'react';
import {
  PhoneCall,
  Hash,
  X,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Delete,
  Signal,
  BatteryCharging,
} from 'lucide-react';
import { BANGLADESH_DISTRICTS, CATEGORY_LABELS, STATUS_LABELS, t } from '../i18n';
import type { LanguageCode, LegalCategory, UserPublic } from '../types';
import { createLegalCase, lookupPublicCaseStatus } from '../services/legalBdService';
import { fireCelebrationConfetti } from '../utils/confetti';

interface UssdHelplineModalProps {
  open: boolean;
  initialMode: 'ussd' | 'helpline';
  lang: LanguageCode;
  user: UserPublic | null;
  lowBandwidth: boolean;
  onClose: () => void;
  onRequireAuth: () => void;
  onCaseCreated: (caseNumber: string) => void;
}

type PhoneScreen = 'dialer' | 'menu' | 'category' | 'track' | 'voice_call' | 'done';

const KEYPAD_BUTTONS = [
  { key: '1', sub: '' },
  { key: '2', sub: 'ABC' },
  { key: '3', sub: 'DEF' },
  { key: '4', sub: 'GHI' },
  { key: '5', sub: 'JKL' },
  { key: '6', sub: 'MNO' },
  { key: '7', sub: 'PQRS' },
  { key: '8', sub: 'TUV' },
  { key: '9', sub: 'WXYZ' },
  { key: '*', sub: '+' },
  { key: '0', sub: '␣' },
  { key: '#', sub: '⇧' },
];

export const UssdHelplineModal: React.FC<UssdHelplineModalProps> = ({
  open,
  initialMode,
  lang,
  user,
  lowBandwidth,
  onClose,
  onRequireAuth,
  onCaseCreated,
}) => {
  const [mode, setMode] = useState<'ussd' | 'helpline'>(initialMode);
  const [phoneScreen, setPhoneScreen] = useState<PhoneScreen>('dialer');
  const [dialBuffer, setDialBuffer] = useState('*16699#');
  const [ussdNotice, setUssdNotice] = useState<string | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);

  const [trackQuery, setTrackQuery] = useState('LBD-2026-1042');
  const [trackResult, setTrackResult] = useState<string | null>(null);

  const [callerName, setCallerName] = useState(user?.displayName || '');
  const [district, setDistrict] = useState(user?.district || 'Dhaka');
  const [category, setCategory] = useState<LegalCategory>('family_maintenance');
  const [summary, setSummary] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdCaseNo, setCreatedCaseNo] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setPhoneScreen(initialMode === 'helpline' ? 'voice_call' : 'menu');
      setDialBuffer(initialMode === 'helpline' ? '16699' : '*16699#');
      setUssdNotice(null);
      setTrackResult(null);
      setCreatedCaseNo(null);
      setErrorMsg(null);
      setEmergency(false);
      setCallSeconds(0);
      setCallerName(user?.displayName || '');
      if (user?.district) setDistrict(user.district);
    }
  }, [open, initialMode, user?.displayName, user?.district]);

  useEffect(() => {
    if (!open || phoneScreen !== 'voice_call') return;
    const interval = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [open, phoneScreen]);

  if (!open) return null;

  const formatTimer = (sec: number) => {
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handlePhysicalKey = (key: string) => {
    setUssdNotice(null);

    if (phoneScreen === 'dialer') {
      setDialBuffer((prev) => (prev.length < 16 ? `${prev}${key}` : prev));
      return;
    }

    if (phoneScreen === 'menu') {
      if (key === '1') {
        setMode('ussd');
        setPhoneScreen('category');
      } else if (key === '2') {
        setPhoneScreen('track');
      } else if (key === '3') {
        setMode('helpline');
        setEmergency(true);
        setCallSeconds(0);
        setPhoneScreen('voice_call');
      } else {
        setUssdNotice(t(lang, 'Press 1, 2, or 3 on the keypad.', 'কীপ্যাডে ১, ২ অথবা ৩ চাপুন।'));
      }
      return;
    }

    if (phoneScreen === 'category') {
      const catMap: Record<string, LegalCategory> = {
        '1': 'family_maintenance',
        '2': 'domestic_violence',
        '3': 'land_property',
        '4': 'labor_wages',
      };
      if (catMap[key]) {
        setCategory(catMap[key]);
        if (key === '2') setEmergency(true);
        setUssdNotice(
          t(
            lang,
            `Selected: ${CATEGORY_LABELS[catMap[key]].en}. Complete & submit right panel.`,
            `নির্বাচিত: ${CATEGORY_LABELS[catMap[key]].bn}। ডান পাশের ফর্ম থেকে জমা দিন।`
          )
        );
      } else {
        setUssdNotice(t(lang, 'Press 1–4 to pick category.', 'বিভাগ বাছাই করতে ১–৪ চাপুন।'));
      }
      return;
    }

    if (phoneScreen === 'track') {
      if (/[0-9]/.test(key)) {
        setTrackQuery((prev) => (prev.length < 18 ? `${prev}${key}` : prev));
      }
    }
  };

  const handlePhoneCallButton = async () => {
    setUssdNotice(null);
    if (phoneScreen === 'dialer') {
      const code = dialBuffer.trim();
      if (code === '*16699#' || code.startsWith('*16699')) {
        setMode('ussd');
        setPhoneScreen('menu');
      } else if (code === '16699') {
        setMode('helpline');
        setCallSeconds(0);
        setPhoneScreen('voice_call');
      } else {
        setUssdNotice(
          t(
            lang,
            'Dial *16699# (USSD) or 16699 (Helpline) and press CALL.',
            '*16699# অথবা 16699 ডায়াল করে CALL চাপুন।'
          )
        );
      }
      return;
    }

    if (phoneScreen === 'track') {
      try {
        const res = await lookupPublicCaseStatus(trackQuery);
        if (!res) {
          setTrackResult(t(lang, 'No record found for that Case ID.', 'এই কেস আইডির কোনো তথ্য পাওয়া যায়নি।'));
        } else {
          setTrackResult(`${res.caseNumber} · ${res.district} · ${STATUS_LABELS[res.status]?.[lang] || res.status}`);
        }
      } catch {
        setTrackResult(t(lang, 'Unable to fetch status right now.', 'এই মুহূর্তে তথ্য যাচাই করা যায়নি।'));
      }
    }
  };

  const handlePhoneEndOrBack = () => {
    setUssdNotice(null);
    if (phoneScreen === 'dialer') {
      setDialBuffer('');
    } else if (phoneScreen === 'menu' || phoneScreen === 'voice_call') {
      setPhoneScreen('dialer');
      setDialBuffer('');
    } else {
      setPhoneScreen('menu');
    }
  };

  const handleBackspace = () => {
    if (phoneScreen === 'dialer') {
      setDialBuffer((prev) => prev.slice(0, -1));
    } else if (phoneScreen === 'track') {
      setTrackQuery((prev) => prev.slice(0, -1));
    }
  };

  const handleSubmitChannelCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!user) {
      onRequireAuth();
      return;
    }
    if (summary.trim().length < 8) {
      setErrorMsg(
        t(
          lang,
          'Please provide a brief description (at least 8 characters).',
          'অনুগ্রহ করে সংক্ষিপ্ত বিবরণ দিন (কমপক্ষে ৮ অক্ষর)।'
        )
      );
      return;
    }
    setSubmitting(true);
    try {
      const result = await createLegalCase(
        {
          citizenName: callerName.trim() || user.displayName,
          consentGiven: true,
          channel: mode === 'ussd' ? 'ussd_16699' : 'helpline_16699',
          district,
          upazila: `${district} Sadar`,
          category,
          title:
            mode === 'ussd'
              ? `USSD *16699# Intake: ${CATEGORY_LABELS[category].en}`
              : `16699 Helpline Call: ${CATEGORY_LABELS[category].en}`,
          description: summary.trim(),
          priority: emergency ? 'critical' : 'high',
          emergencyFlag: emergency,
          submittedDocs: [],
          requiredDocs: ['National ID (NID) / Birth Certificate', 'Union Parishad / Ward Income Certificate'],
        },
        user
      );
      setCreatedCaseNo(result.caseNumber);
      setPhoneScreen('done');
      fireCelebrationConfetti(lowBandwidth);
      onCaseCreated(result.caseNumber);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to log intake.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl my-auto bg-white dark:bg-[#0D1B16] border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-[#07120E]">
          <div className="flex items-center gap-1 p-1 bg-emerald-100/70 dark:bg-emerald-950/70 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('ussd');
                setDialBuffer('*16699#');
                setPhoneScreen('menu');
                setCreatedCaseNo(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'ussd'
                  ? 'bg-white dark:bg-[#0D1B16] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Hash className="w-3.5 h-3.5 text-[#059669] dark:text-[#6EE7B7]" />
              USSD *16699#
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('helpline');
                setDialBuffer('16699');
                setCallSeconds(0);
                setPhoneScreen('voice_call');
                setCreatedCaseNo(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'helpline'
                  ? 'bg-white dark:bg-[#0D1B16] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#059669] dark:text-[#6EE7B7]" />
              Helpline 16699
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-emerald-100/60 dark:hover:bg-emerald-950 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-h-[82vh] overflow-y-auto">
          {/* Left Column: Manual Interactive Button Phone (9:16 Feature Phone Keypad) */}
          <div className="lg:col-span-5 flex flex-col items-center space-y-3">
            <div className="w-full max-w-[270px] rounded-[1.85rem] bg-gradient-to-b from-[#0F2E24] via-[#071D16] to-[#04120D] p-3 border-2 border-emerald-900/80 shadow-xl flex flex-col gap-2.5">
              {/* Earpiece */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-1 rounded-full bg-emerald-900" />
                <span className="text-[9px] font-semibold tracking-[0.2em] text-emerald-200/70 uppercase">
                  JurisConnect Keypad
                </span>
              </div>

              {/* Interactive LCD Screen */}
              <div className="h-[196px] rounded-xl bg-[#041C14] border-2 border-emerald-950 p-3 flex flex-col justify-between text-slate-100 font-mono-tabular shadow-inner">
                <div className="flex items-center justify-between text-[10px] text-emerald-300">
                  <span className="inline-flex items-center gap-1">
                    <Signal className="w-2.5 h-2.5" />
                    {phoneScreen === 'voice_call' ? '16699 VOICE' : '*16699# USSD'}
                  </span>
                  <BatteryCharging className="w-3 h-3 text-emerald-400" />
                </div>

                {phoneScreen === 'dialer' && (
                  <div className="my-auto space-y-2">
                    <div className="text-[10px] text-slate-400">
                      {t(lang, 'Dial *16699# or 16699', '*16699# বা 16699 ডায়াল করুন')}
                    </div>
                    <div className="text-xl font-bold tracking-wider text-white min-h-[28px] break-all">
                      {dialBuffer || '_'}
                    </div>
                    {ussdNotice && <div className="text-[10px] text-amber-300 leading-tight">{ussdNotice}</div>}
                  </div>
                )}

                {phoneScreen === 'menu' && (
                  <div className="my-auto space-y-1 text-[11px] leading-snug">
                    <div className="text-[#6EE7B7] font-bold">JurisConnect National Aid</div>
                    <button
                      type="button"
                      onClick={() => handlePhysicalKey('1')}
                      className="block w-full text-left hover:text-[#6EE7B7]"
                    >
                      1. Apply Free Legal Aid
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePhysicalKey('2')}
                      className="block w-full text-left hover:text-[#6EE7B7]"
                    >
                      2. Track Case Status by ID
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePhysicalKey('3')}
                      className="block w-full text-left hover:text-amber-300"
                    >
                      3. Emergency Helpline 16699
                    </button>
                    {ussdNotice && <div className="text-[10px] text-amber-300 pt-1">{ussdNotice}</div>}
                  </div>
                )}

                {phoneScreen === 'category' && (
                  <div className="my-auto space-y-1 text-[11px] leading-snug">
                    <div className="text-[#6EE7B7] font-bold">Select Legal Issue (1-4):</div>
                    <button type="button" onClick={() => handlePhysicalKey('1')} className="block w-full text-left hover:text-[#6EE7B7]">
                      1. Family & Maintenance
                    </button>
                    <button type="button" onClick={() => handlePhysicalKey('2')} className="block w-full text-left hover:text-[#6EE7B7]">
                      2. Domestic Protection
                    </button>
                    <button type="button" onClick={() => handlePhysicalKey('3')} className="block w-full text-left hover:text-[#6EE7B7]">
                      3. Land & Property
                    </button>
                    <button type="button" onClick={() => handlePhysicalKey('4')} className="block w-full text-left hover:text-[#6EE7B7]">
                      4. Labor & Wages
                    </button>
                    {ussdNotice && <div className="text-[10px] text-emerald-300 pt-1 leading-tight">{ussdNotice}</div>}
                  </div>
                )}

                {phoneScreen === 'track' && (
                  <div className="my-auto space-y-1.5 text-[11px]">
                    <div className="text-[#6EE7B7] font-bold">Enter Case ID & Press CALL:</div>
                    <input
                      type="text"
                      value={trackQuery}
                      onChange={(e) => setTrackQuery(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-emerald-950/70 border border-emerald-800 text-xs text-white focus:outline-none focus:border-[#34D399]"
                    />
                    {trackResult && <div className="text-[10px] text-amber-300 leading-snug">{trackResult}</div>}
                  </div>
                )}

                {phoneScreen === 'voice_call' && (
                  <div className="my-auto space-y-1.5 text-center">
                    <div className="text-xs font-bold text-amber-300">HELPLINE 16699 ACTIVE</div>
                    <div className="text-lg font-bold text-white">{formatTimer(callSeconds)}</div>
                    <div className="text-[10px] text-slate-300">
                      {t(lang, 'Connected to Bangla Legal Aid Desk', 'বাংলা আইনি সহায়তা ডেস্কে সংযুক্ত')}
                    </div>
                  </div>
                )}

                {phoneScreen === 'done' && (
                  <div className="my-auto space-y-1 text-center">
                    <div className="text-xs font-bold text-emerald-400">CASE REGISTERED</div>
                    <div className="text-sm font-bold text-white">{createdCaseNo}</div>
                    <div className="text-[10px] text-slate-300">Synced with DLAO Queue</div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-emerald-900/70 text-[10px] text-slate-300">
                  <button
                    type="button"
                    onClick={handlePhoneCallButton}
                    className="text-[#6EE7B7] hover:text-white font-semibold"
                  >
                    {phoneScreen === 'track' ? 'Lookup' : phoneScreen === 'dialer' ? 'Call' : 'Select'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePhoneEndOrBack}
                    className="text-slate-400 hover:text-white"
                  >
                    {phoneScreen === 'dialer' ? 'Clear' : 'Back'}
                  </button>
                </div>
              </div>

              {/* Action Soft Keys (CALL / DEL / END) */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={handlePhoneCallButton}
                  className="h-8 rounded-lg bg-[#059669] hover:bg-[#10B981] active:scale-95 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <PhoneCall className="w-3 h-3" />
                  CALL
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-8 rounded-lg bg-emerald-950 hover:bg-emerald-900 active:scale-95 text-slate-200 text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <Delete className="w-3 h-3" />
                  DEL
                </button>
                <button
                  type="button"
                  onClick={handlePhoneEndOrBack}
                  className="h-8 rounded-lg bg-red-700/80 hover:bg-red-600 active:scale-95 text-white text-[10px] font-bold flex items-center justify-center transition-all"
                >
                  END/CLR
                </button>
              </div>

              {/* Physical T9 Numeric Keypad */}
              <div className="grid grid-cols-3 gap-1.5">
                {KEYPAD_BUTTONS.map((btn) => (
                  <button
                    key={btn.key}
                    type="button"
                    onClick={() => handlePhysicalKey(btn.key)}
                    className="h-9 rounded-lg bg-emerald-950/80 hover:bg-[#059669] active:scale-95 border border-emerald-900/80 text-slate-100 flex items-center justify-center gap-1 font-mono-tabular transition-all"
                  >
                    <span className="text-xs font-bold">{btn.key}</span>
                    {btn.sub && <span className="text-[8px] text-emerald-200/60">{btn.sub}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Preset Shortcuts */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setDialBuffer('*16699#');
                  setPhoneScreen('dialer');
                }}
                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-emerald-900/60 text-slate-700 dark:text-slate-300 hover:border-[#059669]"
              >
                Dial *16699#
              </button>
              <button
                type="button"
                onClick={() => {
                  setDialBuffer('16699');
                  setPhoneScreen('dialer');
                }}
                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-emerald-900/60 text-slate-700 dark:text-slate-300 hover:border-[#059669]"
              >
                Dial 16699
              </button>
              <button
                type="button"
                onClick={() => setPhoneScreen('track')}
                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-emerald-900/60 text-slate-700 dark:text-slate-300 hover:border-[#059669]"
              >
                Track Case ID
              </button>
            </div>
          </div>

          {/* Right Column: Live Case Intake & Sync Panel */}
          <div className="lg:col-span-7">
            {createdCaseNo ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#059669] dark:text-[#6EE7B7] flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-sans text-xl font-semibold text-slate-900 dark:text-white">
                  {t(lang, 'Case Registered in Real Time', 'মামলা তাৎক্ষণিকভাবে নিবন্ধিত হয়েছে')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t(lang, 'Unified Case ID assigned:', 'সমন্বিত কেস আইডি:')}
                </p>
                <div className="inline-block px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 font-mono-tabular text-base font-semibold text-[#059669] dark:text-[#6EE7B7]">
                  {createdCaseNo}
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-lg bg-[#059669] text-white text-sm font-medium hover:bg-[#047857] transition-colors"
                  >
                    {t(lang, 'Done', 'সম্পন্ন')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitChannelCase} className="space-y-4">
                <div>
                  <h3 className="font-sans text-lg font-semibold text-slate-900 dark:text-white">
                    {mode === 'ussd'
                      ? t(lang, 'USSD *16699# Offline Intake Sync', 'ইউএসএসডি *১৬৬৯৯# রিয়েল-টাইম নিবন্ধন')
                      : t(lang, '16699 Voice Helpline Call Intake', '১৬৬৯৯ ভয়েস হেল্পলাইন কল নিবন্ধন')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t(
                      lang,
                      'Test dialing on the button phone keypad on the left, or submit a live intake synced directly to your District Legal Aid Office queue.',
                      'বাম পাশের বাটন ফোন কীপ্যাড ব্যবহার করে পরীক্ষা করুন অথবা সরাসরি জেলা লিগ্যাল এইড অফিসে মামলা দাখিল করুন।'
                    )}
                  </p>
                </div>

                {emergency && (
                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>
                      {t(
                        lang,
                        'Priority Emergency Intake flagged for immediate DLAO officer triage.',
                        'জরুরি অগ্রাধিকার আবেদন হিসেবে ডিএলএও অফিসারের কাছে পাঠানো হবে।'
                      )}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {t(lang, 'Citizen Name', 'আবেদনকারীর নাম')}
                    </label>
                    <input
                      type="text"
                      required
                      value={callerName}
                      onChange={(e) => setCallerName(e.target.value)}
                      placeholder={t(lang, 'Full name', 'পূর্ণ নাম')}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {t(lang, 'District', 'জেলা')}
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    >
                      {BANGLADESH_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t(lang, 'Legal Issue Category (synced with keypad)', 'আইনি সমস্যার ধরন')}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as LegalCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    {(Object.keys(CATEGORY_LABELS) as LegalCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat][lang]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t(lang, 'Brief Summary / Call Notes', 'সংক্ষিপ্ত বিবরণ / কল নোট')}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder={t(
                      lang,
                      'Describe the urgent legal need or dispute in Bangla or English...',
                      'বাংলা বা ইংরেজিতে জরুরি আইনি সহায়তা বা বিরোধের সংক্ষিপ্ত বিবরণ লিখুন...'
                    )}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emergency}
                    onChange={(e) => setEmergency(e.target.checked)}
                    className="rounded border-slate-300 text-[#059669] focus:ring-[#10B981]"
                  />
                  <span>
                    {t(lang, 'Mark as Emergency / Immediate Safety Risk', 'জরুরি / তাৎক্ষণিক নিরাপত্তা ঝুঁকি হিসেবে চিহ্নিত করুন')}
                  </span>
                </label>

                {errorMsg && <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">Toll-Free 16699 · *16699#</span>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#059669] text-white text-sm font-medium hover:bg-[#047857] disabled:opacity-50 transition-colors"
                  >
                    {submitting
                      ? t(lang, 'Submitting...', 'জমা হচ্ছে...')
                      : user
                      ? t(lang, 'Log Real-Time Case', 'রিয়েল-টাইম মামলা দাখিল করুন')
                      : t(lang, 'Sign In & Submit', 'সাইন ইন করে জমা দিন')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
