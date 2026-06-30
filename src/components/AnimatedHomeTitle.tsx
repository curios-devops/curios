import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useAccentColor } from '../hooks/useAccentColor';

interface AnimatedHomeTitleProps {
  name: string | null;
  className?: string;
  style?: CSSProperties;
}

const QUESTION = 'What are you curious about?';

/** Local time of day → salutation word. */
function getTimeWord(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/** Time-of-day greetings; the name is omitted when there is none. */
function buildSalutations(name: string | null): string[] {
  const tw = getTimeWord();
  const cap = tw.charAt(0).toUpperCase() + tw.slice(1);
  const withName = name ? `, ${name}` : '';
  return [
    `Good ${tw}${withName}`,
    `Hello${name ? `, ${name}` : ' there'}`,
    `Hey${name ? ` ${name}` : ' there'}`,
    `Welcome back${withName}`,
    `Hi${name ? `, ${name}` : ' there'}`,
    `Nice to see you${withName}`,
    `${cap} curiosity${withName}`,
  ];
}

type Phase = 'sal-typing' | 'sal-pausing' | 'sal-deleting' | 'q-typing' | 'done';

/**
 * Two-beat headline: types a random time-based greeting, deletes it, then types
 * "What are you curious about?" with a blinking accent dot on the left and stops
 * there (the left dot keeps blinking).
 */
export default function AnimatedHomeTitle({ name, className, style }: AnimatedHomeTitleProps) {
  const accent = useAccentColor();
  const salutation = useMemo(() => {
    const all = buildSalutations(name);
    return all[Math.floor(Math.random() * all.length)];
  }, [name]);

  const [display, setDisplay] = useState('');
  const [dotLeft, setDotLeft] = useState(false);

  const charRef = useRef(0);
  const phaseRef = useRef<Phase>('sal-typing');

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReduced) {
      setDotLeft(true);
      setDisplay(QUESTION);
      return;
    }

    charRef.current = 0;
    phaseRef.current = 'sal-typing';
    setDotLeft(false);
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
            setDotLeft(true); // dot moves to the left for the question
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
            phaseRef.current = 'done'; // stop; left dot keeps blinking
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
  }, [salutation, prefersReduced]);

  const dot = (
    <span
      className={`home-caret-dot ${dotLeft ? 'home-caret-dot--left' : ''}`}
      style={{ backgroundColor: accent.primary }}
      aria-hidden="true"
    />
  );

  return (
    <h1 className={className} style={{ minHeight: '1.4em', ...style }} aria-label={QUESTION}>
      {dotLeft && dot}
      <span>{display}</span>
      {!dotLeft && dot}
      <style>{`
        .home-caret-dot {
          display: inline-block;
          width: 0.5em;
          height: 0.5em;
          border-radius: 9999px;
          margin-left: 0.14em;
          vertical-align: middle;
          animation: homeCaretBlink 1s steps(1, end) infinite;
        }
        .home-caret-dot--left {
          margin-left: 0;
          margin-right: 0.3em;
        }
        @keyframes homeCaretBlink {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .home-caret-dot { animation: none; }
        }
      `}</style>
    </h1>
  );
}
