/**
 * NexERP — Sidebar
 * ---------------------------------------------------------------------------
 * Primary navigation rail. Three behaviours worth knowing:
 *
 *  - Desktop collapses to an 76px icon rail; the choice is persisted.
 *  - Below 1024px it becomes an off-canvas drawer with a scrim, opened by the
 *    topbar's hamburger. The drawer traps nothing but closes on Escape, on
 *    scrim click and on navigation.
 *  - The active item gets a glowing left indicator plus a pale-blue wash; the
 *    group auto-expands so the current page is always visible.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FiChevronLeft, FiChevronRight, FiCommand, FiX,
} from 'react-icons/fi';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import {
  filterNavigation, isNavItemActive,
} from '@/config/navigation.config';
import { STORAGE_KEYS } from '@/config/constants';
import { NAV_ICONS } from '@/config/navigation.config';
import './Navigation.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

function readCollapsed() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === 'true';
}

export default function Sidebar({
  groups,
  isOpen = false,
  onClose = () => {},
  variant = 'vendor',
}) {
  const location = useLocation();
  const { can } = usePermissions();
  const { tenant } = useAuth();

  const [collapsed, setCollapsed] = useState(readCollapsed);
  /* An open group stays open while navigating, so the user is not fighting
     the accordion. */
  const [manuallyOpened, setManuallyOpened] = useState({});
  const [manuallyClosed, setManuallyClosed] = useState({});
  const drawerRef = useRef(null);

  const visibleGroups = useMemo(
    () => filterNavigation(groups, can),
    [groups, can],
  );

  const activeGroupId = useMemo(
    () =>
      visibleGroups.find((group) =>
        group.items.some((item) => isNavItemActive(item, location.pathname)),
      )?.id ?? null,
    [visibleGroups, location.pathname],
  );

  /* Persist the desktop collapse choice. */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(collapsed));
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => setCollapsed((prev) => !prev), []);

  const toggleGroup = useCallback((groupId) => {
    setManuallyOpened((prev) => ({ ...prev, [groupId]: true }));
    setManuallyClosed((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  }, []);

  const collapseGroup = useCallback((groupId) => {
    setManuallyClosed((prev) => ({ ...prev, [groupId]: true }));
    setManuallyOpened((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  }, []);

  /* Close the mobile drawer whenever the route changes. */
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  /* Escape closes the drawer; the scrim handles pointer dismissal. */
  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    /* Stop the page behind the drawer from scrolling. */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  const isGroupOpen = useCallback(
    (group) => {
      if (manuallyClosed[group.id]) return false;
      if (manuallyOpened[group.id]) return true;
      /* Open by default when the current page lives inside it. */
      return activeGroupId === group.id || group.items.length <= 2;
    },
    [activeGroupId, manuallyOpened, manuallyClosed],
  );

  return (
    <>
      {/* Scrim, mobile only. */}
      {isOpen ? (
        <div className="nx-sidebar__scrim" onClick={onClose} aria-hidden="true" />
      ) : null}

      <aside
        ref={drawerRef}
        className={cx('nx-sidebar', collapsed && 'is-collapsed', isOpen && 'is-open')}
        aria-label="Main navigation"
        data-variant={variant}
      >
        {/* ---- Brand ---- */}
        <div className="nx-sidebar__brand">
          <NavLink to="/" className="nx-brand" aria-label="NexERP home">
            <span className="nx-brand__mark" aria-hidden="true">
              <span className="nx-brand__glyph">N</span>
            </span>
            {!collapsed ? (
              <span className="nx-brand__text">
                <span className="nx-brand__name">Nex<span className="text-gradient">ERP</span></span>
                <span className="nx-brand__tagline">Commerce &amp; operations</span>
              </span>
            ) : null}
          </NavLink>

          <button
            type="button"
            className="nx-sidebar__close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* ---- Tenant / scope chip ---- */}
        {!collapsed && tenant?.name ? (
          <div className="nx-sidebar__tenant">
            <span className="nx-sidebar__tenant-mark" aria-hidden="true">
              {tenant.name.charAt(0).toUpperCase()}
            </span>
            <span className="nx-sidebar__tenant-body">
              <span className="nx-sidebar__tenant-name">{tenant.name}</span>
              <span className="nx-sidebar__tenant-plan">{tenant.plan ?? 'Business plan'}</span>
            </span>
          </div>
        ) : null}

        {/* ---- Groups ---- */}
        <nav className="nx-sidebar__nav">
          {visibleGroups.map((group) => {
            const open = !collapsed && isGroupOpen(group);
            const GroupIcon = NAV_ICONS[group.id] ?? FiCommand;

            return (
              <div className="nx-sidebar__group" key={group.id}>
                {collapsed ? (
                  <div className="nx-sidebar__group-label" title={group.label}>
                    <GroupIcon size={13} aria-hidden="true" />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="nx-sidebar__group-label is-button"
                    onClick={() => (open ? collapseGroup(group.id) : toggleGroup(group.id))}
                    aria-expanded={open}
                  >
                    <span>{group.label}</span>
                    <FiChevronRight
                      size={13}
                      className={cx('nx-sidebar__chevron', open && 'is-open')}
                      aria-hidden="true"
                    />
                  </button>
                )}

                <ul className={cx('nx-sidebar__list', open && 'is-open')}>
                  {group.items.map((item) => {
                    const Icon = item.icon ?? FiCommand;

                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) =>
                            cx('nx-sidebar__link', isActive && 'is-active')
                          }
                          title={collapsed ? item.label : undefined}
                        >
                          <span className="nx-sidebar__icon" aria-hidden="true">
                            <Icon size={17} />
                          </span>

                          {!collapsed ? <span className="nx-sidebar__text">{item.label}</span> : null}

                          {item.badge ? (
                            <span className="nx-sidebar__badge">{item.badge}</span>
                          ) : null}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* ---- Collapse control (desktop only) ---- */}
        <div className="nx-sidebar__footer">
          <button
            type="button"
            className="nx-sidebar__collapse"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? <FiChevronRight size={15} /> : <FiChevronLeft size={15} />}
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </div>
      </aside>
    </>
  );
}
