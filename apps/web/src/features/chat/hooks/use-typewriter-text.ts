import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

const MAX_CHARACTERS_PER_FRAME = 40;
const TARGET_CATCH_UP_FRAMES = 60;

export function getTypewriterStep(remainingCharacters: number): number {
  return Math.min(
    MAX_CHARACTERS_PER_FRAME,
    Math.max(1, Math.ceil(remainingCharacters / TARGET_CATCH_UP_FRAMES)),
  );
}

export function useTypewriterLength(
  targetLength: number,
  shouldAnimate: boolean,
): readonly [number, boolean] {
  const shouldReduceMotion = useReducedMotion();
  const [visibleLength, setVisibleLength] = useState(() =>
    shouldAnimate && !shouldReduceMotion ? 0 : targetLength,
  );

  useEffect(() => {
    if (!shouldAnimate || shouldReduceMotion || visibleLength > targetLength) {
      if (visibleLength !== targetLength) setVisibleLength(targetLength);
      return;
    }
    if (visibleLength >= targetLength) return;

    const frame = window.requestAnimationFrame(() => {
      setVisibleLength((current) => {
        const remaining = targetLength - current;
        const step = getTypewriterStep(remaining);
        return Math.min(targetLength, current + step);
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [shouldAnimate, shouldReduceMotion, targetLength, visibleLength]);

  const normalizedLength =
    shouldAnimate && !shouldReduceMotion ? Math.min(visibleLength, targetLength) : targetLength;
  return [normalizedLength, normalizedLength < targetLength] as const;
}

export function useTypewriterText(
  content: string,
  shouldAnimate: boolean,
): readonly [string, boolean] {
  const characters = useMemo(() => Array.from(content), [content]);
  const [visibleLength, isTyping] = useTypewriterLength(characters.length, shouldAnimate);

  return [characters.slice(0, visibleLength).join(""), isTyping] as const;
}
