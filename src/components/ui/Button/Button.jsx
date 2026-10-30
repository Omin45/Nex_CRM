/**
 * NexERP — Button
 * ---------------------------------------------------------------------------
 * The single interactive primitive. Every clickable control in the app is
 * either this component or a link styled as one, which is what keeps the
 * hover choreography (shimmer sweep, glow border, press scale) identical
 * everywhere.
 *
 * @example
 * <Button variant="primary" size="md" leftIcon={<FiPlus />} loading={isSaving}>
 *   Create invoice
 * </Button>
 */

import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import './Button.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

export const BUTTON_VARIANTS = {
  /** Pale-blue gradient fill — one per view. */
  primary: 'nx-btn--primary',
  /** Frosted glass fill for secondary actions on dark surfaces. */
  secondary: 'nx-btn--secondary',
  /** Hairline outline, transparent fill. */
  outline: 'nx-btn--outline',
  /** Text-only, for low-emphasis actions inside toolbars. */
  ghost: 'nx-btn--ghost',
  danger: 'nx-btn--danger',
  success: 'nx-btn--success',
};

export const BUTTON_SIZES = {
  xs: 'nx-btn--xs',
  sm: 'nx-btn--sm',
  md: 'nx-btn--md',
  lg: 'nx-btn--lg',
  /** Square icon-only button; pass `aria-label`. */
  icon: 'nx-btn--icon',
};

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    loading = false,
    disabled = false,
    fullWidth = false,
    leftIcon = null,
    rightIcon = null,
    /** Renders a react-router <Link> instead of a <button>. */
    to = null,
    href = null,
    className = '',
    shimmer = true,
    onClick,
    'aria-label': ariaLabel,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  const classes = cx(
    'nx-btn',
    BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.primary,
    BUTTON_SIZES[size] ?? BUTTON_SIZES.md,
    fullWidth && 'nx-btn--full',
    shimmer && 'nx-btn--shimmer',
    loading && 'is-loading',
    isDisabled && 'is-disabled',
    className,
  );

  const content = (
    <>
      {/* Spinner replaces the leading icon while a request is in flight. */}
      {loading ? (
        <span className="nx-btn__spinner" aria-hidden="true" />
      ) : (
        leftIcon && <span className="nx-btn__icon">{leftIcon}</span>
      )}

      {/* Rendered in a span so the flex centring survives a bare-text button. */}
      {children ? <span className="nx-btn__label">{children}</span> : null}

      {!loading && rightIcon ? <span className="nx-btn__icon">{rightIcon}</span> : null}
    </>
  );

  /* Anchor / router-link variants. `disabled` is meaningless on an anchor, so
     it is expressed via aria-disabled and a pointer-events guard in CSS.
     `onClick` is forwarded too — a Link button needs it for exit animations
     and analytics. */
  if (to || href) {
    const LinkComponent = to ? Link : 'a';
    return (
      <LinkComponent
        ref={ref}
        to={to}
        href={href}
        className={classes}
        aria-label={ariaLabel}
        aria-disabled={isDisabled || undefined}
        tabIndex={isDisabled ? -1 : undefined}
        onClick={isDisabled ? undefined : onClick}
        {...(href ? { rel: 'noopener noreferrer' } : {})}
        {...rest}
      >
        {content}
      </LinkComponent>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      onClick={onClick}
      {...rest}
    >
      {content}
    </button>
  );
});

export default Button;
