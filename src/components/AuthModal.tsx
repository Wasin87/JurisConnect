import React, { useEffect, useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Briefcase,
  Languages,
  Sun,
  Moon,
  Scale,
  UserPlus,
} from 'lucide-react';
import { BANGLADESH_DISTRICTS, ROLE_LABELS, t } from '../i18n';
import type { LanguageCode, UserPublic, UserRole } from '../types';
import { BangladeshJusticeSeal, JurisConnectCrest } from './BrandEmblems';
import {
  mapFirebaseAuthError,
  registerWithEmailRole,
  resetPasswordByEmail,
  signInWithEmailRole,
  signInWithGoogleRole,
  type OperationalRole,
} from '../services/legalBdService';

export type AuthModalMode = 'signin' | 'signup';

interface AuthCardProps {
  mode: AuthModalMode;
  onModeChange: (nextMode: AuthModalMode) => void;
  initialRole?: OperationalRole;
  lang: LanguageCode;
  onClose?: () => void;
  onAuthenticated: (profile: UserPublic, targetTab?: string) => void;
  showCloseButton?: boolean;
}

interface AuthModalProps {
  open: boolean;
  initialMode?: AuthModalMode;
  initialRole?: OperationalRole;
  lang: LanguageCode;
  onClose: () => void;
  onAuthenticated: (profile: UserPublic, targetTab?: string) => void;
}

interface AuthPageViewProps {
  mode: AuthModalMode;
  onModeChange: (nextMode: AuthModalMode) => void;
  initialRole?: OperationalRole;
  lang: LanguageCode;
  dark: boolean;
  onToggleLang: () => void;
  onToggleDark: () => void;
  onBackHome: () => void;
  onAuthenticated: (profile: UserPublic, targetTab?: string) => void;
}

const ROLE_OPTIONS: Array<{
  value: OperationalRole;
  hintEn: string;
  hintBn: string;
}> = [
  {
    value: 'citizen',
    hintEn: 'Submit legal aid applications, track hearings, and message counsel.',
    hintBn: 'আইনি সহায়তার আবেদন করুন, শুনানির তারিখ দেখুন এবং বার্তা পাঠান।',
  },
  {
    value: 'dlao_officer',
    hintEn: 'Review citizen eligibility, verify AI triage, and assign panel lawyers.',
    hintBn: 'আবেদনের যোগ্যতা যাচাই, এআই বিশ্লেষণ অনুমোদন এবং আইনজীবী নিয়োগ করুন।',
  },
  {
    value: 'panel_lawyer',
    hintEn: 'Manage assigned cases, update hearing dates, and submit progress.',
    hintBn: 'নিয়োগকৃত মামলা পরিচালনা, শুনানির তারিখ ও অগ্রগতি আপডেট করুন।',
  },
  {
    value: 'mediator',
    hintEn: 'Coordinate digital/hybrid ADR sessions and record settlement terms.',
    hintBn: 'ডিজিটাল বা সরাসরি মধ্যস্থতা সেশন পরিচালনা এবং আপস নথিভুক্ত করুন।',
  },
  {
    value: 'supervisor',
    hintEn: 'Oversee district metrics, committee minutes, complaints, and audit logs.',
    hintBn: 'জেলা পর্যায়ের তদারকি, কমিটির সভা, অভিযোগ ও অডিট লগ পর্যবেক্ষণ করুন।',
  },
];

export function getWorkspaceTabForRole(role: UserRole): string {
  switch (role) {
    case 'dlao_officer':
      return 'dlao';
    case 'panel_lawyer':
      return 'lawyer';
    case 'mediator':
      return 'mediation';
    case 'supervisor':
    case 'admin':
      return 'supervisory';
    case 'citizen':
    default:
      return 'citizen';
  }
}

const AuthFormCard: React.FC<AuthCardProps> = ({
  mode,
  onModeChange,
  initialRole = 'citizen',
  lang,
  onClose,
  onAuthenticated,
  showCloseButton = false,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<OperationalRole>(initialRole);
  const [district, setDistrict] = useState('Dhaka');
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  useEffect(() => {
    setErrorMsg(null);
    setInfoMsg(null);
    setPassword('');
  }, [mode]);

  const selectedRoleMeta = ROLE_OPTIONS.find((r) => r.value === role) || ROLE_OPTIONS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg(t(lang, 'Please enter a valid email address.', 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন।'));
      return;
    }

    if (mode === 'signup' && trimmedName.length < 2) {
      setErrorMsg(t(lang, 'Please enter your full name (at least 2 characters).', 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন (কমপক্ষে ২ অক্ষর)।'));
      return;
    }

    if (password.length < 6) {
      setErrorMsg(t(lang, 'Password must be at least 6 characters long.', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'));
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const profile = await registerWithEmailRole({
          name: trimmedName,
          email: trimmedEmail,
          password,
          role,
          district,
          preferredLanguage: lang,
        });
        onAuthenticated(profile, getWorkspaceTabForRole(profile.role));
      } else {
        const profile = await signInWithEmailRole({
          name: trimmedName,
          email: trimmedEmail,
          password,
          role,
          preferredLanguage: lang,
        });
        const targetTab =
          profile.role === 'admin' ? getWorkspaceTabForRole(role) : getWorkspaceTabForRole(profile.role);
        onAuthenticated(profile, targetTab);
      }
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err, lang));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setGoogleBusy(true);
    try {
      const profile = await signInWithGoogleRole({
        name: name.trim() || undefined,
        role,
        district,
        preferredLanguage: lang,
      });
      const targetTab =
        profile.role === 'admin' ? getWorkspaceTabForRole(role) : getWorkspaceTabForRole(profile.role);
      onAuthenticated(profile, targetTab);
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err, lang));
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg(
        t(
          lang,
          'Enter your registered email address first, then click Forgot Password.',
          'পাসওয়ার্ড রিসেট করতে প্রথমে আপনার নিবন্ধিত ইমেইল লিখুন।'
        )
      );
      return;
    }
    setResetBusy(true);
    try {
      await resetPasswordByEmail(trimmedEmail);
      setInfoMsg(
        t(
          lang,
          `Password reset link sent to ${trimmedEmail}. Check your inbox or spam folder.`,
          `${trimmedEmail} ঠিকানায় পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স দেখুন।`
        )
      );
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err, lang));
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="relative w-full rounded-2xl bg-white dark:bg-[#0D1B16] border border-emerald-200/80 dark:border-emerald-900/70 shadow-xl overflow-hidden">
      {/* Top Mint Accent Strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#047857] via-[#10B981] to-[#34D399]" />

      {/* Card Header */}
      <div className="px-6 pt-5 pb-4 border-b border-emerald-100 dark:border-emerald-900/60 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <JurisConnectCrest size={36} className="shrink-0" />
          <div>
            <h2
              id="auth-modal-title"
              className="font-sans text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-snug"
            >
              {mode === 'signin'
                ? t(lang, 'Sign In to JurisConnect', 'JurisConnect-এ সাইন ইন করুন')
                : t(lang, 'Create JurisConnect Account', 'নতুন অ্যাকাউন্ট তৈরি করুন (সাইন আপ)')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {mode === 'signin'
                ? t(
                    lang,
                    'Sign in with your Name, Email, Password, and Role',
                    'আপনার নাম, ইমেইল, পাসওয়ার্ড এবং রোল দিয়ে সাইন ইন করুন'
                  )
                : t(
                    lang,
                    'Register with your Name, Email, Password, and Institutional Role',
                    'নাম, ইমেইল, পাসওয়ার্ড এবং আপনার নির্ধারিত রোল দিয়ে নিবন্ধন করুন'
                  )}
            </p>
          </div>
        </div>
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={busy || googleBusy}
            aria-label={t(lang, 'Close authentication dialog', 'বন্ধ করুন')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/70 text-xs text-red-700 dark:text-red-300 flex items-start gap-2 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-xs text-[#065F46] dark:text-[#6EE7B7] flex items-start gap-2 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Name Input */}
        <div className="space-y-1.5">
          <label
            htmlFor={`auth-name-${mode}`}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            {t(lang, 'Full Name', 'পূর্ণ নাম')}{' '}
            {mode === 'signup' ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-slate-400 font-normal">
                {t(lang, '(Profile Display Name)', '(প্রোফাইলের নাম)')}
              </span>
            )}
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id={`auth-name-${mode}`}
              type="text"
              autoComplete="name"
              required={mode === 'signup'}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(lang, 'e.g. Rahima Begum / Adv. Farhana', 'যেমন: রহিমা বেগম / অ্যাড. ফারহানা')}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-emerald-200/90 dark:border-emerald-900/70 bg-emerald-50/20 dark:bg-[#07120E] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
            />
          </div>
        </div>

        {/* Email Input */}
        <div className="space-y-1.5">
          <label
            htmlFor={`auth-email-${mode}`}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            {t(lang, 'Email Address', 'ইমেইল ঠিকানা')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id={`auth-email-${mode}`}
              type="email"
              autoComplete="email"
              required
              maxLength={160}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-emerald-200/90 dark:border-emerald-900/70 bg-emerald-50/20 dark:bg-[#07120E] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`auth-password-${mode}`}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              {t(lang, 'Password', 'পাসওয়ার্ড')} <span className="text-red-500">*</span>
            </label>
            {mode === 'signin' && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetBusy || busy}
                className="text-[11px] font-medium text-[#059669] dark:text-[#6EE7B7] hover:underline disabled:opacity-50"
              >
                {resetBusy
                  ? t(lang, 'Sending...', 'পাঠানো হচ্ছে...')
                  : t(lang, 'Forgot password?', 'পাসওয়ার্ড ভুলে গেছেন?')}
              </button>
            )}
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id={`auth-password-${mode}`}
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(lang, 'Minimum 6 characters', 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড')}
              className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-emerald-200/90 dark:border-emerald-900/70 bg-emerald-50/20 dark:bg-[#07120E] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Role Selector Input */}
        <div className="space-y-1.5">
          <label
            htmlFor={`auth-role-${mode}`}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            {t(lang, 'Account Role', 'অ্যাকাউন্ট রোল (ভূমিকা)')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Briefcase className="w-4 h-4 text-[#059669] dark:text-[#6EE7B7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id={`auth-role-${mode}`}
              value={role}
              onChange={(e) => setRole(e.target.value as OperationalRole)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-emerald-200/90 dark:border-emerald-900/70 bg-emerald-50/20 dark:bg-[#07120E] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {ROLE_LABELS[opt.value][lang]}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {lang === 'bn' ? selectedRoleMeta.hintBn : selectedRoleMeta.hintEn}
          </p>
        </div>

        {/* District Input (Registration only) */}
        {mode === 'signup' && (
          <div className="space-y-1.5">
            <label
              htmlFor="auth-district"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              {t(lang, 'Primary District (Bangladesh)', 'জেলা নির্বাচন করুন')}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="auth-district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-emerald-200/90 dark:border-emerald-900/70 bg-emerald-50/20 dark:bg-[#07120E] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
              >
                {BANGLADESH_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Primary Submit Button */}
        <button
          type="submit"
          disabled={busy || googleBusy}
          className="w-full py-2.5 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 shadow-sm"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-[#A7F3D0]" />
          )}
          <span>
            {mode === 'signin'
              ? busy
                ? t(lang, 'Signing in...', 'সাইন ইন হচ্ছে...')
                : t(lang, 'Sign In', 'সাইন ইন করুন')
              : busy
                ? t(lang, 'Creating account...', 'অ্যাকাউন্ট তৈরি হচ্ছে...')
                : t(lang, 'Create Account (Sign Up)', 'সাইন আপ সম্পন্ন করুন')}
          </span>
          {!busy && <ArrowRight className="w-4 h-4" />}
        </button>

        {/* Divider */}
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-emerald-100 dark:border-emerald-900/60" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
            <span className="px-2.5 bg-white dark:bg-[#0D1B16] text-slate-400">
              {t(lang, 'or continue with', 'অথবা')}
            </span>
          </div>
        </div>

        {/* Secondary Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={busy || googleBusy}
          className="w-full py-2.5 px-4 rounded-lg border border-emerald-200/90 dark:border-emerald-900/70 bg-white dark:bg-[#07120E] hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors disabled:opacity-60"
        >
          {googleBusy ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#059669]" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
          )}
          <span>{t(lang, 'Continue with Google', 'Google অ্যাকাউন্ট দিয়ে চালিয়ে যান')}</span>
        </button>

        {/* Bottom Switcher Button (Sign In Page <-> Sign Up Page) */}
        <div className="pt-3 border-t border-emerald-100 dark:border-emerald-900/60 space-y-2.5 text-center">
          {mode === 'signin' ? (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(lang, "Don't have an account yet?", 'এখনো অ্যাকাউন্ট সাইন আপ করা না থাকলে নিচের বাটনে ক্লিক করুন')}
              </p>
              <button
                type="button"
                onClick={() => onModeChange('signup')}
                className="w-full py-2.5 px-4 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 text-[#047857] dark:text-[#6EE7B7] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t(lang, 'Sign Up (Create New Account)', 'সাইন আপ পেজে যান (রেজিস্ট্রেশন)')}</span>
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(lang, 'Already registered with JurisConnect?', 'ইতিমধ্যেই আপনার অ্যাকাউন্ট রয়েছে?')}
              </p>
              <button
                type="button"
                onClick={() => onModeChange('signin')}
                className="w-full py-2.5 px-4 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 text-[#047857] dark:text-[#6EE7B7] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t(lang, 'Back to Sign In', 'সাইন ইন পেজে ফিরে যান')}</span>
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export const AuthPageView: React.FC<AuthPageViewProps> = ({
  mode,
  onModeChange,
  initialRole = 'citizen',
  lang,
  dark,
  onToggleLang,
  onToggleDark,
  onBackHome,
  onAuthenticated,
}) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [mode]);

  return (
    <div className="min-h-screen bg-[#F6FAF8] dark:bg-[#07120E] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Auth Page Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#07120E]/95 backdrop-blur-md border-b border-emerald-200/70 dark:border-emerald-900/60">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2.5 shrink-0 whitespace-nowrap group"
          >
            <JurisConnectCrest size={30} />
            <span className="font-sans text-lg font-bold tracking-tight text-[#064E3B] dark:text-[#A7F3D0]">
              JurisConnect
            </span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleLang}
              aria-label={lang === 'en' ? 'Switch to Bengali' : 'Switch to English'}
              className="w-9 h-9 rounded-lg border border-emerald-200/80 dark:border-emerald-900/70 bg-white dark:bg-[#0D1B16] text-slate-700 dark:text-slate-200 hover:border-[#10B981] hover:text-[#059669] dark:hover:text-[#6EE7B7] flex items-center justify-center transition-colors"
            >
              <Languages className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleDark}
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="w-9 h-9 rounded-lg border border-emerald-200/80 dark:border-emerald-900/70 bg-white dark:bg-[#0D1B16] text-slate-700 dark:text-slate-200 hover:border-[#10B981] hover:text-[#059669] dark:hover:text-[#6EE7B7] flex items-center justify-center transition-colors"
            >
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-200/80 dark:border-emerald-900/70 bg-white dark:bg-[#0D1B16] text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#10B981] hover:text-[#059669] dark:hover:text-[#6EE7B7] transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t(lang, 'Back to Home', 'মূল পাতায় ফিরুন')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Institutional Layout */}
      <main className="flex-1 max-w-[1160px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Institutional Context Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2.5 text-xs font-semibold text-[#059669] dark:text-[#6EE7B7]">
              <BangladeshJusticeSeal size={26} />
              <span>
                {mode === 'signin'
                  ? t(lang, 'AUTHORIZED ACCESS PORTAL', 'অনুমোদিত প্রবেশ পোর্টাল')
                  : t(lang, 'NEW USER REGISTRATION', 'নতুন ব্যবহারকারী নিবন্ধন')}
              </span>
            </div>

            <h1 className="font-sans text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
              {mode === 'signin'
                ? t(
                    lang,
                    'Access your JurisConnect legal-aid workspace.',
                    'আপনার JurisConnect আইনি সহায়তা পোর্টালে প্রবেশ করুন।'
                  )
                : t(
                    lang,
                    'Register your role across 64 districts of Bangladesh.',
                    'বাংলাদেশের ৬৪ জেলায় আপনার রোল অনুযায়ী অ্যাকাউন্ট তৈরি করুন।'
                  )}
            </h1>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t(
                lang,
                'JurisConnect connects citizens seeking free legal aid with District Legal Aid Offices (DLAO), panel advocates, ADR mediators, and supervisory committees under strict Firebase security & PII isolation.',
                'JurisConnect বিনামূল্যে আইনি সহায়তা প্রত্যাশী নাগরিকদের সাথে জেলা লিগ্যাল এইড অফিস (ডিএলএও), প্যানেল আইনজীবী, মধ্যস্থতাকারী ও তদারকি কমিটির নিরাপদ ও রিয়েল-টাইম সমন্বয় নিশ্চিত করে।'
              )}
            </p>

            <div className="rounded-xl bg-white dark:bg-[#0D1B16] border border-emerald-200/70 dark:border-emerald-900/60 p-4 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Scale className="w-4 h-4 text-[#059669] dark:text-[#6EE7B7]" />
                <span>{t(lang, 'Supported Role Workspaces', 'রোল-ভিত্তিক ওয়ার্কস্পেসসমূহ')}</span>
              </div>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                <li>• {ROLE_LABELS.citizen[lang]}</li>
                <li>• {ROLE_LABELS.dlao_officer[lang]}</li>
                <li>• {ROLE_LABELS.panel_lawyer[lang]}</li>
                <li>• {ROLE_LABELS.mediator[lang]}</li>
                <li>• {ROLE_LABELS.supervisor[lang]}</li>
              </ul>
            </div>
          </div>

          {/* Right Form Card Column */}
          <div className="lg:col-span-7 max-w-md w-full mx-auto lg:ml-auto">
            <AuthFormCard
              mode={mode}
              onModeChange={onModeChange}
              initialRole={initialRole}
              lang={lang}
              onAuthenticated={onAuthenticated}
              showCloseButton={false}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  initialMode = 'signin',
  initialRole = 'citizen',
  lang,
  onClose,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md my-auto">
        <AuthFormCard
          mode={mode}
          onModeChange={setMode}
          initialRole={initialRole}
          lang={lang}
          onClose={onClose}
          onAuthenticated={onAuthenticated}
          showCloseButton
        />
      </div>
    </div>
  );
};
