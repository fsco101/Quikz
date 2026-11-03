import { useEffect, useRef, useState } from 'react';

// Audio is unlocked by Start / resume or the sound button, never by autoplay.
export function useQuizClock(active: boolean, remaining: number) {
  const [enabled, setEnabled] = useState(true);
  const context = useRef<AudioContext | null>(null);
  const unlock = () => {
    try {
      context.current ??= new AudioContext();
      void context.current.resume().catch(() => {});
    } catch { /* A browser without audio support can still run the quiz. */ }
  };
  useEffect(() => {
    const audio = context.current;
    if (!active || !enabled || remaining <= 0 || document.hidden || !audio || audio.state !== 'running') return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = remaining <= 10 ? 1100 : 800;
    gain.gain.setValueAtTime(0.035, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.045);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.05);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }, [active, remaining, enabled]);
  useEffect(() => () => { void context.current?.close().catch(() => {}); context.current = null; }, []);
  return { enabled, unlock, toggle: () => { if (!enabled) unlock(); setEnabled(value => !value); } };
}
