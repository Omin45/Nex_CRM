/**
 * ArkCRM — PasswordStrength
 * ---------------------------------------------------------------------------
 * The register form's strength meter: a four-segment bar, a label, and the
 * list of unmet requirements.
 *
 * Requirements are shown as a checklist rather than a bare word, because "Weak"
 * on its own does not tell anyone what to do. Each line ticks as it is met.
 *
 * Accessibility: the bar is aria-hidden (the text label carries the meaning),
 * and the requirement list is a live region so a screen-reader user hears
 * progress as they type rather than only at the end.
 */

import { FiCheck } from 'react-icons/fi';
import passwordStrength from '@/utils/passwordStrength';
import './PasswordStrength.css';

export default function PasswordStrength({ value = '' }) {
  /* Nothing to say about an empty field — an empty meter that reads "Very weak"
     is just a criticism of the user for not having typed yet. */
  if (!value) return null;

  const { score, label, requirements, isValid } = passwordStrength(value);

  return (
    <div className="nx-strength">
      {/* data-score lives on the wrapper so one selector can colour both the
          bars and the label. A sibling combinator cannot do it: the bars come
          first in the DOM. */}
      <div className="nx-strength__head" data-score={score}>
        <div className="nx-strength__bars" aria-hidden="true">
          {[0, 1, 2, 3].map((segment) => (
            <span key={segment} className="nx-strength__bar" data-on={segment <= score || undefined} />
          ))}
        </div>

        <span className="nx-strength__label">{label}</span>
      </div>

      <ul className="nx-strength__list" aria-live="polite">
        {requirements.map((requirement) => (
          <li
            key={requirement.id}
            className="nx-strength__item"
            data-met={requirement.met || undefined}
          >
            <span className="nx-strength__tick" aria-hidden="true">
              {requirement.met ? <FiCheck size={10} /> : null}
            </span>
            {requirement.label}
            <span className="nx-sr-only">
              {requirement.met ? ' — met' : ' — not met yet'}
            </span>
          </li>
        ))}
      </ul>

      {isValid ? <p className="nx-strength__ok">Strong enough to use.</p> : null}
    </div>
  );
}
