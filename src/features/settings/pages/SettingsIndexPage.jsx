/**
 * ArkCRM — SettingsIndexPage
 * ---------------------------------------------------------------------------
 * The settings hub for a vendor workspace (route suffix `settings`).
 *
 * Tiles rather than a menu list: on a settings landing page the real question
 * is "where do I change X?", so each tile carries the one-line answer beside
 * its icon before anyone clicks.
 *
 * Every href comes from `appRoutes.vendor.settings` resolved through
 * useVendorPath(), so the tiles follow the active tenant's /vendor/:vendorId
 * mount — there is no hard-coded workspace path in this file, and renaming a
 * suffix in navigation.config.js updates this page too.
 */

import { Link } from 'react-router-dom';
import {
  FiBriefcase, FiChevronRight, FiCreditCard, FiShield, FiSliders, FiUsers,
} from 'react-icons/fi';
import Card from '@/components/ui/Card/Card';
import useVendorPath from '@/hooks/useVendorPath';
import { useTenant } from '@/hooks/useTenant';
import { appRoutes } from '@/config/navigation.config';
import './SettingsIndexPage.css';

const TILES = [
  {
    id: 'company',
    to: appRoutes.vendor.settings.company,
    title: 'Company',
    description: 'Business name, registration and tax numbers, base currency, timezone and country.',
    icon: <FiBriefcase size={18} />,
  },
  {
    id: 'team',
    to: appRoutes.vendor.settings.team,
    title: 'Team',
    description: 'Everyone who can sign in, what they do, and invitations for new members.',
    icon: <FiUsers size={18} />,
  },
  {
    id: 'preferences',
    to: appRoutes.vendor.settings.preferences,
    title: 'Preferences',
    description: 'Theme, table density, default page size and the alerts you get by email.',
    icon: <FiSliders size={18} />,
  },
  {
    id: 'billing',
    to: appRoutes.vendor.settings.billing,
    title: 'Billing',
    description: 'Current plan, seats in use, invoices and the payment method on file.',
    icon: <FiCreditCard size={18} />,
  },
  {
    id: 'audit',
    to: appRoutes.vendor.settings.audit,
    title: 'Audit log',
    description: 'Every action taken in this workspace — who, when, from where and how severe.',
    icon: <FiShield size={18} />,
  },
];

export default function SettingsIndexPage() {
  const vendorPath = useVendorPath();
  const { tenantName, plan, seatUsage } = useTenant();

  /* One live fact per tile where the session already knows it — the plan on
     Billing and the seat count on Team cost nothing to show and answer the
     "am I about to hit a limit?" question before the click. */
  const metaFor = (id) => {
    if (id === 'billing') return `${plan} plan`;
    if (id === 'team' && seatUsage) {
      return `${seatUsage.used} of ${seatUsage.total} seats in use`;
    }
    return null;
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Workspace</span>
          <h1 className="page__title">Settings</h1>
          <p className="page__subtitle">
            Configure {tenantName} — who has access, how the workspace behaves, what it costs and
            what it has already done.
          </p>
        </div>
      </div>

      <div className="page__body">
        <div className="grid grid--auto">
          {TILES.map(({ id, to, title, description, icon }) => {
            const meta = metaFor(id);
            return (
              <Card
                key={id}
                as={Link}
                to={vendorPath(to)}
                className="nx-set-index__tile"
                padding="lg"
                hoverable
              >
                <span className="nx-set-index__icon" aria-hidden="true">
                  {icon}
                </span>
                <h2 className="nx-set-index__title">{title}</h2>
                <p className="nx-set-index__desc">{description}</p>
                <span className="nx-set-index__footer">
                  {meta ? <span className="nx-set-index__meta">{meta}</span> : null}
                  <span className="nx-set-index__go" aria-hidden="true">
                    <FiChevronRight size={14} />
                  </span>
                </span>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
