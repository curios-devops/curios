import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation, type TranslationKey } from '../hooks/useTranslation.ts';

interface AnimatedHomeTitleProps {
  name: string | null;
  className?: string;
  style?: CSSProperties;
  /** Fires once the question has finished typing. */
  onDone?: () => void;
}

/** Local time of day → greeting key. */
function getTimeGreetingKey(date = new Date()): TranslationKey {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'greetMorning';
  if (hour >= 12 && hour < 18) return 'greetAfternoon';
  if (hour >= 18 && hour < 22) return 'greetEvening';
  return 'greetNight';
}

/** Time-of-day greetings; the name is omitted when there is none. */
function buildSalutations(name: string | null, t: (key: TranslationKey) => string): string[] {
  // [with name, without name] — some greetings read differently with no name ("Hello there").
  const pairs: [TranslationKey, TranslationKey][] = [
    [getTimeGreetingKey(), getTimeGreetingKey()],
    ['greetHello', 'greetHelloThere'],
    ['greetHey', 'greetHeyThere'],
    ['greetWelcomeBack', 'greetWelcomeBack'],
    ['greetHi', 'greetHiThere'],
    ['greetNiceToSeeYou', 'greetNiceToSeeYou'],
  ];
  return pairs.map(([withKey, withoutKey]) =>
    name
      ? t('greetWithName').replace('{greeting}', t(withKey)).replace('{name}', name)
      : t(withoutKey)
  );
}

type Phase = 'sal-typing' | 'sal-pausing' | 'sal-deleting' | 'q-typing' | 'done';

/**
 * Two-beat headline: types a random time-based greeting, deletes it, then types
 * "What are you curious about?" and stops. (The blinking accent dot was removed
 * in the 2026 redesign — too distracting.)
 */
export default function AnimatedHomeTitle({ name, className, style, onDone }: AnimatedHomeTitleProps) {
  const { t } = useTranslation();
  const QUESTION = t('homeTitle');
  const salutation = useMemo(() => {
    const all = buildSalutations(name, t);
    return all[Math.floor(Math.random() * all.length)];
  }, [name, t]);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const [display, setDisplay] = useState('');

  const charRef = useRef(0);
  const phaseRef = useRef<Phase>('sal-typing');

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(QUESTION);
      onDoneRef.current?.();
      return;
    }

    charRef.current = 0;
    phaseRef.current = 'sal-typing';
    setDisplay('');

    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      switch (phaseRef.current) {
        case 'sal-typing': {
          charRef.current += 1;
          setDisplay(salutation.slice(0, charRef.current));
          if (charRef.current >= salutation.length) {
            phaseRef.current = 'sal-pausing';
            timer = setTimeout(tick, 1700);
          } else {
            timer = setTimeout(tick, 55 + Math.random() * 45);
          }
          break;
        }
        case 'sal-pausing': {
          phaseRef.current = 'sal-deleting';
          timer = setTimeout(tick, 300);
          break;
        }
        case 'sal-deleting': {
          charRef.current -= 1;
          setDisplay(salutation.slice(0, Math.max(0, charRef.current)));
          if (charRef.current <= 0) {
            phaseRef.current = 'q-typing';
            charRef.current = 0;
            timer = setTimeout(tick, 450);
          } else {
            timer = setTimeout(tick, 28);
          }
          break;
        }
        case 'q-typing': {
          charRef.current += 1;
          setDisplay(QUESTION.slice(0, charRef.current));
          if (charRef.current >= QUESTION.length) {
            phaseRef.current = 'done';
            onDoneRef.current?.();
          } else {
            timer = setTimeout(tick, 55 + Math.random() * 45);
          }
          break;
        }
        default:
          break;
      }
    };

    timer = setTimeout(tick, 450);
    return () => clearTimeout(timer);
  }, [salutation, QUESTION, prefersReduced]);

  return (
    <h1 className={className} style={{ minHeight: '1.4em', ...style }} aria-label={QUESTION}>
      <span>{display}</span>
    </h1>
  );
}
