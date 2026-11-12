/**
 * ArkCRM — ExportMenu
 * ---------------------------------------------------------------------------
 * The export button on every list screen.
 *
 * A list can be exported three ways and every screen should offer the same
 * three, so the menu is built once here rather than copied page by page. The
 * exporters themselves live in utils/export.js: CSV, a spreadsheet-readable
 * .xls, and print-to-PDF.
 *
 * The columns are described by data, the same shape the table already uses,
 * so what the user exports is exactly what they were looking at.
 *
 * The menu is rendered through a portal. It has to be: the page header runs
 * a reveal animation, and a transformed ancestor creates a stacking context —
 * which would trap the menu behind the cards below the header no matter how
 * high its z-index went.
 *
 * @example
 * <ExportMenu
 *   columns={[{ key: 'number', label: 'Invoice' }, { key: 'total', label: 'Total' }]}
 *   rows={rows}
 *   filename="invoices"
 *   title="Invoices"
 * />
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiDownload, FiFileText, FiGrid, FiPrinter } from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import useOutsideClick from '@/hooks/useOutsideClick';
import { exportToCSV, exportToExcel, exportToPDF } from '@/utils/export';
import { useNotify } from '@/hooks/useNotification';
import './ExportMenu.css';

const FORMATS = [
  {
    id: 'csv',
    label: 'CSV',
    hint: 'Plain text, opens anywhere',
    icon: FiFileText,
  },
  {
    id: 'excel',
    label: 'Excel',
    hint: 'Spreadsheet with the totals live',
    icon: FiGrid,
  },
  {
    id: 'pdf',
    label: 'PDF',
    hint: 'Print dialog — choose “Save as PDF”',
    icon: FiPrinter,
  },
];

export default function ExportMenu({
  columns = [],
  rows = [],
  filename = 'export',
  title = 'Export',
  subtitle = '',
  size = 'sm',
  variant = 'outline',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const notify = useNotify();

  useOutsideClick(() => setOpen(false), [buttonRef, menuRef], open);

  /* The menu is positioned against the button, so it has to be measured
     whenever it opens and again if the page moves under it. */
  const place = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setAnchor({ top: rect.bottom + 6, right: window.innerWidth - rect.right, width: rect.width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isEmpty = !rows?.length;

  const run = useCallback(
    (format) => {
      setOpen(false);
      setBusy(format);

      /* The exporters are synchronous; the tick keeps the button in its
         pressed state long enough to be visible rather than flickering. */
      setTimeout(() => {
        try {
          const payload = { columns, rows, filename, title, subtitle };
          const done =
            format === 'csv'
              ? exportToCSV(payload)
              : format === 'excel'
                ? exportToExcel(payload)
                : exportToPDF(payload);

          if (done) {
            notify.success(`${title} exported`, {
              message: `${rows.length} row${rows.length === 1 ? '' : 's'} written to your downloads.`,
            });
          }
        } catch {
          notify.error('Could not build the export', {
            message: 'The table was too large to export. Try a narrower filter.',
          });
        } finally {
          setBusy(null);
        }
      }, 0);
    },
    [columns, rows, filename, title, subtitle, notify],
  );

  const menu = open && anchor ? (
    <div
      ref={menuRef}
      className="nx-export__menu"
      role="menu"
      style={{ top: anchor.top, right: anchor.right }}
    >
      <p className="nx-export__heading">
        Export {rows.length} {rows.length === 1 ? 'row' : 'rows'}
      </p>
      {FORMATS.map((format) => {
        const Icon = format.icon;
        return (
          <button
            key={format.id}
            type="button"
            role="menuitem"
            className="nx-export__item"
            onClick={() => run(format.id)}
            disabled={busy !== null}
          >
            <span className="nx-export__item-icon" aria-hidden="true">
              <Icon size={15} />
            </span>
            <span className="nx-export__item-copy">
              <span className="nx-export__item-label">{format.label}</span>
              <span className="nx-export__item-hint">{format.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className="nx-export">
      <Button
        ref={buttonRef}
        variant={variant}
        size={size}
        leftIcon={<FiDownload size={15} />}
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled || isEmpty}
        aria-haspopup="menu"
        aria-expanded={open}
        title={isEmpty ? 'Nothing to export yet' : `Export ${title.toLowerCase()}`}
      >
        Export
      </Button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
