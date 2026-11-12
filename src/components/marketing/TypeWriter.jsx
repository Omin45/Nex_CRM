/**
 * ArkCRM — TypeWriter
 * ---------------------------------------------------------------------------
 * Spec: "a hero line like 'Manage your business <rotating word>', where the
 * word types and deletes in a loop (Sales, Inventory, Accounting, HR,
 * Projects) with a blinking caret."
 *
 * Exported as both a hook (`useTypewriter`) and a component, so a page can
 * drive its own layout around the words and still reuse the state machine.
 *
 * Behaviour:
 *   type a word -> hold -> delete it -> next word, forever.
 * Reduced motion: the animation is not merely hidden, the loop is never
 * started. The first word is shown in full so the line always reads as a
 * complete sentence.
 */

import { useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import './TypeWriter.css';

const TYPE_MS = 85; // per character
const DELETE_MS = 45; // per character
const HOLD_MS = 1600; // pause on a completed word
const GAP_MS = 350; // pause on an empty line before the next word

/**
 * @param {string[]} words Words to cycle through.
 * @param {object}   options
 * @returns {{ text: string, wordIndex: number, isDeleting: boolean }}
 */
export function useTypewriter(words, options = {}) {
  const { startDelay = 350, loop = true } = options;

  const list = Array.isArray(words) ? words.filter(Boolean) : [];
  const reducedMotion = usePrefersReducedMotion();

  const [text, setText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  /* The timer is held in a ref rather than state so the effect below can read
     the latest values without re-subscribing on every keystroke. */
  const stateRef = useRef({ text: '', wordIndex: 0, isDeleting: false, started: false });
  stateRef.current = { text, wordIndex, isDeleting, started: stateRef.current.started };

  useEffect(() => {
    /* Nothing to type, or the user asked for stillness: render the first word
       whole and stop. */
    if (!list.length || reducedMotion) {
      setText(list[0] ?? '');
      return undefined;
    }

    let timer;

    const tick = () => {
      const current = stateRef.current;
      const word = list[current.wordIndex % list.length] ?? '';
      const finished = !loop && current.wordIndex >= list.length - 1 && current.isDeleting;

      if (finished) {
        setText('');
        return;
      }

      if (!current.isDeleting) {
        /* Typing: one character closer to the full word each tick. */
        if (current.text.length < word.length) {
          const next = word.slice(0, current.text.length + 1);
          setText(next);
          stateRef.current.text = next;
          timer = setTimeout(tick, TYPE_MS);
          return;
        }

        /* Word complete: hold, then switch to deleting. */
        timer = setTimeout(() => {
          setIsDeleting(true);
          stateRef.current.isDeleting = true;
        }, HOLD_MS);
        return;
      }

      /* Deleting: remove one character per tick until the line is empty. */
      if (current.text.length > 0) {
        const next = current.text.slice(0, -1);
        setText(next);
        stateRef.current.text = next;
        timer = setTimeout(tick, DELETE_MS);
        return;
      }

      /* Line is empty: advance to the next word after a short gap. */
      const nextIndex = (current.wordIndex + 1) % list.length;
      setIsDeleting(false);
      setWordIndex(nextIndex);
      stateRef.current.isDeleting = false;
      stateRef.current.wordIndex = nextIndex;
      timer = setTimeout(tick, GAP_MS);
    };

    const hasStarted = stateRef.current.started;
    stateRef.current.started = true;
    timer = setTimeout(tick, hasStarted ? TYPE_MS : startDelay);

    return () => clearTimeout(timer);
  }, [list, reducedMotion, loop, startDelay]);

  return { text, wordIndex, isDeleting };
}

const cx = (...classes) => classes.filter(Boolean).join(' ');

/**
 * @example
 * <TypeWriter words={['Sales', 'Inventory', 'Accounting']} prefix="Manage your " />
 */
export default function TypeWriter({
  words = [],
  prefix = '',
  suffix = '',
  className = '',
  as: Tag = 'span',
}) {
  const { text, isDeleting } = useTypewriter(words);

  return (
    <Tag className={cx('nx-typewriter', className)}>
      {prefix ? <span className="nx-typewriter__static">{prefix}</span> : null}
      <span className="nx-typewriter__word" aria-live="polite">
        {text}
        {/* The caret is aria-hidden; `aria-live` on the word announces the
            finished phrase rather than every intermediate character. */}
        <span className="nx-typewriter__caret" aria-hidden="true" data-deleting={isDeleting} />
      </span>
      {suffix ? <span className="nx-typewriter__static">{suffix}</span> : null}
    </Tag>
  );
}
