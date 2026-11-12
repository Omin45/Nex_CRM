/**
 * ArkCRM — Input
 * ---------------------------------------------------------------------------
 * Labelled form control with a leading icon, an optional suffix (e.g. a
 * currency symbol), inline validation messaging and a blue-accent focus
 * state. Renders a native input, textarea or select via the `as` prop so a
 * single stylesheet covers every form control in the app.
 *
 * @example
 * <Input
 *   label="Invoice number"
 *   leftIcon={<FiHash />}
 *   suffix="NGN"
 *   error={errors.number}
 *   hint="Auto-generated if left blank"
 *   value={value}
 *   onChange={onChange}
 * />
 */

import { forwardRef, useId } from 'react';
import './Input.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    leftIcon = null,
    rightIcon = null,
    /** Static text pinned to the right edge, e.g. a currency symbol. */
    suffix = null,
    type = 'text',
    /** 'input' | 'textarea' | 'select' */
    as = 'input',
    size = 'md',
    fullWidth = true,
    required = false,
    disabled = false,
    readOnly = false,
    className = '',
    containerClassName = '',
    /** Options for `as="select"`. */
    options = [],
    placeholder,
    value,
    onChange,
    onBlur,
    name,
    id,
    ...rest
  },
  ref,
) {
  /* useId gives every control a stable, SSR-safe id so <label for> and
     aria-describedby wire up without the caller having to manage it. */
  const generatedId = useId();
  const inputId = id ?? name ?? generatedId;
  const describedById = `${inputId}-desc`;

  const Element = as;
  const isTextarea = as === 'textarea';
  const isSelect = as === 'select';

  const describedBy =
    [error ? `${inputId}-error` : null, hint ? describedById : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div
      className={cx(
        'nx-field',
        fullWidth && 'nx-field--full',
        disabled && 'is-disabled',
        error && 'has-error',
        containerClassName,
      )}
    >
      {label ? (
        <label className="nx-field__label" htmlFor={inputId}>
          {label}
          {required ? (
            <span className="nx-field__required" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <div className={cx('nx-field__control', `nx-field__control--${size}`)}>
        {leftIcon ? (
          <span className="nx-field__icon nx-field__icon--left" aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}

        <Element
          ref={ref}
          id={inputId}
          name={name}
          type={isSelect ? undefined : type}
          className={cx('nx-field__input', className)}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          rows={isTextarea ? (rest.rows ?? 3) : undefined}
          {...rest}
        >
          {isSelect
            ? options.map((option) =>
                typeof option === 'string' ? (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ) : (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ),
              )
            : null}
        </Element>

        {suffix ? (
          <span className="nx-field__suffix" aria-hidden="true">
            {suffix}
          </span>
        ) : null}

        {rightIcon ? (
          <span className="nx-field__icon nx-field__icon--right">
            {rightIcon}
          </span>
        ) : null}

        {/* Native select arrow is hidden so the custom chevron can be styled. */}
        {isSelect ? (
          <span className="nx-field__chevron" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="nx-field__error" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="nx-field__hint" id={describedById}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
