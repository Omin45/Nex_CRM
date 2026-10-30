/**
 * NexERP — TaxSummaryPage
 * ---------------------------------------------------------------------------
 * The VAT position for the current period plus the filing history behind it.
 * Reachable by URL only — the sidebar has no entry; the hub links here.
 *
 * Overdue is text first, colour second: the word sits beside the date as the
 * invoice register does it, and a filed return is never flagged late. There
 * is no "File return" button the mock cannot honour; the export says plainly
 * that it is a demo.
 */

import { useMemo, useState } from 'react';
import {
  FiAlertCircle, FiArrowDownRight, FiArrowUpRight, FiDollarSign, FiDownload, FiFileText,
  FiRefreshCw,
} from 'react-icons/fi';
import Card from '@/components/ui/Card/Card';
import Button from '@/components/ui/Button/Button';
import Badge from '@/components/ui/Badge/Badge';
import DataTable from '@/components/data-display/DataTable/DataTable';
import EmptyState from '@/components/feedback/EmptyState';
import LoadingState from '@/components/feedback/LoadingState';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useExportReportMutation, useGetTaxSummaryQuery } from '../api/reportsApi';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import { formatCurrency } from '@/utils/currency';
import { formatDate, isOverdue } from '@/utils/date';
import './TaxSummaryPage.css';

/** Status vocabulary → badge tone. Anything unrecognised stays neutral. */
const STATUS_TONES = {
  FILED: 'success',
  DRAFT: 'warning',
};

/* Skeleton placeholder ids — stable, so keys never fall back to the index. */
const KPI_SLOTS = ['output-vat', 'input-vat', 'net-payable'];

export default function TaxSummaryPage() {
  const notify = useNotify();
  const { currency } = useTenant();

  const { data, isLoading, isFetching, isError, error, refetch } = useGetTaxSummaryQuery();

  const [runExport, { isLoading: isExporting }] = useExportReportMutation();
  const [exportError, setExportError] = useState(null);

  const periodLabel = data?.period ?? 'this period';

  const kpis = useMemo(
    () => [
      {
        key: 'outputVat',
        label: 'Output VAT',
        value: formatCurrency(data?.outputVat, { currency, compact: true }),
        hint: 'VAT charged on your sales',
        icon: <FiArrowUpRight size={14} />,
        tone: 'accent',
      },
      {
        key: 'inputVat',
        label: 'Input VAT',
        value: formatCurrency(data?.inputVat, { currency, compact: true }),
        hint: 'VAT you paid on purchases',
        icon: <FiArrowDownRight size={14} />,
        tone: 'violet',
      },
      {
        key: 'netPayable',
        label: 'Net VAT payable',
        value: formatCurrency(data?.netPayable, { currency, compact: true }),
        hint: 'Still owed to the tax authority',
        icon: <FiDollarSign size={14} />,
        tone: 'warning',
      },
    ],
    [data, currency],
  );

  const columns = useMemo(
    () => [
      { key: 'period', header: 'Period' },
      {
        key: 'dueDate',
        header: 'Due',
        align: 'right',
        render: (filing) => {
          /* Filed returns are settled whatever the calendar says. */
          const late = filing.status !== 'FILED' && isOverdue(filing.dueDate);
          return (
            <span className="nx-tax__date" data-late={late || undefined}>
              {formatDate(filing.dueDate)}
              {late ? <span className="nx-tax__late">overdue</span> : null}
            </span>
          );
        },
      },
      {
        key: 'outputVat',
        header: 'Output VAT',
        align: 'right',
        render: (filing) => (
          <span className="nx-tax__num">{formatCurrency(filing.outputVat, { currency })}</span>
        ),
      },
      {
        key: 'inputVat',
        header: 'Input VAT',
        align: 'right',
        render: (filing) => (
          <span className="nx-tax__num">{formatCurrency(filing.inputVat, { currency })}</span>
        ),
      },
      {
        key: 'net',
        header: 'Net',
        align: 'right',
        render: (filing) => (
          <span className="nx-tax__num nx-tax__num--strong">
            {formatCurrency(
              (Number(filing.outputVat) || 0) - (Number(filing.inputVat) || 0),
              { currency },
            )}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (filing) => (
          <Badge tone={STATUS_TONES[filing.status] ?? 'neutral'} dot>
            {filing.status}
          </Badge>
        ),
      },
    ],
    [currency],
  );

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing tax summary');
  };

  const handleExport = async () => {
    setExportError(null);
    try {
      await runExport({ format: 'pdf', report: 'tax-summary' }).unwrap();
      notify.success(
        `VAT return for ${periodLabel} — demo export, no file is generated in this mock.`,
      );
    } catch (err) {
      setExportError(err?.data?.message ?? err?.message ?? 'The export request failed.');
      notify.error('Export failed');
    }
  };

  if (isError) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">
              <FiAlertCircle size={12} /> Report unavailable
            </span>
            <h1 className="page__title">Tax summary</h1>
            <p className="page__subtitle">
              {error?.data?.message ?? 'The tax summary could not be loaded.'}
            </p>
          </div>
          <div className="page__actions">
            <Button leftIcon={<FiRefreshCw size={15} />} onClick={refetch}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !isLoading && !data;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Insight</span>
          <h1 className="page__title">Tax summary</h1>
          <p className="page__subtitle">
            VAT position for {periodLabel} — what you collected, what you can reclaim, and the
            filing history behind it.
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh tax summary"
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FiDownload size={15} />}
            loading={isExporting}
            onClick={handleExport}
          >
            Export filing
          </Button>
        </div>
      </div>

      <div className="page__body">
        {exportError ? (
          <div className="nx-alert nx-alert--error" role="alert">
            <span className="nx-alert__icon" aria-hidden="true">
              <FiAlertCircle />
            </span>
            <span>
              {exportError}{' '}
              <button type="button" className="nx-link" onClick={handleExport}>
                Try again
              </button>
            </span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid grid--3">
            {KPI_SLOTS.map((slot) => (
              <Card key={slot} padding="md">
                <LoadingState mode="skeleton" variant="detail" rows={1} />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid--3">
            {kpis.map(({ key, ...kpi }) => (
              <MetricCard key={key} {...kpi} />
            ))}
          </div>
        )}

        {isEmpty ? (
          <Card padding="lg">
            <EmptyState
              icon={<FiFileText />}
              title="No tax data yet"
              description="Once VAT is posted for a period, the summary and its filings will appear here."
              action={<Button onClick={refetch}>Reload</Button>}
            />
          </Card>
        ) : (
          <Card padding="none">
            <Card.Header
              title="Filings"
              subtitle="Output and input VAT per period, with net owed"
            />
            <DataTable
              columns={columns}
              data={data?.filings ?? []}
              loading={isLoading}
              rowKey={(filing) => filing.period}
              hidePagination
              dense
              caption="VAT filings by period: due date, output VAT, input VAT, net payable and status"
              emptyTitle="No filings yet"
              emptyDescription="Filings appear here once a period is opened for VAT."
              emptyIcon={<FiFileText />}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
