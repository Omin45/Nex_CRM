/**
 * ArkCRM — ReportsIndexPage
 * ---------------------------------------------------------------------------
 * The reports hub. Tiles are grouped by kind, each titled with the question
 * the report answers so a reader can choose without knowing report vocabulary.
 * Vendor performance has a live endpoint but no route, so its tile is an
 * aria-disabled "coming soon" <button> — a link that 404s would be worse.
 *
 * The export row exercises POST /reports/export exactly as production would,
 * but the mock has no file store: label, toast and result note all say the
 * export is a demo rather than implying a file arrived.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity, FiAlertCircle, FiBarChart2, FiChevronRight, FiDownload,
  FiFileText, FiLayers, FiPieChart, FiShield,
} from 'react-icons/fi';
import Card from '@/components/ui/Card/Card';
import Button from '@/components/ui/Button/Button';
import Badge from '@/components/ui/Badge/Badge';
import EmptyState from '@/components/feedback/EmptyState';
import { useExportReportMutation } from '../api/reportsApi';
import { downloadBlob } from '@/utils/download';
import { useNotify } from '@/hooks/useNotification';
import useVendorPath from '@/hooks/useVendorPath';
import { appRoutes } from '@/config/navigation.config';
import { formatDateTime } from '@/utils/date';
import './ReportsIndexPage.css';
import { serverMessage } from '@/utils/errorMessage';

/** Grouped tiles. `soon: true` marks the disabled, no-route tile. */
const HUB_GROUPS = [
  {
    id: 'statements',
    title: 'Financial statements',
    tiles: [
      {
        id: 'profit-loss',
        label: 'Profit & loss',
        question: 'Did we make money this period — and where did it go?',
        icon: FiPieChart,
        to: appRoutes.vendor.reports.profitAndLoss,
      },
      {
        id: 'balance-sheet',
        label: 'Balance sheet',
        question: 'What do we own, what do we owe, and what is left over?',
        icon: FiLayers,
        to: appRoutes.vendor.reports.balanceSheet,
      },
      {
        id: 'cash-flow',
        label: 'Cash flow',
        question: 'Is cash arriving faster than it is leaving?',
        icon: FiActivity,
        to: appRoutes.vendor.reports.cashFlow,
      },
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance',
    tiles: [
      {
        id: 'tax',
        label: 'Tax summary',
        question: 'How much VAT did we collect, and how much do we still owe?',
        icon: FiShield,
        to: appRoutes.vendor.reports.tax,
      },
    ],
  },
  {
    id: 'planned',
    title: 'In development',
    tiles: [
      {
        id: 'vendor-performance',
        label: 'Vendor performance',
        question: 'How healthy are the vendors trading on this platform?',
        icon: FiBarChart2,
        soon: true,
      },
    ],
  },
];

/** Reports the export endpoint accepts; ids mirror the API route slugs. */
const EXPORT_TARGETS = [
  { id: 'profit-loss', label: 'Profit & loss' },
  { id: 'balance-sheet', label: 'Balance sheet' },
  { id: 'cash-flow', label: 'Cash flow' },
  { id: 'tax-summary', label: 'Tax summary' },
];

export default function ReportsIndexPage() {
  const notify = useNotify();
  const vendorPath = useVendorPath();

  const [target, setTarget] = useState('profit-loss');
  const [result, setResult] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [lastFormat, setLastFormat] = useState('pdf');

  const [runExport, { isLoading }] = useExportReportMutation();

  const targetLabel = EXPORT_TARGETS.find((t) => t.id === target)?.label ?? target;

  const handleExport = async (format) => {
    setLastFormat(format);
    setExportError(null);
    try {
      /* The server answers with the file itself, so it is handed straight
         to the browser. */
      const blob = await runExport({ format: 'csv', report: target }).unwrap();
      downloadBlob(blob, `${target}-${format}.csv`);
      setResult({ report: target, format, downloaded: true });
    } catch (err) {
      setExportError(serverMessage(err, 'The export request failed.'));
      notify.error('Export failed');
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Insight</span>
          <h1 className="page__title">Reports</h1>
          <p className="page__subtitle">
            Statements, compliance and performance — pick the question you need answered.
          </p>
        </div>
      </div>

      <div className="page__body">
        {HUB_GROUPS.map((group) => (
          <section className="page__section" key={group.id}>
            <h2 className="page__section-title">{group.title}</h2>
            <div className="grid grid--auto">
              {group.tiles.map((tile) => {
                const Icon = tile.icon;

                const body = (
                  <>
                    <span className="nx-rpx__icon" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <span className="nx-rpx__copy">
                      <span className="nx-rpx__name">{tile.label}</span>
                      <span className="nx-rpx__question">{tile.question}</span>
                    </span>
                    {tile.soon ? (
                      <Badge tone="neutral" className="nx-rpx__badge">
                        Coming soon
                      </Badge>
                    ) : (
                      <FiChevronRight className="nx-rpx__chevron" size={16} aria-hidden="true" />
                    )}
                  </>
                );

                /* No route exists yet: an inert panel that still announces its
                   state, rather than a link that resolves to nothing. */
                if (tile.soon) {
                  return (
                    <Card
                      as="button"
                      type="button"
                      key={tile.id}
                      className="nx-rpx__tile nx-rpx__tile--soon"
                      aria-disabled="true"
                      title="Coming soon — this report has no route yet"
                    >
                      {body}
                    </Card>
                  );
                }

                return (
                  <Card as={Link} to={vendorPath(tile.to)} hoverable key={tile.id} className="nx-rpx__tile">
                    {body}
                  </Card>
                );
              })}
            </div>
          </section>
        ))}

        <section className="page__section">
          <h2 className="page__section-title">Export</h2>
          <Card padding="md" className="nx-rpx__export">
            <div className="nx-rpx__export-row">
              <div className="nx-segmented" role="group" aria-label="Report to export">
                {EXPORT_TARGETS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`nx-segmented__item${target === option.id ? ' is-active' : ''}`}
                    aria-pressed={target === option.id}
                    onClick={() => {
                      setTarget(option.id);
                      setResult(null);
                      setExportError(null);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="nx-rpx__export-actions">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<FiDownload size={14} />}
                  loading={isLoading && lastFormat === 'pdf'}
                  disabled={isLoading}
                  onClick={() => handleExport('pdf')}
                >
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<FiDownload size={14} />}
                  loading={isLoading && lastFormat === 'csv'}
                  disabled={isLoading}
                  onClick={() => handleExport('csv')}
                >
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="nx-rpx__export-log">
              {exportError ? (
                <div className="nx-alert nx-alert--error" role="alert">
                  <span className="nx-alert__icon" aria-hidden="true">
                    <FiAlertCircle />
                  </span>
                  <span>
                    {exportError}{' '}
                    <button type="button" className="nx-link" onClick={() => handleExport(lastFormat)}>
                      Try again
                    </button>
                  </span>
                </div>
              ) : result ? (
                <div className="nx-alert nx-alert--info" role="status">
                  <span className="nx-alert__icon" aria-hidden="true">
                    <FiFileText />
                  </span>
                  <span>
                    {EXPORT_TARGETS.find((t) => t.id === result.report)?.label ?? result.report} ·{' '}
                    {String(result.format).toUpperCase()} · generated {formatDateTime(result.generatedAt)}{' '}
                    — demo export, nothing was stored.
                  </span>
                </div>
              ) : (
                <EmptyState
                  icon={<FiDownload />}
                  title="No export yet"
                  description="Pick a report and a format above. The request is real, but this demo mock has no file store, so nothing downloads."
                />
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
