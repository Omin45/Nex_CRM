/**
 * NexERP — NotificationDropdown
 * ---------------------------------------------------------------------------
 * The bell menu. Reads the same RTK Query cache entry as the toast stream, so
 * marking an item read here immediately clears the badge everywhere else.
 *
 * @example
 * <NotificationDropdown />   // self-contained; renders its own trigger
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} from '@/features/notifications/api/notificationsApi';
import { useOutsideClick, useEscapeKey } from '@/hooks/useOutsideClick';
import { fromNow } from '@/utils/date';
import Badge from '@/components/ui/Badge/Badge';
import LoadingState from '@/components/feedback/LoadingState';
import EmptyState from '@/components/feedback/EmptyState';
import { apiRoutes } from '@/config/constants';
import './Navigation.css';

/** Category -> tone + glyph. The glyph keeps categories distinguishable for
 *  users who cannot rely on colour alone. */
const CATEGORY = {
  order: { tone: 'info', glyph: '◈' },
  invoice: { tone: 'warning', glyph: '₦' },
  payment: { tone: 'success', glyph: '✓' },
  stock: { tone: 'danger', glyph: '▣' },
  support: { tone: 'violet', glyph: '?' },
  system: { tone: 'neutral', glyph: '•' },
};

const cx = (...classes) => classes.filter(Boolean).join(' ');

export default function NotificationDropdown({ limit = 6, onNavigate = null }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    /* Return focus to the bell so keyboard users are not dropped at the top of
       the document. */
    triggerRef.current?.focus();
  }, []);

  useOutsideClick(close, containerRef, open);
  useEscapeKey(close, open);

  const { data, isLoading, isFetching } = useGetNotificationsQuery(
    { size: 20 },
    { skip: !open },
  );
  const { data: unread } = useGetUnreadCountQuery();
  const [markRead] = useMarkReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllReadMutation();

  const items = useMemo(() => (Array.isArray(data) ? data : (data?.items ?? [])), [data]);
  const unreadCount = unread?.count ?? items.filter((n) => !n.read).length;
  const visible = items.slice(0, limit);

  const openItem = useCallback(
    async (item) => {
      if (!item.read) markRead(item.id);
      setOpen(false);
      if (item.to) {
        if (onNavigate) onNavigate(item);
        navigate(item.to);
      }
    },
    [markRead, navigate, onNavigate],
  );

  const handleToggle = useCallback(() => setOpen((prev) => !prev), []);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      }
    },
    [handleToggle],
  );

  return (
    <div className="nx-nav-menu-anchor" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={cx('nx-nav-trigger', open && 'is-open')}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
        }
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" />
        </svg>

        {unreadCount > 0 ? (
          <span className="nx-nav-trigger__badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="nx-dropdown" role="dialog" aria-label="Notifications">
          <div className="nx-dropdown__header">
            <div>
              <p className="nx-dropdown__title">Notifications</p>
              {unreadCount > 0 ? (
                <p className="nx-dropdown__subtitle">
                  {unreadCount} unread
                </p>
              ) : null}
            </div>

            {unreadCount > 0 ? (
              <button
                type="button"
                className="nx-link"
                onClick={() => markAllRead()}
                disabled={isMarkingAll}
              >
                {isMarkingAll ? 'Marking…' : 'Mark all read'}
              </button>
            ) : null}
          </div>

          <div className="nx-dropdown__list">
            {isLoading && !items.length ? (
              <LoadingState mode="skeleton" variant="list" rows={4} className="nx-skeleton-stack" />
            ) : items.length === 0 ? (
              <EmptyState
                className="nx-empty--inline"
                title="You're all caught up"
                description="New orders, payments and stock alerts will appear here."
              />
            ) : (
              <>
                {visible.map((item) => {
                  const category = CATEGORY[item.category] ?? CATEGORY.system;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cx('nx-menu-item', !item.read && 'is-active')}
                      onClick={() => openItem(item)}
                    >
                      <span className="nx-menu-item__icon" aria-hidden="true">
                        {category.glyph}
                      </span>

                      <span className="nx-menu-item__body">
                        <span className="nx-menu-item__title">{item.title}</span>
                        <span className="nx-menu-item__description">{item.message}</span>
                      </span>

                      <span className="nx-menu-item__meta">{fromNow(item.at ?? item.createdAt)}</span>
                    </button>
                  );
                })}

                {items.length > visible.length ? (
                  <p className="nx-dropdown__subtitle" style={{ padding: 'var(--nx-space-3) var(--nx-space-4)' }}>
                    {items.length - visible.length} older notification{items.length - visible.length === 1 ? '' : 's'}
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className="nx-dropdown__footer">
            <button
              type="button"
              className="nx-link"
              onClick={() => {
                setOpen(false);
                navigate(apiRoutes.notifications.list);
              }}
            >
              View notification centre
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
