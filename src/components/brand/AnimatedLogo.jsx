/**
 * NexERP — AnimatedLogo
 * ---------------------------------------------------------------------------
 * The per-letter animated gradient wordmark.
 *
 * Spec: "split 'NexERP' into individual <span>s. Each letter has a moving
 * linear-gradient (pale blue -> indigo -> cyan) with background-clip: text,
 * transparent fill, and an animation-delay of index * 0.15s, so the gradient
 * looks like a wave passing through the letters."
 *
 * The wave is produced entirely in CSS: every letter runs the same keyframes
 * with an animation-delay of index * 0.15s, so a crest of pale blue enters at
 * the first glyph and travels to the last. Offsets are declared as nth-child
 * rules in AnimatedLogo.css rather than inline `style` attributes, which keeps
 * the markup free of inline styles per the spec.
 *
 * @example
 * <AnimatedLogo size="sm" />
 * <AnimatedLogo size="lg" text="NexERP" />
 */

import './AnimatedLogo.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

export default function AnimatedLogo({
  size = 'sm',
  text = 'NexERP',
  className = '',
  /** Rendered as a heading when true, otherwise a span. */
  as: Tag = 'span',
}) {
  return (
    <Tag
      className={cx('nx-anim-logo', `nx-anim-logo--${size}`, className)}
      /* The letters are decorative duplicates of the accessible name, so the
         group is labelled once and each glyph is hidden from screen readers. */
      aria-label={text}
      role="img"
    >
      {text.split('').map((char, index) => (
        <span key={`${char}-${index}`} className="nx-anim-logo__char" aria-hidden="true">
          {char}
        </span>
      ))}
    </Tag>
  );
}
