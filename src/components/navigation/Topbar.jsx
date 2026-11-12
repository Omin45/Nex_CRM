/**
 * ArkCRM — Topbar
 * ---------------------------------------------------------------------------
 * The app shell's header: drawer toggle (mobile), page context, the command
 * palette trigger, live-connection indicator and the account controls.
 *
 * Keyboard: ⌘K / Ctrl+K anywhere in the shell opens the search palette.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCommand, FiMenu, FiSearch } from 'react-icons/fi';
import Breadcrumb from './Breadcrumb';
import GlobalSearchModal from './GlobalSearchModal';
import NotificationDropdown from './NotificationDropdown';
import UserProfileDropdown from './UserProfileDropdown';
import { useSocket } from '@/context/SocketContext';
import './Navigation.css';
import './Layout.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/** Socket status -> the wording shown in the pill. */
const STATUS_LABEL = {
  connected: 'Live',
  connecting: 'Connecting',
  disconnected: 'Offline',
  error: 'Connection error',
};

export default function Topbar({
  onOpenSidebar,
  title,
  /** Extra controls injected by a page (e.g. a range picker). */
  children,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { status } = useSocket();
  const searchTriggerRef = useRef(null);

  const openSearch = useCallback(() => setSearchOpen(true), []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    searchTriggerRef.current?.focus();
  }, []);

  /* ⌘K / Ctrl+K, and "/" as a fallback for keyboard-first users. */
  useEffect(() => {
    const onKeyDown = (event) => {
      const isPaletteKey =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';

      const isSlash =
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        /* Don't hijack "/" while someone is typing. */
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

      if (isPaletteKey || isSlash) {
        event.preventDefault();
        openSearch();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearch]);

  return (
    <>
      <header className="nx-topbar">
        <button
          type="button"
          className="nx-topbar__menu"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
        >
          <FiMenu size={19} />
        </button>

        <div className="nx-topbar__context">
          {title ? <span className="nx-topbar__title">{title}</span> : null}
          <Breadcrumb />
        </div>

        {children}

        {/* The search affordance is a real button so it is reachable by tab
            and announced; the shortcut chip is decoration. */}
        <button
          ref={searchTriggerRef}
          type="button"
          className="nx-topbar__search"
          onClick={openSearch}
          aria-label="Search (Command K)"
        >
          <FiSearch size={15} aria-hidden="true" />
          <span className="nx-topbar__search-text">Search anything…</span>
          <span className="nx-kbd">
            <FiCommand size={10} aria-hidden="true" />K
          </span>
        </button>

        <div className="nx-topbar__spacer" />

        <div className="nx-topbar__actions">
          <span
            className={cx('nx-conn', 'hide-mobile')}
            data-status={status}
            title={
              status === 'connected'
                ? 'Realtime updates are streaming'
                : 'Realtime updates are paused; data may be stale'
            }
          >
            <span className="nx-conn__dot" />
            {STATUS_LABEL[status] ?? 'Unknown'}
          </span>

          <NotificationDropdown />
          <UserProfileDropdown />
        </div>
      </header>

      <GlobalSearchModal open={searchOpen} onClose={closeSearch} />
    </>
  );
}
