/**
 * ArkCRM — GlobalSearchModal
 * ---------------------------------------------------------------------------
 * Enterprise-wide command palette. Debounced (so a keystroke does not hit the
 * API), keyboard-navigable (arrow keys + Enter), and scoped by entity type so
 * results stay legible.
 *
 * Opened with ⌘K / Ctrl+K from anywhere; VendorLayout binds the shortcut.
 *
 * @example
 * <GlobalSearchModal open={open} onClose={close} />
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchQuery } from '@/services/searchApi';
import LoadingState from '@/components/feedback/LoadingState';
import Badge from '@/components/ui/Badge/Badge';
import './Navigation.css';

/** Group ordering in the results list. */
const TYPE_ORDER = ['Customer', 'Product', 'Invoice', 'Project', 'Employee', 'Ticket'];

/** Fallback tone per type, used when the index does not carry one. */
const TYPE_TONE = {
  Customer: 'info',
  Product: 'accent',
  Invoice: 'warning',
  Project: 'violet',
  Employee: 'neutral',
  Ticket: 'danger',
};

/** Below this the palette stays in its idle state — no request is sent. */
const MIN_TERM = 2;

export default function GlobalSearchModal({ open, onClose, placeholder = 'Search customers, invoices, products…' }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const debouncedTerm = useDebounce(term, 250);
  const query = debouncedTerm.trim();
  const hasQuery = query.length >= MIN_TERM;

  /* Reset when the palette closes so the next open starts clean. */
  useEffect(() => {
    if (!open) {
      setTerm('');
      setActiveIndex(0);
    }
  }, [open]);

  /* Focus the field as soon as the palette mounts. */
  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [open]);

  /* One debounced request per term. `skip` keeps the idle palette silent, and
     RTK Query drops the previous request's result automatically. */
  const { data, isFetching } = useSearchQuery(
    { q: query, limit: 12 },
    { skip: !open || !hasQuery },
  );

  const results = useMemo(() => {
    const items = data?.results ?? [];
    return [...items].sort(
      (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type),
    );
  }, [data]);

  /* A new result set always starts highlighted at the top. */
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  const isSearching = isFetching && hasQuery;

  const goTo = useCallback(
    (result) => {
      if (!result) return;
      onClose();
      navigate(result.to);
    },
    [navigate, onClose],
  );

  /* ---- keyboard navigation ---- */
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (!results.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % results.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + results.length) % results.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        goTo(results[activeIndex]);
      }
    },
    [results, activeIndex, goTo, onClose],
  );

  /* Keep the highlighted row in view while arrowing through a long list. */
  useEffect(() => {
    const node = listRef.current?.querySelector('.nx-search__result.is-active');
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const grouped = useMemo(() => {
    return results.reduce((acc, result) => {
      (acc[result.type] ||= []).push(result);
      return acc;
    }, {});
  }, [results]);

  if (!open) return null;

  return (
    <div className="nx-search-overlay" onKeyDown={handleKeyDown}>
      <div className="nx-search__scrim" onClick={onClose} aria-hidden="true" />

      <div
        className="nx-search__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
      >
        <div className="nx-search__bar">
          <span className="nx-search__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>

          <input
            ref={inputRef}
            className="nx-search__input"
            type="text"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="nx-search-results"
            aria-autocomplete="list"
            aria-label="Search"
            placeholder={placeholder}
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setActiveIndex(0);
            }}
            autoComplete="off"
            spellCheck={false}
          />

          {isSearching ? <span className="nx-spinner nx-spinner--sm" aria-label="Searching" /> : null}

          <button
            type="button"
            className="nx-nav-trigger"
            onClick={onClose}
            aria-label="Close search"
          >
            <span className="nx-kbd">ESC</span>
          </button>
        </div>

        <div className="nx-search__results" id="nx-search-results" ref={listRef} role="listbox">
          {!hasQuery ? (
            <div className="nx-search__group-label">Start typing to search</div>
          ) : isSearching && !results.length ? (
            <LoadingState mode="skeleton" variant="list" rows={4} className="nx-skeleton-stack" />
          ) : results.length === 0 ? (
            <div className="stack" style={{ padding: 'var(--nx-space-8)', textAlign: 'center' }}>
              <p className="text-muted">No results for “{term}”</p>
              <p className="text-xs text-dim">
                Try a customer name, invoice number, SKU or project code.
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type}>
                <div className="nx-search__group-label">{type}</div>
                {items.map((result) => {
                  const index = results.indexOf(result);
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      className={`nx-search__result${index === activeIndex ? ' is-active' : ''}`}
                      onClick={() => goTo(result)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="nx-search__result-icon" aria-hidden="true">
                        {type.charAt(0)}
                      </span>

                      <span className="nx-search__result-body">
                        <span className="nx-search__result-title">{result.title}</span>
                        <span className="nx-search__result-subtitle">{result.subtitle}</span>
                      </span>

                      <span className="nx-search__result-type">
                        <Badge tone={result.tone ?? TYPE_TONE[result.type] ?? 'neutral'} size="xs">
                          {result.meta ?? result.type}
                        </Badge>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="nx-search__footer">
          <div className="nx-search__hints">
            <span className="nx-search__hint">
              <span className="nx-kbd">↑</span>
              <span className="nx-kbd">↓</span> navigate
            </span>
            <span className="nx-search__hint">
              <span className="nx-kbd">↵</span> open
            </span>
            <span className="nx-search__hint">
              <span className="nx-kbd">esc</span> close
            </span>
          </div>

          <span className="text-xs text-dim">
            {results.length ? `${results.length} result${results.length === 1 ? '' : 's'}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
