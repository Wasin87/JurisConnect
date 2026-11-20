import confetti from 'canvas-confetti';

const PALETTE = ['#059669', '#10B981', '#6EE7B7', '#064E3B', '#F59E0B'];

export function fireCelebrationConfetti(lowBandwidth = false) {
  if (lowBandwidth) return;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  confetti({
    particleCount: 70,
    spread: 68,
    origin: { y: 0.65 },
    colors: PALETTE,
    disableForReducedMotion: true,
  });

  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0.15, y: 0.7 },
      colors: PALETTE,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 0.85, y: 0.7 },
      colors: PALETTE,
      disableForReducedMotion: true,
    });
  }, 180);
}

export function fireSubtleMilestoneConfetti(lowBandwidth = false) {
  if (lowBandwidth) return;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  confetti({
    particleCount: 45,
    spread: 52,
    origin: { y: 0.7 },
    colors: ['#046C4E', '#D97706', '#34D399'],
    disableForReducedMotion: true,
  });
}
