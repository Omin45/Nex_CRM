/**
 * ArkCRM — UserProfileDropdown
 * ---------------------------------------------------------------------------
 * The avatar menu: identity block, quick links into the user's own records,
 * theme switch, and the destructive sign-out.
 *
 * @example
 * <UserProfileDropdown />
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import useVendorPath from '@/hooks/useVendorPath';
import { useTheme } from '@/context/ThemeContext';
import { useOutsideClick, useEscapeKey } from '@/hooks/useOutsideClick';
import { appRoutes } from '@/config/navigation.config';
import { ROLE_LABELS } from '@/config/permissions.config';
import Badge from '@/components/ui/Badge/Badge';
import './Navigation.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/** "Adaeze Okonkwo" -> "AO" */
function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export default function UserProfileDropdown() {
  const navigate = useNavigate();
  const { user, tenant, logout, isPlatformAdmin } = useAuth();
  const vendorPath = useVendorPath();
  const { theme, setTheme, isDark } = useTheme();

  /* Workspace settings live under /vendor/:vendorId. A platform admin has no
     tenant, so the same menu item falls back to the platform's system screen. */
  const preferencesHref = isPlatformAdmin
    ? appRoutes.admin.system
    : vendorPath(appRoutes.vendor.settings.preferences);

  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useOutsideClick(close, containerRef, open);
  useEscapeKey(close, open);

  const displayName = useMemo(
    () => user?.name ?? [user?.firstName, user?.lastName].filter(Boolean).join(' ') ?? 'User',
    [user],
  );

  const roleLabel = ROLE_LABELS[user?.role] ?? user?.role ?? 'Member';

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await logout();
      /* The route guard will bounce an unauthenticated visitor to /login; the
         explicit replace keeps the guarded page out of the history. */
      navigate('/login', { replace: true });
    } finally {
      setIsSigningOut(false);
      setOpen(false);
    }
  }, [logout, navigate]);

  const go = useCallback(
    (to) => {
      close();
      navigate(to);
    },
    [navigate, close],
  );

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  return (
    <div className="nx-nav-menu-anchor" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={cx('nx-nav-trigger', 'nx-nav-trigger--avatar', open && 'is-open')}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${displayName}`}
      >
        <span className="nx-avatar" aria-hidden="true">
          {initials(displayName)}
        </span>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="nx-dropdown nx-dropdown--profile" role="menu" aria-label="Account">
          <div className="nx-profile-head">
            <span className="nx-profile-head__avatar" aria-hidden="true">
              {initials(displayName)}
            </span>

            <div className="nx-profile-head__body">
              <p className="nx-profile-head__name">{displayName}</p>
              <div className="nx-profile-head__meta">
                <span>{user?.email}</span>
              </div>
              <div className="nx-profile-head__meta">
                <Badge tone="accent" size="xs">
                  {roleLabel}
                </Badge>
                {tenant?.name ? (
                  <span className="text-xs text-dim" title={tenant.name}>
                    {tenant.name}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="nx-dropdown__group">
            <button type="button" role="menuitem" className="nx-menu-item" onClick={() => go(appRoutes.profile)}>
              <span className="nx-menu-item__icon" aria-hidden="true">◉</span>
              <span className="nx-menu-item__body">
                <span className="nx-menu-item__title">My profile</span>
                <span className="nx-menu-item__description">Personal details and security</span>
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              className="nx-menu-item"
              onClick={() => go(preferencesHref)}
            >
              <span className="nx-menu-item__icon" aria-hidden="true">⚙</span>
              <span className="nx-menu-item__body">
                <span className="nx-menu-item__title">Preferences</span>
                <span className="nx-menu-item__description">Notifications, locale, currency</span>
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              className="nx-menu-item"
              onClick={toggleTheme}
              aria-pressed={!isDark}
            >
              <span className="nx-menu-item__icon" aria-hidden="true">
                {isDark ? '☀' : '☾'}
              </span>
              <span className="nx-menu-item__body">
                <span className="nx-menu-item__title">
                  {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                </span>
                <span className="nx-menu-item__description">
                  Currently using the {theme} theme
                </span>
              </span>
            </button>

            {user?.tenantId ? (
              <button
                type="button"
                role="menuitem"
                className="nx-menu-item"
                onClick={() => go(vendorPath(appRoutes.vendor.settings.company))}
              >
                <span className="nx-menu-item__icon" aria-hidden="true">◇</span>
                <span className="nx-menu-item__body">
                  <span className="nx-menu-item__title">Company settings</span>
                  <span className="nx-menu-item__description">Billing, branding, users</span>
                </span>
              </button>
            ) : null}
          </div>

          <div className="nx-menu-separator" role="separator" />

          <button
            type="button"
            role="menuitem"
            className="nx-menu-item nx-menu-item--danger"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            <span className="nx-menu-item__icon" aria-hidden="true">⏻</span>
            <span className="nx-menu-item__body">
              <span className="nx-menu-item__title">
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </span>
              <span className="nx-menu-item__description">End this session on this device</span>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
