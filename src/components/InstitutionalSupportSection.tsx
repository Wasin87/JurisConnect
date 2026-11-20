import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { t } from '../i18n';
import type { LanguageCode } from '../types';
import {
  INSTITUTIONAL_SUPPORT_NETWORK,
  type InstitutionalSupportEntry,
} from '../data/institutionalSupportNetwork';

interface InstitutionalSupportSectionProps {
  lang: LanguageCode;
  lowBandwidth?: boolean;
}

const InstitutionCard: React.FC<{
  item: InstitutionalSupportEntry;
  lang: LanguageCode;
  duplicate?: boolean;
}> = ({ item, lang, duplicate = false }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const displayName = lang === 'bn' ? item.nameBn : item.nameEn;

  return (
    <a
      href={item.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={duplicate ? -1 : 0}
      aria-hidden={duplicate ? true : undefined}
      aria-label={`${displayName} — ${item.domain} (${t(lang, 'opens in new tab', 'নতুন ট্যাবে খুলবে')})`}
      className="group shrink-0 w-[236px] sm:w-[258px] lg:w-[272px] p-5 rounded-2xl bg-white dark:bg-[#0D1B16] border border-emerald-200/80 dark:border-emerald-900/60 shadow-xs hover:shadow-md hover:border-[#10B981] dark:hover:border-[#34D399] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
    >
      {/* Logo Frame — preserves authentic official proportions and colors */}
      <div className="h-[78px] w-full rounded-xl bg-white border border-emerald-100/90 flex items-center justify-center p-2.5 overflow-hidden">
        {imgFailed ? (
          <div className="text-center px-2">
            <div className="font-mono-tabular text-xs font-bold tracking-wider text-[#065F46]">
              {item.fallbackCode}
            </div>
            <div className="text-[10px] text-slate-500 truncate max-w-[180px]">{item.domain}</div>
          </div>
        ) : (
          <img
            src={item.logoPath}
            alt={item.nameEn}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="max-h-[58px] max-w-[140px] w-auto h-auto object-contain transition-transform duration-200 group-hover:scale-105"
          />
        )}
      </div>

      {/* Full Institution Name + Official Domain */}
      <div className="space-y-2 flex-1 flex flex-col justify-between">
        <h3 className="font-sans text-[13px] sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-[#059669] dark:group-hover:text-[#6EE7B7] transition-colors">
          {displayName}
        </h3>

        <div className="pt-2 border-t border-emerald-100/80 dark:border-emerald-900/50 flex items-center justify-between gap-2 text-xs">
          <span className="font-mono-tabular text-[#059669] dark:text-[#6EE7B7] font-medium truncate">
            {item.domain}
          </span>
          <ExternalLink
            className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#059669] dark:group-hover:text-[#6EE7B7] shrink-0 transition-colors"
            aria-hidden="true"
          />
        </div>
      </div>
    </a>
  );
};

export const InstitutionalSupportSection: React.FC<InstitutionalSupportSectionProps> = ({
  lang,
  lowBandwidth = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const trackOneRef = useRef<HTMLDivElement | null>(null);
  const isPausedRef = useRef(false);
  const manualPauseUntilRef = useRef(0);
  const subPixelAccumulatorRef = useRef(0);

  useEffect(() => {
    if (lowBandwidth) return;

    const mediaQuery =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    if (mediaQuery?.matches) return;

    let rafId = 0;
    let lastTimestamp = 0;
    const speedPxPerSec = 52;

    const tick = (timestamp: number) => {
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }
      const deltaMs = Math.min(timestamp - lastTimestamp, 64);
      lastTimestamp = timestamp;

      const container = scrollContainerRef.current;
      const trackOne = trackOneRef.current;

      if (
        container &&
        trackOne &&
        !isPausedRef.current &&
        timestamp > manualPauseUntilRef.current
      ) {
        const halfWidth = trackOne.offsetWidth;
        if (halfWidth > 0) {
          subPixelAccumulatorRef.current += (speedPxPerSec * deltaMs) / 1000;
          const wholePixels = Math.floor(subPixelAccumulatorRef.current);
          if (wholePixels >= 1) {
            subPixelAccumulatorRef.current -= wholePixels;
            let nextLeft = container.scrollLeft + wholePixels;
            if (nextLeft >= halfWidth) {
              nextLeft -= halfWidth;
            }
            container.scrollLeft = nextLeft;
          }
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [lowBandwidth]);

  const handleManualScroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    const trackOne = trackOneRef.current;
    if (!container || !trackOne) return;

    const halfWidth = trackOne.offsetWidth;
    if (halfWidth <= 0) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Pause continuous auto-scroll briefly while user navigates with arrow buttons
    manualPauseUntilRef.current = performance.now() + 1100;
    subPixelAccumulatorRef.current = 0;

    // Step by roughly one card + gap on mobile, or ~1.2 cards on desktop
    const step = container.clientWidth < 640 ? 256 : 320;

    let baseLeft = container.scrollLeft;

    if (direction === 'left') {
      if (baseLeft < step + 16) {
        baseLeft += halfWidth;
        container.scrollLeft = baseLeft;
      }
      const targetLeft = Math.max(0, baseLeft - step);
      window.requestAnimationFrame(() => {
        container.scrollTo({
          left: targetLeft,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      });
    } else {
      if (baseLeft + container.clientWidth + step > halfWidth * 2 - 16) {
        baseLeft -= halfWidth;
        container.scrollLeft = baseLeft;
      }
      const targetLeft = baseLeft + step;
      window.requestAnimationFrame(() => {
        container.scrollTo({
          left: targetLeft,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      });
    }
  };

  return (
    <section
      aria-labelledby="institutional-support-heading"
      className="relative w-full bg-[#EFF7F4] dark:bg-[#091712] border-t border-emerald-200/80 dark:border-emerald-900/60 py-14 sm:py-16 overflow-hidden"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <motion.div
          initial={lowBandwidth ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10"
        >
          <div className="max-w-3xl space-y-3 text-left">
            <h2
              id="institutional-support-heading"
              className="font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white text-balance"
            >
              {t(lang, 'Our Institutional Support Network', 'প্রাতিষ্ঠানিক সহায়তা ও জনসচেতনতা নেটওয়ার্ক')}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
              {t(
                lang,
                "Connecting citizens with Bangladesh's legal institutions, public authorities, and organizations working to protect justice, rights, and equal access to legal assistance.",
                'ন্যায়বিচার, মানবাধিকার ও সমান আইনি সহায়তা সুরক্ষায় নিয়োজিত বাংলাদেশের গুরুত্বপূর্ণ বিচারিক প্রতিষ্ঠান, সরকারি কর্তৃপক্ষ ও জনসেবা সংস্থাসমূহের পরিচিতি।'
              )}
            </p>
          </div>

          {/* Left & Right Carousel Navigation Buttons */}
          <div
            className="flex items-center gap-2.5 shrink-0 self-start sm:self-end"
            role="group"
            aria-label={t(lang, 'Carousel navigation controls', 'ক্যারোসেল স্ক্রল বাটন')}
          >
            <button
              type="button"
              onClick={() => handleManualScroll('left')}
              aria-label={t(lang, 'Scroll institutions left', 'বাম দিকে স্ক্রল করুন')}
              title={t(lang, 'Previous (Scroll Left)', 'বামে দেখুন')}
              className="w-11 h-11 rounded-full bg-white dark:bg-[#0D1B16] border border-emerald-300/80 dark:border-emerald-800/80 text-[#064E3B] dark:text-[#6EE7B7] hover:bg-[#059669] hover:text-white hover:border-[#059669] dark:hover:bg-[#10B981] dark:hover:text-[#031F16] dark:hover:border-[#10B981] shadow-xs flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleManualScroll('right')}
              aria-label={t(lang, 'Scroll institutions right', 'ডান দিকে স্ক্রল করুন')}
              title={t(lang, 'Next (Scroll Right)', 'ডানে দেখুন')}
              className="w-11 h-11 rounded-full bg-white dark:bg-[#0D1B16] border border-emerald-300/80 dark:border-emerald-800/80 text-[#064E3B] dark:text-[#6EE7B7] hover:bg-[#059669] hover:text-white hover:border-[#059669] dark:hover:bg-[#10B981] dark:hover:text-[#031F16] dark:hover:border-[#10B981] shadow-xs flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Interactive + Continuous Right-to-Left Infinite Carousel */}
      <div
        className="relative max-w-[1440px] mx-auto overflow-hidden"
        onMouseEnter={() => {
          isPausedRef.current = true;
        }}
        onMouseLeave={() => {
          isPausedRef.current = false;
        }}
        onFocusCapture={() => {
          isPausedRef.current = true;
        }}
        onBlurCapture={() => {
          isPausedRef.current = false;
        }}
        onTouchStart={() => {
          isPausedRef.current = true;
        }}
        onTouchEnd={() => {
          isPausedRef.current = false;
        }}
        onTouchCancel={() => {
          isPausedRef.current = false;
        }}
      >
        {/* Soft horizontal edge masks */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-20 z-10 bg-gradient-to-r from-[#EFF7F4] dark:from-[#091712] to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-20 z-10 bg-gradient-to-l from-[#EFF7F4] dark:from-[#091712] to-transparent"
        />

        <div
          ref={scrollContainerRef}
          role="region"
          aria-label={t(
            lang,
            'Public legal and citizen-support institutions carousel',
            'সরকারি আইন ও নাগরিক সহায়তা প্রতিষ্ঠানসমূহের তালিকা'
          )}
          className="flex w-full overflow-x-auto no-scrollbar py-2"
        >
          {/* Track 1 */}
          <div
            ref={trackOneRef}
            className="flex items-stretch gap-4 sm:gap-5 pr-4 sm:pr-5 shrink-0"
          >
            {INSTITUTIONAL_SUPPORT_NETWORK.map((item) => (
              <InstitutionCard key={`track-a-${item.id}`} item={item} lang={lang} />
            ))}
          </div>

          {/* Track 2 (Seamless Duplicate for Infinite Bidirectional Loop) */}
          <div
            className="flex items-stretch gap-4 sm:gap-5 pr-4 sm:pr-5 shrink-0"
            aria-hidden="true"
          >
            {INSTITUTIONAL_SUPPORT_NETWORK.map((item) => (
              <InstitutionCard key={`track-b-${item.id}`} item={item} lang={lang} duplicate />
            ))}
          </div>
        </div>
      </div>

      {/* Transparency Disclaimer */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-8">
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
          {t(
            lang,
            'These institutions are listed for public information and legal assistance awareness. Their appearance on JurisConnect does not imply an official partnership or endorsement.',
            'এই প্রতিষ্ঠানসমূহ কেবল জনসচেতনতা ও আইনি সহায়তার তথ্যের উদ্দেশ্যে প্রদর্শিত হয়েছে। JurisConnect-এ এদের উপস্থিতি কোনো আনুষ্ঠানিক অংশীদারিত্ব বা অনুমোদন নির্দেশ করে না।'
          )}
        </p>
      </div>
    </section>
  );
};
