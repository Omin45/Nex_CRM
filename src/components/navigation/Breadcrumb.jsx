/**
 * NexERP — Breadcrumb
 * ---------------------------------------------------------------------------
 * Derives the trail from the URL, so it can never drift from the router.
 * Segments are labelled from SEGMENT_LABELS; the final crumb picks up a
 * human name from the record when the layout has one loaded (a customer's
 * name, an invoice number), which is why `resolveLabel` is injectable.
 *
 * @example
 * <Breadcrumb resolveLabel={(segment) => customer?.name} />
 */

import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiChevronRight, FiHome } from 'react-icons/fi';
import { labelForSegment, appRoutes } from '@/config/navigation.config';
import useVendorPath from '@/hooks/useVendorPath';
import './Layout.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

export default function Breadcrumb({ resolveLabel = null, showHome = true }) {
  const { pathname } = useLocation();

  /* Drop the trailing slash so "/" and "/dashboard/" behave the same. */
  const segments = pathname.split('/').filter(Boolean);

  if (!segments.length) return null;

  const crumbs = segments.map((segment, index) => {
    const to = `/${segments.slice(0, index + 1).join('/')}`;
    const isLast = index === segments.length - 1;

    /* A record id is a UUID or a business key; the nav label map has no
       entry for it, so the caller's resolver gets first refusal. */
    const looksLikeRecord = /^[0-9a-f-]{8,}$/i.test(segment) || /^[A-Z]{2,4}-?\d{2,}$/.test(segment);
    const resolved = looksLikeRecord ? resolveLabel?.(segment, to) : null;

    return {
      segment,
      to,
      isLast,
      label: resolved ?? labelForSegment(segment),
    };
  });

  return (
    <nav className="nx-crumbs" aria-label="Breadcrumb">
      {showHome ? (
        <Fragment>
          <Link to="/" className="nx-crumbs__item is-link" aria-label="Home">
            <FiHome size={13} aria-hidden="true" />
          </Link>
          <span className="nx-crumbs__sep" aria-hidden="true">
            <FiChevronRight size={12} />
          </span>
        </Fragment>
      ) : null}

      {crumbs.map((crumb) => (
        <Fragment key={crumb.to}>
          {crumb.isLast ? (
            /* The current page is not a link. */
            <span className={cx('nx-crumbs__item', 'is-current')} aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <>
              <Link to={crumb.to} className="nx-crumbs__item is-link">
                {crumb.label}
              </Link>
              <span className="nx-crumbs__sep" aria-hidden="true">
                <FiChevronRight size={12} />
              </span>
            </>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

/** Convenience wrapper: the breadcrumb a given page should show. The default
 *  `to` is the tenant dashboard, resolved to the signed-in vendor's workspace. */
export function PageBreadcrumb({ label, to }) {
  const vendorPath = useVendorPath();
  const href = to ?? vendorPath(appRoutes.vendor.dashboard);

  return (
    <nav className="nx-crumbs" aria-label="Breadcrumb">
      <Link to="/" className="nx-crumbs__item is-link">
        NexERP
      </Link>
      <span className="nx-crumbs__sep" aria-hidden="true">
        <FiChevronRight size={12} />
      </span>
      <Link to={href} className="nx-crumbs__item is-link">
        Workspace
      </Link>
      <span className="nx-crumbs__sep" aria-hidden="true">
        <FiChevronRight size={12} />
      </span>
      <span className="nx-crumbs__item is-current" aria-current="page">
        {label}
      </span>
    </nav>
  );
}
