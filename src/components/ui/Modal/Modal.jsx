/**
 * NexERP — Modal
 * ---------------------------------------------------------------------------
 * Frosted floating dialog. Renders through a portal, locks body scroll, traps
 * focus, closes on Escape or scrim click, and restores focus to the trigger on
 * close — the full accessibility contract, not just a styled overlay.
 *
 * @example
 * <Modal open={isOpen} onClose={close} title="Create invoice"
 *        footer={<><Button variant="ghost" onClick={close}>Cancel</Button>
 *                <Button onClick={save}>Save</Button></>}>
 *   …
 * </Modal>
 */

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from '../Button/Button';
import './Modal.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/** Every focusable descendant, in document order — drives the focus trap. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer = null,
  size = 'md',
  /** Disables Escape and scrim dismissal, for destructive confirmations. */
  dismissible = true,
  closeOnScrimClick = true,
  showCloseButton = true,
  className = '',
  bodyClassName = '',
  initialFocusRef = null,
}) {
  const panelRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  /* ---- scroll lock -------------------------------------------------- */
  useEffect(() => {
    if (!open) return undefined;
    /* Compensate for the vanishing scrollbar so the page does not shift. */
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const { overflow, paddingRight } = document.body.style;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [open]);

  /* ---- focus management --------------------------------------------- */
  useEffect(() => {
    if (!open) return undefined;

    previouslyFocusedRef.current = document.activeElement;

    /* Defer a frame so the panel has mounted and is measurable. */
    const frame = requestAnimationFrame(() => {
      const target = initialFocusRef?.current ?? panelRef.current?.querySelector(FOCUSABLE);
      (target ?? panelRef.current)?.focus?.();
    });

    return () => {
      cancelAnimationFrame(frame);
      /* Return focus to whatever opened the dialog. */
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, initialFocusRef]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape' && dismissible) {
        event.stopPropagation();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;

      /* Focus trap: wrap from last focusable back to the first. */
      const focusables = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (!focusables?.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [dismissible, onClose],
  );

  if (!open) return null;

  return createPortal(
    <div
      className="nx-modal-root"
      /* Escape is handled on the panel so nested dialogs behave predictably. */
      onKeyDown={handleKeyDown}
    >
      {/* Scrim: clicking it dismisses unless closeOnScrimClick is false. */}
      <div
        className="nx-modal__scrim"
        onClick={closeOnScrimClick && dismissible ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        className={cx('nx-modal__panel', `nx-modal__panel--${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'nx-modal-title' : undefined}
        aria-describedby={subtitle ? 'nx-modal-subtitle' : undefined}
        tabIndex={-1}
      >
        {(title || showCloseButton) && (
          <header className="nx-modal__header">
            <div className="nx-modal__header-text">
              {title ? (
                <h2 className="nx-modal__title" id="nx-modal-title">
                  {title}
                </h2>
              ) : null}
              {subtitle ? (
                <p className="nx-modal__subtitle" id="nx-modal-subtitle">
                  {subtitle}
                </p>
              ) : null}
            </div>

            {showCloseButton ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close dialog"
                className="nx-modal__close"
                leftIcon={<CloseIcon />}
              />
            ) : null}
          </header>
        )}

        <div className={cx('nx-modal__body', bodyClassName)}>{children}</div>

        {footer ? <footer className="nx-modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

/** Inline so the primitive has no icon-library import. */
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
