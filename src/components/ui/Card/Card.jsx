/**
 * ArkCRM — Card
 * ---------------------------------------------------------------------------
 * The product's base surface. Composable (Card + Card.Header + Card.Body +
 * Card.Footer) so a plain content panel and a titled dashboard widget can both
 * be built from the same primitive.
 *
 * @example
 * <Card hoverable tone="success" edgeAccent>
 *   <Card.Header title="Low stock" subtitle="8 items need reordering"
 *                action={<Button size="sm">Restock</Button>} />
 *   <Card.Body>…</Card.Body>
 * </Card>
 */

import { forwardRef } from 'react';
import './Card.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/**
 * @param {boolean} [hoverable] adds the lift + glow treatment on hover
 * @param {'success'|'warning'|'danger'|'info'} [tone] tints the status rail
 * @param {boolean} [edgeAccent] draws the coloured hairline across the top
 * @param {'none'|'sm'|'md'|'lg'} [padding='md']
 * @param {boolean} [sheen] enables the cursor-tracked radial highlight
 */
const Card = forwardRef(function Card(
  {
    children,
    hoverable = false,
    tone,
    edgeAccent = false,
    padding = 'md',
    sheen = false,
    glass = false,
    as: Element = 'div',
    className = '',
    ...rest
  },
  ref,
) {
  return (
    <Element
      ref={ref}
      className={cx(
        'nx-card',
        `nx-card--pad-${padding}`,
        hoverable && 'nx-card--hover',
        sheen && 'nx-card--sheen',
        edgeAccent && 'nx-card--edge',
        tone && `nx-card--edge-${tone}`,
        glass && 'nx-card--glass',
        className,
      )}
      {...rest}
    >
      {children}
    </Element>
  );
});

/* -------------------------------------------------------------------------
 * HEADER
 * ---------------------------------------------------------------------- */
export function CardHeader({ title, subtitle, action, icon, className = '', children }) {
  return (
    <header className={cx('nx-card__header', className)}>
      {icon ? <span className="nx-card__header-icon">{icon}</span> : null}

      <div className="nx-card__header-text">
        {title ? <h3 className="nx-card__title">{title}</h3> : null}
        {subtitle ? <p className="nx-card__subtitle">{subtitle}</p> : null}
        {children}
      </div>

      {action ? <div className="nx-card__header-action">{action}</div> : null}
    </header>
  );
}

/* -------------------------------------------------------------------------
 * BODY / FOOTER
 * ---------------------------------------------------------------------- */
export function CardBody({ children, className = '', flush = false }) {
  return <div className={cx('nx-card__body', flush && 'nx-card__body--flush', className)}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <footer className={cx('nx-card__footer', className)}>{children}</footer>;
}

/** A hairline-separated region inside a card body. */
export function CardDivider({ className = '' }) {
  return <hr className={cx('nx-card__divider', className)} />;
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Divider = CardDivider;

export default Card;
