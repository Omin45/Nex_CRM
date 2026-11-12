/**
 * ArkCRM — AdminVendorDetailPage
 * ---------------------------------------------------------------------------
 * One tenant, end to end: who runs it, what it pays, which modules it has
 * switched on, and where it sits in onboarding. This is the screen a support
 * engineer opens after "my tenant is broken", so identity and status sit at
 * the top and the two things that change during a conversation — the
 * subscription and the onboarding checklist — sit beside them.
 *
 * The subscription and onboarding rows are cross-linked rather than owned
 * here: both are fetched with `vendorId` (the mock exact-matches it) and then
 * found client-side as well, so the cards stay correct even against an API
 * that ignores the filter.
 *
 * Data: GET /vendors/:id, GET /platform/subscriptions?vendorId,
 * GET /platform/onboarding?vendorId, POST /vendors/:id/suspend,
 * POST /vendors/:id/activate, PATCH /platform/onboarding/:id.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiAlertTriangle, FiArrowLeft, FiBriefcase, FiCheckCircle, FiClock, FiDollarSign,
  FiLayers, FiMail, FiMapPin, FiPauseCircle, FiPhone, FiPlayCircle, FiUser, FiUsers,
} from 'react-icons/fi';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card, { CardBody, CardFooter, CardHeader } from '@/components/ui/Card/Card';
import LoadingState from '@/components/feedback/LoadingState';
import EmptyState from '@/components/feedback/EmptyState';
import Modal from '@/components/ui/Modal/Modal';
import MetricCard from '@/features/dashboard/components/MetricCard';
import {
  useActivateVendorMutation,
  useGetOnboardingQuery,
  useGetSubscriptionsQuery,
  useGetVendorQuery,
  useSuspendVendorMutation,
  useUpdateOnboardingMutation,
} from '../api/superAdminApi';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import { formatCurrency } from '@/utils/currency';
import { formatDate, fromNow } from '@/utils/date';
import { appRoutes } from '@/config/navigation.config';
import './AdminVendorDetailPage.css';
import { serverMessage } from '@/utils/errorMessage';

const MODULE_LABELS = {
  sales: 'Sales',
  accounting: 'Accounting',
  inventory: 'Inventory',
  hr: 'HR',
  projects: 'Projects',
  support: 'Support',
};

export default function AdminVendorDetailPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { currency } = useTenant();
  const { vendorId } = useParams();

  const [confirming, setConfirming] = useState(false);

  const { data: vendor, isLoading, isError, refetch } = useGetVendorQuery(vendorId);
  const [suspendVendor, { isLoading: suspending }] = useSuspendVendorMutation();
  const [activateVendor, { isLoading: activating }] = useActivateVendorMutation();
  const [updateOnboarding, { isLoading: advancing }] = useUpdateOnboardingMutation();

  /* Filtered twice on purpose: the server is asked to narrow by vendorId, and
     the answer is narrowed again here so a server that treats `vendorId` as
     noise cannot put another tenant's billing row on this page. */
  const { data: subscriptionPage } = useGetSubscriptionsQuery({ page: 1, pageSize: 50, vendorId });
  const { data: onboardingPage } = useGetOnboardingQuery({ page: 1, pageSize: 50, vendorId });

  const subscription = useMemo(
    () => (subscriptionPage?.items ?? []).find((row) => row.vendorId === vendorId) ?? null,
    [subscriptionPage, vendorId],
  );

  const onboarding = useMemo(
    () => (onboardingPage?.items ?? []).find((row) => row.vendorId === vendorId) ?? null,
    [onboardingPage, vendorId],
  );

  /* Step label and percentage are derived, never read off the record: the
     PATCH merges what we send and recomputes nothing, so the row itself can
     lag one click behind the strip it drives. */
  const steps = onboarding?.steps ?? [];
  const currentStep = onboarding?.currentStep ?? 0;
  const stepLabel = steps[currentStep - 1] ?? onboarding?.stepLabel ?? '—';
  const progress = steps.length ? Math.round((currentStep / steps.length) * 100) : 0;

  const isSuspended = vendor?.statusKey === 'SUSPENDED' || vendor?.status?.label === 'Suspended';

  const handleSuspend = async () => {
    if (!vendor) return;
    try {
      await suspendVendor(vendor.id).unwrap();
      
      setConfirming(false);
    } catch (err) {
      notify.error(serverMessage(err, 'Could not suspend the tenant'));
    }
  };

  const handleActivate = async () => {
    if (!vendor) return;
    try {
      await activateVendor(vendor.id).unwrap();
      
    } catch (err) {
      notify.error(serverMessage(err, 'Could not restore the tenant'));
    }
  };

  const handleAdvance = async () => {
    if (!onboarding || !steps.length) return;
    const next = Math.min(currentStep + 1, steps.length);
    if (next === currentStep) return;
    try {
      await updateOnboarding({ id: onboarding.id, currentStep: next }).unwrap();
      
    } catch (err) {
      notify.error(serverMessage(err, 'Could not update the checklist'));
    }
  };

  if (isError) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">Platform</span>
            <h1 className="page__title">{vendorId}</h1>
            <p className="page__subtitle">This tenant could not be loaded.</p>
          </div>
          <div className="page__actions">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FiArrowLeft size={15} />}
              onClick={() => navigate(appRoutes.admin.vendors)}
            >
              All vendors
            </Button>
          </div>
        </div>
        <EmptyState
          icon={<FiBriefcase />}
          title="Tenant not found"
          description="No tenant on the platform matches this ID. It may have been removed, or the link may be stale."
          action={<Button onClick={() => refetch()}>Try again</Button>}
          secondaryAction={
            <Button variant="outline" onClick={() => navigate(appRoutes.admin.vendors)}>
              Back to directory
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading || !vendor) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">Platform</span>
            <h1 className="page__title">{vendorId}</h1>
            <p className="page__subtitle">Loading tenant…</p>
          </div>
        </div>
        <LoadingState mode="detail" rows={4} label="Loading tenant…" />
        <div className="grid grid--split">
          <Card>
            <LoadingState mode="skeleton" variant="list" rows={5} label="Loading billing…" />
          </Card>
          <Card>
            <LoadingState mode="skeleton" variant="list" rows={5} label="Loading checklist…" />
          </Card>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      key: 'mrr',
      label: 'MRR',
      value: formatCurrency(vendor.mrr, { currency, compact: true }),
      icon: <FiDollarSign size={14} />,
      tone: 'success',
      hint: `Billed in ${vendor.currency ?? currency}`,
    },
    {
      key: 'seats',
      label: 'Seats',
      value: vendor.employees ?? 0,
      icon: <FiUsers size={14} />,
      tone: 'accent',
      hint: 'Licensed users on the plan',
    },
    {
      key: 'invoices',
      label: 'Invoices issued',
      value: vendor.invoicesIssued ?? 0,
      icon: <FiLayers size={14} />,
      tone: 'violet',
      hint: 'Across the tenant lifetime',
    },
    {
      key: 'active',
      label: 'Last active',
      value: fromNow(vendor.lastActiveAt),
      icon: <FiClock size={14} />,
      tone: 'warning',
      hint: 'Most recent session in the tenant',
    },
  ];

  const statusTone = isSuspended ? 'danger' : vendor.statusKey === 'PENDING' ? 'warning' : 'success';
  const StatusIcon = isSuspended ? FiPauseCircle : vendor.statusKey === 'PENDING' ? FiClock : FiCheckCircle;
  const statusCopy = isSuspended
    ? `${vendor.name} is suspended. Its users cannot sign in until access is restored.`
    : vendor.statusKey === 'PENDING'
      ? `${vendor.name} is pending review. Onboarding sign-off has not happened yet.`
      : `${vendor.name} is active, with every purchased module available to its users.`;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Platform · {vendor.id}</span>
          <h1 className="page__title">{vendor.name}</h1>
          <p className="page__subtitle">
            {vendor.contactName} · {vendor.city}, {vendor.country} · joined {formatDate(vendor.createdAt)}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiArrowLeft size={15} />}
            onClick={() => navigate(appRoutes.admin.vendors)}
          >
            All vendors
          </Button>
          {isSuspended ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<FiPlayCircle size={15} />}
              loading={activating}
              onClick={handleActivate}
            >
              Restore access
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FiPauseCircle size={15} />}
              onClick={() => setConfirming(true)}
            >
              Suspend
            </Button>
          )}
        </div>
      </div>

      <div className="page__body">
        <div className={`nx-alert nx-alert--${statusTone}`} role="status">
          <span className="nx-alert__icon" aria-hidden="true"><StatusIcon size={16} /></span>
          <span>{statusCopy}</span>
        </div>

        <div className="grid grid--metrics">
          {kpis.map((kpi) => (
            <MetricCard key={kpi.key} {...kpi} />
          ))}
        </div>

        <div className="grid grid--split">
          <div className="stack stack--md">
            <Card>
              <CardHeader title="Identity" subtitle="Who runs this tenant" />
              <CardBody>
                <dl className="nx-vend-d__facts">
                  <div className="nx-vend-d__fact">
                    <dt><FiUser size={13} aria-hidden="true" /> Primary contact</dt>
                    <dd>{vendor.contactName}</dd>
                  </div>
                  <div className="nx-vend-d__fact">
                    <dt><FiMail size={13} aria-hidden="true" /> Email</dt>
                    <dd>{vendor.email}</dd>
                  </div>
                  <div className="nx-vend-d__fact">
                    <dt><FiPhone size={13} aria-hidden="true" /> Phone</dt>
                    <dd>{vendor.phone ?? '—'}</dd>
                  </div>
                  <div className="nx-vend-d__fact">
                    <dt><FiMapPin size={13} aria-hidden="true" /> Location</dt>
                    <dd>{vendor.city}, {vendor.country}</dd>
                  </div>
                  <div className="nx-vend-d__fact">
                    <dt><FiDollarSign size={13} aria-hidden="true" /> Home currency</dt>
                    <dd>{vendor.currency ?? currency}</dd>
                  </div>
                  <div className="nx-vend-d__fact">
                    <dt><FiClock size={13} aria-hidden="true" /> Last active</dt>
                    <dd>{fromNow(vendor.lastActiveAt)}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Modules"
                subtitle={`${vendor.modules?.length ?? 0} switched on`}
              />
              <CardBody>
                {vendor.modules?.length ? (
                  <ul className="nx-vend-d__modules">
                    {vendor.modules.map((module) => (
                      <li key={module}>
                        <Badge tone="accent" icon={<FiLayers size={11} />}>
                          {MODULE_LABELS[module] ?? module}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="nx-vend-d__empty">No module has been enabled for this tenant yet.</p>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="stack stack--md">
            <Card>
              <CardHeader
                title="Subscription"
                subtitle={subscription ? `${subscription.billingCycle === 'ANNUAL' ? 'Annual' : 'Monthly'} billing` : 'No billing row linked'}
                action={
                  subscription ? (
                    <Badge tone={subscription.status?.tone ?? 'neutral'}>
                      {subscription.status?.label ?? subscription.statusKey}
                    </Badge>
                  ) : null
                }
              />
              <CardBody>
                {subscription ? (
                  <div className="stack stack--md">
                    <div className="nx-vend-d__plan-row">
                      <span className="nx-vend-d__plan">
                        <Badge tone="violet">{subscription.plan}</Badge>
                      </span>
                      <span className="nx-vend-d__mrr">
                        {formatCurrency(subscription.mrr, { currency, compact: true })}
                        <span className="nx-vend-d__mrr-unit"> / month</span>
                      </span>
                    </div>

                    <div className="nx-vend-d__seats">
                      <div className="nx-vend-d__seats-head">
                        <span>Seats in use</span>
                        <span className="numeric">{subscription.seatsUsed} / {subscription.seatsTotal}</span>
                      </div>
                      <progress
                        className="nx-vend-d__bar"
                        data-tone={
                          subscription.seatsUsed / Math.max(subscription.seatsTotal, 1) >= 0.9
                            ? 'warning'
                            : 'ok'
                        }
                        value={subscription.seatsUsed}
                        max={subscription.seatsTotal}
                        role="progressbar"
                        aria-valuenow={subscription.seatsUsed}
                        aria-valuemin={0}
                        aria-valuemax={subscription.seatsTotal}
                        aria-label={`${subscription.vendor}: ${subscription.seatsUsed} of ${subscription.seatsTotal} seats in use`}
                      />
                    </div>

                    <dl className="nx-vend-d__facts">
                      <div className="nx-vend-d__fact">
                        <dt>Started</dt>
                        <dd>{formatDate(subscription.startedAt)}</dd>
                      </div>
                      <div className="nx-vend-d__fact">
                        <dt>Renews</dt>
                        <dd>{formatDate(subscription.renewsAt)} · {fromNow(subscription.renewsAt)}</dd>
                      </div>
                      <div className="nx-vend-d__fact">
                        <dt>Payment method</dt>
                        <dd>{subscription.method}</dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <p className="nx-vend-d__empty">
                    No subscription is linked to this tenant yet. Trial tenants appear here once
                    billing starts.
                  </p>
                )}
              </CardBody>
              <CardFooter>
                <Button variant="ghost" size="sm" onClick={() => navigate(appRoutes.admin.subscriptions)}>
                  All subscriptions
                </Button>
              </CardFooter>
            </Card>

            <Card className="nx-vend-d__onboard" data-step={currentStep}>
              <CardHeader
                title="Onboarding"
                subtitle={
                  onboarding
                    ? `Step ${currentStep} of ${steps.length} · ${stepLabel}`
                    : 'Not in the queue'
                }
                action={
                  onboarding ? (
                    <Badge tone={onboarding.status?.tone ?? 'neutral'}>
                      {onboarding.status?.label ?? onboarding.statusKey}
                    </Badge>
                  ) : null
                }
              />
              <CardBody>
                {onboarding ? (
                  <div className="stack stack--md">
                    {/* The strip is built from five discrete segments — no
                        width is written anywhere, `data-step` on the card
                        decides which of them read as done and which as
                        current, in CSS. */}
                    <div
                      className="nx-vend-d__strip"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={steps.length}
                      aria-valuenow={currentStep}
                      aria-label={`Onboarding progress: step ${currentStep} of ${steps.length}`}
                    >
                      {steps.map((step) => (
                        <span className="nx-vend-d__step" key={step}>
                          <span className="nx-vend-d__seg" aria-hidden="true" />
                          <span className="nx-vend-d__step-name">{step}</span>
                        </span>
                      ))}
                    </div>

                    <div className="nx-vend-d__progress-line">
                      <span className="nx-vend-d__progress-pct numeric">{progress}% complete</span>
                      <span className="nx-vend-d__progress-owner">
                        Owner {onboarding.owner} · due {formatDate(onboarding.dueAt)}
                      </span>
                    </div>

                    {onboarding.blockers?.length ? (
                      <div className="nx-alert nx-alert--warning">
                        <span className="nx-alert__icon" aria-hidden="true"><FiAlertTriangle size={16} /></span>
                        <span>
                          Blocked by: {onboarding.blockers.join(', ')}.
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="nx-vend-d__empty">
                    This tenant is not in the onboarding queue — it either finished or has not
                    applied yet.
                  </p>
                )}
              </CardBody>
              {onboarding && currentStep < steps.length ? (
                <CardFooter>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={advancing}
                    onClick={handleAdvance}
                    leftIcon={<FiCheckCircle size={15} />}
                  >
                    Record “{steps[currentStep] ?? 'next step'}” as done
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate(appRoutes.admin.onboarding)}>
                    Open queue
                  </Button>
                </CardFooter>
              ) : null}
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Suspend ${vendor.name}?`}
        subtitle="This is a two-step action on purpose — suspending cuts off every user in the tenant."
        closeOnScrimClick={false}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={suspending}>
              Keep access
            </Button>
            <Button variant="danger" onClick={handleSuspend} loading={suspending}>
              Suspend tenant
            </Button>
          </>
        }
      >
        <div className="nx-alert nx-alert--error" role="alert">
          <span className="nx-alert__icon" aria-hidden="true"><FiPauseCircle size={16} /></span>
          <span>
            {vendor.employees ?? 0} seats lose access immediately, and the subscription stops
            accruing. You can restore access from this page at any time.
          </span>
        </div>
      </Modal>
    </div>
  );
}
