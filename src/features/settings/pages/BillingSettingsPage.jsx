/**
 * NexERP — BillingSettingsPage
 * ---------------------------------------------------------------------------
 * `settings/billing` — what this workspace is on today. Every figure shown
 * comes from the session tenant through useTenant (plan, seats, currency,
 * since-when), because that is all a workspace session actually holds.
 *
 * Deliberately absent: there is no tenant-scoped billing, subscription or
 * invoice endpoint — those rows live under /platform/*, which vendors never
 * reach — so status, price, cycle, renewal and payment method render as honest
 * em-dashes with the reason underneath, and both header actions answer through
 * useNotify() rather than sitting there as dead buttons.
 */

import { useState } from 'react';
import { FiDownload, FiFileText, FiInfo, FiTrendingUp } from 'react-icons/fi';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card/Card';
import Modal from '@/components/ui/Modal/Modal';
import EmptyState from '@/components/feedback/EmptyState';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import { formatDate } from '@/utils/date';
import './BillingSettingsPage.css';

/* The facts the session does not carry. Rendered as em-dashes with a shared
   note beneath, rather than filled with plausible-looking fiction. */
const UNKNOWN_FACTS = ['Status', 'Price', 'Billing cycle', 'Next renewal'];

export default function BillingSettingsPage() {
  const notify = useNotify();
  const { tenant, tenantName, plan, currency, currencySymbol, seatUsage } = useTenant();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handleDownloadInvoice = () => {
    notify.info(
      'Invoice downloads are not available in demo mode — there is no billing endpoint behind this button.',
    );
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Workspace</span>
          <h1 className="page__title">Billing</h1>
          <p className="page__subtitle">
            What this workspace is on today — read from your session, not from a billing system.
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FiDownload size={15} />}
            onClick={handleDownloadInvoice}
          >
            Download invoice
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<FiTrendingUp size={15} />}
            onClick={() => setUpgradeOpen(true)}
          >
            Upgrade plan
          </Button>
        </div>
      </div>

      <div className="page__body">
        <div className="nx-alert nx-alert--info nx-billing__note" role="note">
          <span className="nx-alert__icon" aria-hidden="true">
            <FiInfo size={16} />
          </span>
          Plan and seat figures come from your session. This demo keeps subscription rows, invoices
          and payment details with the platform billing desk — a workspace session never reads them —
          so the fields it does not hold are marked, not invented.
        </div>

        <div className="grid grid--2">
          <Card padding="lg">
            <CardHeader
              title="Current plan"
              subtitle={`${tenantName} · ${currency}`}
              action={<Badge tone="violet" size="md">{plan}</Badge>}
            />
            <CardBody>
              {seatUsage ? (
                <div className="nx-billing__seats">
                  <div className="nx-billing__seats-head">
                    <span>Seats in use</span>
                    <strong className="nx-billing__seats-count">
                      {seatUsage.used} of {seatUsage.total}
                    </strong>
                  </div>
                  <progress
                    className="nx-billing__bar"
                    max={seatUsage.total}
                    value={seatUsage.used}
                    data-tone={seatUsage.percent >= 90 ? 'warning' : undefined}
                    aria-label={`${seatUsage.used} of ${seatUsage.total} seats in use`}
                  >
                    {`${seatUsage.used} of ${seatUsage.total}`}
                  </progress>
                  <p className="nx-billing__seats-note">
                    {seatUsage.remaining} {seatUsage.remaining === 1 ? 'seat' : 'seats'} left ·{' '}
                    {Math.round(seatUsage.percent)}% used
                  </p>
                </div>
              ) : (
                <p className="nx-billing__muted">No seat record in this session.</p>
              )}

              <dl className="nx-billing__facts">
                <div className="nx-billing__fact">
                  <dt>Workspace since</dt>
                  <dd>{tenant ? formatDate(tenant.createdAt) : '—'}</dd>
                </div>
                <div className="nx-billing__fact">
                  <dt>Billing currency</dt>
                  <dd>{currency} ({currencySymbol})</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card padding="lg">
            <CardHeader title="Billing details" subtitle="Status, price, cycle and renewal" />
            <CardBody>
              <dl className="nx-billing__facts">
                {UNKNOWN_FACTS.map((label) => (
                  <div className="nx-billing__fact" key={label}>
                    <dt>{label}</dt>
                    <dd>
                      <span aria-hidden="true">—</span>
                      <span className="nx-sr-only">Not held in this session</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="nx-billing__facts-note">
                The platform billing desk keeps the subscription row; no workspace endpoint exposes
                it in this demo.
              </p>

              <div className="nx-billing__payment">
                <p className="nx-billing__payment-title">No payment method on file</p>
                <p className="nx-billing__payment-text">
                  Card, transfer and direct-debit details are held by the platform team; this demo
                  stores none against your workspace.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card padding="lg">
          <CardHeader title="Invoices" subtitle="What this workspace has been billed" />
          <CardBody>
            <EmptyState
              icon={<FiFileText />}
              title="No billing invoices to show"
              description="Invoices this workspace issues to its own customers live under Accounting → Invoices. Billing invoices from the platform have no tenant-scoped endpoint in this demo, so there is nothing to list here yet."
            />
          </CardBody>
        </Card>
      </div>

      <Modal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="Upgrades go through the platform team"
        subtitle={`Your workspace is on the ${plan} plan today.`}
        footer={
          <Button variant="primary" onClick={() => setUpgradeOpen(false)}>
            Got it
          </Button>
        }
      >
        <p className="nx-billing__modal-text">
          This demo has no checkout: plan changes are made by the platform team from the billing
          desk and appear in your session after the next sign-in. Nothing was charged and no request
          was sent.
        </p>
        <p className="nx-billing__modal-text nx-billing__modal-text--muted">
          {seatUsage
            ? `Seats stay at ${seatUsage.used} of ${seatUsage.total} until then — ask the platform team if you need more.`
            : 'Ask the platform team when you need more seats.'}
        </p>
      </Modal>
    </div>
  );
}
