/**
 * ArkCRM — passwordStrength
 * ---------------------------------------------------------------------------
 * A 0-4 score for the register form's strength meter, plus a label and the list
 * of unmet requirements.
 *
 * The score is computed from what a password policy actually asks for — length,
 * case, digits, symbols — rather than entropy. That matches the rule the
 * `password` validator in utils/validators.js enforces, so the meter can never
 * show "Strong" for a password the server will reject.
 *
 * `isValid` is deliberately the same expression as the shared validator, so the
 * "Use a strong password" hint disappears exactly when the form will accept it.
 */

const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];

/** Unmet requirements, in the order they are shown. */
const REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'case', label: 'An upper and a lower case letter', test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: 'digit', label: 'At least one number', test: (v) => /\d/.test(v) },
  { id: 'symbol', label: 'A symbol, e.g. ! or @', test: (v) => /[^\w\s]/.test(v) },
];

/**
 * @param {string} value
 * @returns {{score: number, label: string, requirements: Array, isValid: boolean}}
 *          score is 0-4 and maps to LABELS; isValid means the shared policy
 *          is satisfied.
 */
export default function passwordStrength(value = '') {
  const requirements = REQUIREMENTS.map((requirement) => ({
    id: requirement.id,
    label: requirement.label,
    met: requirement.test(value),
  }));

  const met = requirements.filter((requirement) => requirement.met).length;
  const score = Math.min(met, LABELS.length - 1);

  return {
    score,
    label: value ? LABELS[score] : '',
    requirements,
    /* All four, because that is exactly the policy validators.js enforces. */
    isValid: met === REQUIREMENTS.length,
  };
}

export { LABELS as PASSWORD_STRENGTH_LABELS };
