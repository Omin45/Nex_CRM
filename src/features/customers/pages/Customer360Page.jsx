/**
 * NexERP — Customer360Page
 * ---------------------------------------------------------------------------
 * Everything about one customer in one screen: identity, money, credit, recent
 * invoices, and a timeline.
 *
 * This is the screen that justifies the "360" name, so it deliberately pulls
 * from three endpoints — the customer record, its financial summary, and its
 * activity — rather than trying to derive the rest. The financial summary is
 * precomputed server-side (see the mock's `financial-summary` handler) because
 * aggregating every invoice on each render is both slow and the kind of logic
 * that belongs next to the data.
 *
 * Failure policy: the three queries are independent. A missing financial
 * summary should not blank out the identity block, so each section degrades on
 * its own — `useCustomerSection` below exists for exactly that.
 */

import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiFileText,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
} from 'react-icons/fi';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import EmptyState from '@/components/feedback/EmptyState';
import LoadingState from '@/components/feedback/LoadingState';
import ActivityTimeline from '@/components/data-display/Timeline/ActivityTimeline';
import BarChartCard from '@/components/data-display/Charts/BarChartCard';
import { useChartTheme } from '@/components/data-display/Charts/ChartCard';
import { useGetCustomerQuery, useGetFinancialSummaryQuery, useGetActivityQuery } from '../api/customersApi';
import { useGetInvoicesQuery } from '@/features/accounting/api/accountingApi';
import { useNotify } from '@/hooks/useNotification';
import useVendorPath from '@/hooks/useVendorPath';
import { useTenant } from '@/hooks/useTenant';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import './Customer360Page.css';

const STATUS_TONE = {
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  INACTIVE: 'neutral',
  BLOCKED: 'danger',
};

const STATUS_LABEL = {
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  INACTIVE: 'Inactive',
  BLOCKED: 'Blocked',
};

/** Maps a mock activity event onto the timeline's entry shape. */
function toTimelineEntry(event) {
  return {
    id: event.id,
    actor: event.title,
    action: event.detail,
    meta: event.amount != null ? formatCurrency(event.amount, { compact: true }) : null,
    at: event.at,
    tone:
      event.type === 'invoice' ? 'info' : event.type === 'note' ? 'neutral' : 'success',
  };
}

export default function Customer360Page() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const vendorPath = useVendorPath();
  const { currency } = useTenant();
  const theme = useChartTheme();

  const {
    data: customer,
    isLoading: customerLoading,
    isError: customerError,
    refetch: refetchCustomer,
  } = useGetCustomerQuery(customerId, { skip: !customerId });

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useGetFinancialSummaryQuery(customerId, { skip: !customerId });

  const { data: activity, isLoading: activityLoading } = useGetActivityQuery(
    { id: customerId },
    { skip: !customerId },
  );

  /* Only this customer's invoices. The mock's collection query supports an
     exact-match `customerId` filter, so this is a real server-side filter. */
  const { data: invoiceData, isLoading: invoicesLoading } = useGetInvoicesQuery(
    { customerId, page: 1, pageSize: 5, sortBy: 'issueDate', sortOrder: 'desc' },
    { skip: !customerId },
  );

  const invoices = useMemo(() => invoiceData?.items ?? [], [invoiceData]);
  const events = useMemo(() => (Array.isArray(activity) ? activity : []).map(toTimelineEntry), [activity]);

  const goBack = () => navigate(vendorPath('customers'));

  const handleRefresh = () => {
    refetchCustomer();
    notify.info('Refreshing customer');
  };

  if (customerLoading) {
    return (
      <div className="page">
        <LoadingState mode="skeleton" variant="detail" label="Loading customer" />
      </div>
    );
  }

  if (customerError || !customer) {
    return (
      <div className="page">
        <Card padding="lg">
          <EmptyState
            icon={<FiFileText size={22} />}
            title="Customer not found"
            description={
              customerError?.data?.message ??
              `No customer matches “${customerId}”. It may have been deleted.`
            }
            action={
              <Button variant="primary" onClick={goBack} leftIcon={<FiArrowLeft size={15} />}>
                Back to customers
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  /* Credit usage drives the warning copy, so it is computed once here rather
     than re-derived in three places below. */
  const creditUsed = summary?.creditUsedPct ?? 0;
  const creditTone = creditUsed >= 90 ? 'danger' : creditUsed >= 70 ? 'warning' : 'success';

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <button type="button" className="nx-back" onClick={goBack}>
            <FiArrowLeft size={14} aria-hidden="true" />
            All customers
          </button>
          <h1 className="page__title">{customer.name}</h1>
          <p className="page__subtitle">
            {customer.code} · {customer.segment} · {customer.owner}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} />}
            onClick={handleRefresh}
            aria-label="Refresh customer"
          >
            Refresh
          </Button>
          <Button variant="outline" size="sm" leftIcon={<FiDownload size={15} />}>
            Statement
          </Button>
          <Button variant="primary" size="sm" leftIcon={<FiFileText size={15} />}>
            New invoice
          </Button>
        </div>
      </div>

      <div className="page__body">
        {/* ---- identity + money ------------------------------------------- */}
        <div className="nx-c360__top">
          <Card padding="md" className="nx-c360__identity">
            <div className="nx-c360__id-head">
              <span className="nx-c360__mark" aria-hidden="true">
                {customer.name?.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <Badge tone={STATUS_TONE[customer.status] ?? 'neutral'} dot>
                  {STATUS_LABEL[customer.status] ?? customer.status}
                </Badge>
                <p className="nx-c360__tax">Tax number {customer.taxNumber}</p>
              </div>
            </div>

            <dl className="nx-c360__facts">
              <div>
                <dt>Contact</dt>
                <dd>{customer.contactName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${customer.email}`} className="nx-c360__link">
                    <FiMail size={12} aria-hidden="true" />
                    {customer.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>
                  <a href={`tel:${customer.phone}`} className="nx-c360__link">
                    <FiPhone size={12} aria-hidden="true" />
                    {customer.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>
                  <FiMapPin size={12} aria-hidden="true" />
                  {customer.city}, {customer.country}
                </dd>
              </div>
            </dl>

            {customer.notes ? <p className="nx-c360__note">{customer.notes}</p> : null}
          </Card>

          <div className="nx-c360__money">
            {summaryLoading ? (
              <Card padding="md">
                <LoadingState mode="skeleton" variant="detail" />
              </Card>
            ) : summaryError ? (
              <Card padding="md" className="nx-c360__degraded">
                <p className="nx-c360__degraded-text">
                  The financial summary is unavailable. The rest of this page is unaffected.
                </p>
              </Card>
            ) : (
              <>
                <div className="nx-c360__tiles">
                  <Card padding="md">
                    <p className="nx-c360__tile-label">Total billed</p>
                    <p className="nx-c360__tile-value">
                      {formatCurrency(summary?.totalBilled ?? 0, { currency, compact: true })}
                    </p>
                    <p className="nx-c360__tile-hint">
                      {summary?.invoiceCount ?? 0} {summary?.invoiceCount === 1 ? 'invoice' : 'invoices'}
                    </p>
                  </Card>
                  <Card padding="md">
                    <p className="nx-c360__tile-label">Collected</p>
                    <p className="nx-c360__tile-value nx-c360__tile-value--good">
                      {formatCurrency(summary?.totalPaid ?? 0, { currency, compact: true })}
                    </p>
                    <p className="nx-c360__tile-hint">
                      Avg {formatCurrency(summary?.averageInvoiceValue ?? 0, { currency, compact: true })} each
                    </p>
                  </Card>
                  <Card padding="md">
                    <p className="nx-c360__tile-label">Outstanding</p>
                    <p
                      className="nx-c360__tile-value"
                      data-tone={(summary?.outstanding ?? 0) > 0 ? 'warn' : undefined}
                    >
                      {formatCurrency(summary?.outstanding ?? 0, { currency, compact: true })}
                    </p>
                    <p className="nx-c360__tile-hint">Awaiting payment</p>
                  </Card>
                </div>

                <Card padding="md">
                  <div className="nx-c360__credit-head">
                    <p className="nx-c360__tile-label">Credit utilisation</p>
                    <Badge tone={creditTone}>{creditUsed}%</Badge>
                  </div>

                  {/* A native <progress> rather than a div with a width set
                      inline. It carries the value for assistive tech for free,
                      and the width comes from the `value` attribute instead of a
                      style object — which keeps the "no inline styles" rule
                      without faking a bar. */}
                  <progress
                    className="nx-c360__credit-bar"
                    data-tone={creditTone}
                    value={creditUsed}
                    max={100}
                    aria-label={`Credit limit used: ${creditUsed} percent`}
                  />

                  <p className="nx-c360__tile-hint">
                    {formatCurrency(summary?.outstanding ?? 0, { currency, compact: true })} of{' '}
                    {formatCurrency(summary?.creditLimit ?? 0, { currency, compact: true })} limit used
                    {creditUsed >= 90 ? ' — over the recommended threshold' : ''}
                  </p>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* ---- billing trend + terms --------------------------------------- */}
        <div className="nx-c360__split">
          <BarChartCard
            title="Billed vs collected"
            subtitle="Last six months"
            data={summary?.monthly ?? []}
            xKey="month"
            series={[
              /* Literal fills, not var() — recharts resolves these into SVG
                 paint servers, where a CSS variable does not resolve. */
              { key: 'billed', label: 'Billed', color: theme.accent },
              { key: 'collected', label: 'Collected', color: theme.success },
            ]}
            currency={currency}
            height={260}
            loading={summaryLoading}
            error={summaryError ? 'The billing trend could not be loaded' : null}
            showLegend
          />

          <Card padding="md">
            <Card.Header
              title="Recent invoices"
              subtitle={`${summary?.invoiceCount ?? 0} on file`}
              action={
                <Button variant="subtle" size="sm" onClick={() => navigate(vendorPath('accounting/invoices'))}>
                  All invoices
                </Button>
              }
            />
            <Card.Body>
              {invoicesLoading ? (
                <LoadingState mode="skeleton" variant="list" rows={4} />
              ) : invoices.length === 0 ? (
                <EmptyState
                  icon={<FiFileText size={20} />}
                  title="No invoices yet"
                  description="Invoices raised for this customer will appear here."
                />
              ) : (
                <ul className="nx-c360__invoices">
                  {invoices.map((invoice) => (
                    <li key={invoice.id} className="nx-c360__invoice">
                      <div className="nx-c360__invoice-main">
                        <span className="nx-c360__invoice-number">{invoice.number}</span>
                        <span className="nx-c360__invoice-date">
                          {formatDate(invoice.issueDate)}
                        </span>
                      </div>
                      <div className="nx-c360__invoice-side">
                        <span className="nx-c360__invoice-total">
                          {formatCurrency(invoice.total, { currency })}
                        </span>
                        <Badge tone={invoice.status?.tone ?? 'neutral'}>
                          {invoice.status?.label ?? invoice.statusKey}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>
        </div>

        {/* ---- activity ----------------------------------------------------- */}
        <Card padding="md">
          <Card.Header
            title="Activity"
            subtitle="Newest first"
            action={
              customer.lastActivityAt ? (
                <span className="nx-c360__last">
                  <FiClock size={12} aria-hidden="true" />
                  {formatDate(customer.lastActivityAt, 'long')}
                </span>
              ) : null
            }
          />
          <Card.Body>
            <ActivityTimeline
              entries={events}
              loading={activityLoading}
              emptyLabel="No activity recorded for this customer yet"
              showAbsoluteTime
              limit={8}
            />
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
