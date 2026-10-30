/**
 * NexERP — Navbar
 * ---------------------------------------------------------------------------
 * Chrome for the app shell and the auth screens.
 *
 *  - `Navbar`        the signed-in header (delegates to Topbar, which owns the
 *                    search palette and the live-connection pill)
 *  - `AuthNavbar`    the marketing bar shown above Login/Register/ForgotPassword
 *  - `Brand`         the animated wordmark, shared by the sidebar, the app
 *                    shell and the auth screens so the logo is drawn once
 *
 * The mobile drawer is *not* state here: the layout renders <Sidebar> and
 * <Topbar> side by side and owns the open flag, which keeps the shell's
 * chrome state in one place.
 *
 * @example
 * <Navbar title="Sales" />
 */

import { Link } from 'react-router-dom';
import { FiArrowRight, FiZap } from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import Topbar from './Topbar';
import './Navigation.css';
import './Layout.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/** Shared brand lockup: the gradient mark plus the wordmark. */
export function Brand({
  compact = false,
  to = '/',
  tagline = 'Commerce & operations',
}) {
  return (
    <Link to={to} className={cx('nx-brand', compact && 'is-compact')} aria-label="NexERP home">
      <span className="nx-brand__mark" aria-hidden="true">
        <span className="nx-brand__glyph">N</span>
      </span>

      <span className="nx-brand__text">
        <span className="nx-brand__name">
          Nex<span className="text-gradient">ERP</span>
        </span>
        {!compact ? <span className="nx-brand__tagline">{tagline}</span> : null}
      </span>
    </Link>
  );
}

/**
 * The signed-in app header. A page can pass `children` to render its own
 * controls (a date-range picker, a filter bar) in place of the default set.
 */
export default function Navbar({ variant = 'vendor', title, onOpenSidebar, children }) {
  return (
    <div className={cx('nx-navbar-shell', variant === 'admin' && 'is-admin')}>
      {children ?? <Topbar title={title} onOpenSidebar={onOpenSidebar} />}
    </div>
  );
}

/** Marketing bar for the auth screens. */
export function AuthNavbar({ tagline = 'Sign in to your workspace' }) {
  return (
    <header className="nx-navbar nx-navbar--auth">
      <Brand />

      <div className="nx-navbar__aside">
        <span className="nx-navbar__note">
          <FiZap size={13} aria-hidden="true" />
          {tagline}
        </span>

        <Button to="/register" variant="ghost" size="sm" rightIcon={<FiArrowRight size={14} />}>
          Create workspace
        </Button>
      </div>
    </header>
  );
}
