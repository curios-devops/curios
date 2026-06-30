import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useAccentColor } from '../hooks/useAccentColor';

interface AnimatedHomeTitleProps {
  name: string | null;
  className?: string;
  style?: CSSProperties;
}

/** Local time of day → salutation word. */
function getTimeWord(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Builds an alternating sequence of greetings and "what are you curious"
 * questions. Greetings adapt to the local time of day and the user's name
 * (when there is no name, the name is simply omitted).
 */
function buildMessages(name: string | null): string[] {
  const tw = getTimeWord();
  const cap = tw.charAt(0).toUpperCase() + tw.slice(1);
  const withName = name ? `, ${name}` : '';

  const greetings = [
    `Good ${tw}${withName}`,
    `Hello${name ? `, ${name}` : ' there'}`,
    `Hey${name ? ` ${name}` : ' there'}`,
    `Welcome back${withName}`,
    `Hi${name ? `, ${name}` : ' there'}`,
    `Nice to see you${withName}`,
    `${cap} curiosity${withName}`,
  ];

  const questions = [
    'What are you curious about?',
    name ? `What are you curious, ${name}?` : 'What are you curious about today?',
    `What are you curious about this ${tw}?`,
    'What are you curious about today?',
  ];

  // Alternate greeting → question so the headline keeps changing tone.
  const sequence: string[] = [];
  for (let i = 0; i < greetings.length; i++) {
    sequence.push(greetings[i]);
    sequence.push(questions[i % questions.length]);
  }
  return sequence;
}

export default function AnimatedHomeTitle({ name, className, style }: AnimatedHomeTitleProps) {
  const accent = useAccentColor();
  const messages = useMemo(() => buildMessages(name), [name]);
  const [display, setDisplay] = useState('');

  const idxRef = useRef(0);
  const charRef = useRef(0);
  const phaseRef = useRef<'typing' | 'pausing' | 'deleting'>('typing');

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReduced) {
      setDisplay('What are you curious about?');
      return;
    }

    // Reset when the message set changes (e.g. name loads in).
    idxRef.current = 0;
    charRef.current = 0;
    phaseRef.current = 'typing';

    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = messages[idxRef.current % messages.length];

      if (phaseRef.current === 'typing') {
        charRef.current += 1;
        setDisplay(current.slice(0, charRef.current));
        if (charRef.current >= current.length) {
          phaseRef.current = 'pausing';
          timer = setTimeout(tick, 1700); // read pause
        } else {
          timer = setTimeout(tick, 55 + Math.random() * 45);
        }
      } else if (phaseRef.current === 'pausing') {
        phaseRef.current = 'deleting';
        timer = setTimeout(tick, 300);
      } else {
        charRef.current -= 1;
        setDisplay(current.slice(0, Math.max(0, charRef.current)));
        if (charRef.current <= 0) {
          phaseRef.current = 'typing';
          idxRef.current = (idxRef.current + 1) % messages.length;
          timer = setTimeout(tick, 450); // blinking-dot beat before the next line
        } else {
          timer = setTimeout(tick, 28);
        }
      }
    };

    timer = setTimeout(tick, 450);
    return () => clearTimeout(timer);
  }, [messages, prefersReduced]);

  return (
    <h1 className={className} style={{ minHeight: '1.4em', ...style }} aria-label="What are you curious about?">
      <span>{display}</span>
      <span className="home-caret-dot" style={{ backgroundColor: accent.primary }} aria-hidden="true" />
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
