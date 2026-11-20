import React, { useEffect, useState } from 'react';
import { PhoneCall, Play, Pause, MousePointerClick, Signal, BatteryCharging } from 'lucide-react';
import { t } from '../i18n';
import type { LanguageCode } from '../types';

interface FeaturePhoneShowcaseProps {
  lang: LanguageCode;
  lowBandwidth: boolean;
  onOpenInteractiveModal: (mode: 'ussd' | 'helpline') => void;
}

interface AnimationScene {
  id: string;
  durationMs: number;
  highlightKey: string;
  statusBarLabel: string;
  screenTitle: string;
  lines: string[];
  footerLeft: string;
  footerRight: string;
  accentMode: 'ussd' | 'voice' | 'success';
}

const ANIMATION_SCENES: AnimationScene[] = [
  {
    id: 'dial-ussd',
    durationMs: 2400,
    highlightKey: '*',
    statusBarLabel: 'GP / Robi / Teletalk',
    screenTitle: 'DIAL USSD GATEWAY',
    lines: ['*16699#', '', 'Press Green Call key', 'Toll-free offline access'],
    footerLeft: 'Call',
    footerRight: 'Clear',
    accentMode: 'ussd',
  },
  {
    id: 'dial-call',
    durationMs: 2000,
    highlightKey: 'CALL',
    statusBarLabel: 'Sending USSD...',
    screenTitle: 'CONNECTING *16699#',
    lines: ['Requesting National', 'Legal Aid Gateway...', 'Zero mobile data used'],
    footerLeft: 'Wait',
    footerRight: 'Cancel',
    accentMode: 'ussd',
  },
  {
    id: 'ussd-menu',
    durationMs: 2800,
    highlightKey: '1',
    statusBarLabel: 'USSD *16699#',
    screenTitle: 'JurisConnect Menu',
    lines: ['1. Apply Free Legal Aid', '2. Track Case Status', '3. Voice Helpline 16699', 'Reply: 1 [Selected]'],
    footerLeft: 'Send',
    footerRight: 'Back',
    accentMode: 'ussd',
  },
  {
    id: 'bangla-ai-triage',
    durationMs: 3000,
    highlightKey: 'OK',
    statusBarLabel: 'Bangla AI Sync',
    screenTitle: '1. Family Maintenance',
    lines: ['District: Sunamganj', 'Priority: High (AI)', 'Case ID Generated:', 'LBD-2026-4821'],
    footerLeft: 'Save',
    footerRight: 'SMS',
    accentMode: 'success',
  },
  {
    id: 'voice-helpline',
    durationMs: 3000,
    highlightKey: 'CALL',
    statusBarLabel: '16699 Toll-Free',
    screenTitle: 'VOICE HELPLINE 16699',
    lines: ['Connected · 00:14', 'Bangla Legal Officer', '+ AI Fact Extraction', 'Synced to DLAO Queue'],
    footerLeft: 'Mute',
    footerRight: 'End',
    accentMode: 'voice',
  },
];

const KEYPAD_ROWS = [
  [
    { key: '1', sub: '' },
    { key: '2', sub: 'ABC' },
    { key: '3', sub: 'DEF' },
  ],
  [
    { key: '4', sub: 'GHI' },
    { key: '5', sub: 'JKL' },
    { key: '6', sub: 'MNO' },
  ],
  [
    { key: '7', sub: 'PQRS' },
    { key: '8', sub: 'TUV' },
    { key: '9', sub: 'WXYZ' },
  ],
  [
    { key: '*', sub: '+' },
    { key: '0', sub: '␣' },
    { key: '#', sub: '⇧' },
  ],
];

export const FeaturePhoneShowcase: React.FC<FeaturePhoneShowcaseProps> = ({
  lang,
  lowBandwidth,
  onOpenInteractiveModal,
}) => {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || lowBandwidth) return;
    const current = ANIMATION_SCENES[sceneIdx];
    const timer = setTimeout(() => {
      setSceneIdx((prev) => (prev + 1) % ANIMATION_SCENES.length);
    }, current.durationMs);
    return () => clearTimeout(timer);
  }, [sceneIdx, paused, lowBandwidth]);

  const scene = ANIMATION_SCENES[sceneIdx];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* 9:16 Classic Feature / Button Phone Chassis */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenInteractiveModal(scene.accentMode === 'voice' ? 'helpline' : 'ussd')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenInteractiveModal(scene.accentMode === 'voice' ? 'helpline' : 'ussd');
          }
        }}
        aria-label={t(
          lang,
          'Interactive 9:16 feature phone walkthrough. Click to open live manual keypad simulator.',
          '৯:১৬ বাটন ফোন অ্যানিমেশন। ম্যানুয়াল কীপ্যাড সিমুলেটর খুলতে ক্লিক করুন।'
        )}
        className="group relative w-full max-w-[280px] aspect-[9/16] rounded-[2rem] bg-gradient-to-b from-[#0F2E24] via-[#071D16] to-[#04120D] p-3.5 border-2 border-emerald-900/80 shadow-2xl flex flex-col justify-between cursor-pointer transition-transform duration-200 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[#34D399]"
      >
        {/* Top Speaker Earpiece & Brand Etching */}
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <div className="w-12 h-1.5 rounded-full bg-emerald-900/80 border border-emerald-700/60" />
          <div className="text-[10px] font-semibold tracking-[0.22em] text-emerald-200/70 uppercase">
            JurisConnect · 2G/USSD
          </div>
        </div>

        {/* Classic Backlit LCD Screen */}
        <div className="relative flex-1 my-2 rounded-xl bg-[#041C14] border-2 border-emerald-950 overflow-hidden flex flex-col justify-between p-3 text-slate-100 shadow-inner">
          {/* LCD Top Status Bar + Step Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono-tabular text-emerald-300">
              <span className="inline-flex items-center gap-1 truncate">
                <Signal className="w-2.5 h-2.5 shrink-0" />
                {scene.statusBarLabel}
              </span>
              <BatteryCharging className="w-3 h-3 text-[#6EE7B7] shrink-0" />
            </div>

            {/* Scene Progress Segments */}
            <div className="grid grid-cols-5 gap-1">
              {ANIMATION_SCENES.map((s, idx) => (
                <div
                  key={s.id}
                  className={`h-1 rounded-full transition-colors duration-200 ${
                    idx <= sceneIdx ? 'bg-[#34D399]' : 'bg-emerald-950'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* LCD Main Animated Viewport */}
          <div className="my-auto py-2 space-y-1.5 font-mono-tabular">
            <div
              className={`text-[11px] font-bold tracking-wide ${
                scene.accentMode === 'voice'
                  ? 'text-amber-300'
                  : scene.accentMode === 'success'
                  ? 'text-[#6EE7B7]'
                  : 'text-emerald-300'
              }`}
            >
              {scene.screenTitle}
            </div>
            <div className="space-y-1 text-[11px] leading-snug text-slate-100">
              {scene.lines.map((line, i) => (
                <div
                  key={`${scene.id}-${i}`}
                  className={`${
                    line.includes('*16699#') || line.includes('LBD-')
                      ? 'text-base font-bold text-white tracking-wider'
                      : line.includes('[Selected]')
                      ? 'text-[#6EE7B7] font-semibold'
                      : 'text-slate-200'
                  }`}
                >
                  {line || '\u00A0'}
                </div>
              ))}
            </div>
          </div>

          {/* LCD Soft-Key Bar */}
          <div className="flex items-center justify-between pt-1.5 border-t border-emerald-900/70 text-[10px] font-mono-tabular text-slate-300">
            <span className="text-[#6EE7B7] font-semibold">{scene.footerLeft}</span>
            <span className="inline-flex items-center gap-1 text-[9px] text-amber-300">
              <MousePointerClick className="w-2.5 h-2.5" />
              {t(lang, 'Click to test', 'ক্লিক করুন')}
            </span>
            <span>{scene.footerRight}</span>
          </div>
        </div>

        {/* Navigation Cluster (Left Soft, D-Pad OK, Right Soft + Call/End) */}
        <div className="space-y-2 pb-1">
          <div className="grid grid-cols-3 items-center gap-1.5">
            <div className="h-6 rounded-md bg-emerald-950/90 border border-emerald-800/70 flex items-center justify-center">
              <div className="w-4 h-0.5 bg-[#6EE7B7] rounded-full" />
            </div>
            <div
              className={`h-8 rounded-xl border flex items-center justify-center text-[10px] font-bold transition-all ${
                scene.highlightKey === 'OK'
                  ? 'bg-[#059669] border-[#6EE7B7] text-white scale-95 shadow-md shadow-emerald-500/40'
                  : 'bg-emerald-950/90 border-emerald-800/70 text-slate-200'
              }`}
            >
              OK
            </div>
            <div className="h-6 rounded-md bg-emerald-950/90 border border-emerald-800/70 flex items-center justify-center">
              <div className="w-4 h-0.5 bg-slate-400 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div
              className={`h-7 rounded-lg border flex items-center justify-center gap-1 text-[10px] font-semibold transition-all ${
                scene.highlightKey === 'CALL'
                  ? 'bg-[#10B981] border-[#6EE7B7] text-white scale-95 shadow-md shadow-emerald-500/40'
                  : 'bg-emerald-950/70 border-emerald-800/70 text-emerald-300'
              }`}
            >
              <PhoneCall className="w-3 h-3" />
              CALL
            </div>
            <div className="h-7 rounded-lg bg-red-950/60 border border-red-900/60 flex items-center justify-center text-[10px] font-semibold text-red-300">
              END
            </div>
          </div>

          {/* Physical 3x4 T9 Numeric Button Grid */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {KEYPAD_ROWS.flat().map((btn) => {
              const active = scene.highlightKey === btn.key;
              return (
                <div
                  key={btn.key}
                  className={`h-7 rounded-md border flex items-center justify-center gap-1 font-mono-tabular transition-all duration-150 ${
                    active
                      ? 'bg-[#059669] border-[#6EE7B7] text-white scale-95 shadow-sm shadow-emerald-500/40'
                      : 'bg-emerald-950/80 border-emerald-900/80 text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold leading-none">{btn.key}</span>
                  {btn.sub && <span className="text-[7px] text-emerald-200/60 leading-none">{btn.sub}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Compact Control Strip Below Phone */}
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-800 bg-[#06231A] text-slate-200 hover:border-[#34D399] transition-colors"
        >
          {paused ? <Play className="w-3.5 h-3.5 text-[#6EE7B7]" /> : <Pause className="w-3.5 h-3.5 text-[#6EE7B7]" />}
          <span>{paused ? t(lang, 'Resume Preview', 'চালু করুন') : t(lang, 'Pause Preview', 'বিরতি')}</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenInteractiveModal('ussd')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#059669] text-white font-medium hover:bg-[#047857] transition-colors"
        >
          <MousePointerClick className="w-3.5 h-3.5" />
          <span>{t(lang, 'Try Live Keypad', 'লাইভ কীপ্যাড টেস্ট')}</span>
        </button>
      </div>
    </div>
  );
};
