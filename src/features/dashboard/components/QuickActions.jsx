/**
 * ArkCRM — QuickActions
 * ---------------------------------------------------------------------------
 * Permission-filtered launcher for the six most common create flows. Declaring
 * them once here means a role only ever sees the tiles it can act on, and the
 * dashboard does not need to know the permission matrix.
 *
 * @example
 * <QuickActions />
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArchive, FiFileText, FiPackage, FiShoppingCart, FiTrendingUp, FiUserPlus,
} from 'react-icons/fi';
import Card from '@/components/ui/Card/Card';
import { usePermissions } from '@/hooks/usePermissions';
import useVendorPath from '@/hooks/useVendorPath';
import { PERMISSIONS } from '@/config/permissions.config';
import { appRoutes } from '@/config/navigation.config';
import './Dashboard.css';

/** The full catalogue; filtered per role at render time. `to` holds a bare
 *  `appRoutes.vendor` suffix — it is resolved against the tenant at render time,
 *  and `search` carries the "open the create form" query. */
const ACTIONS = [
  {
    key: 'lead',
    label: 'New lead',
    icon: FiTrendingUp,
    to: appRoutes.vendor.sales.leads,
    search: 'new=1',
    permission: PERMISSIONS.LEAD_CREATE,
  },
  {
    key: 'quote',
    label: 'New quote',
    icon: FiFileText,
    to: appRoutes.vendor.sales.quotes,
    search: 'new=1',
    permission: PERMISSIONS.QUOTE_MANAGE,
  },
  {
    key: 'order',
    label: 'New order',
    icon: FiShoppingCart,
    to: appRoutes.vendor.sales.orders,
    search: 'new=1',
    permission: PERMISSIONS.ORDER_MANAGE,
  },
  {
    key: 'customer',
    label: 'New customer',
    icon: FiUserPlus,
    to: appRoutes.vendor.customers.index,
    search: 'new=1',
    permission: PERMISSIONS.CUSTOMER_CREATE,
  },
  {
    key: 'product',
    label: 'New product',
    icon: FiPackage,
    to: appRoutes.vendor.inventory.products,
    search: 'new=1',
    permission: PERMISSIONS.PRODUCT_CREATE,
  },
  {
    key: 'adjustment',
    label: 'Stock adjustment',
    icon: FiArchive,
    to: appRoutes.vendor.inventory.adjustments,
    search: 'new=1',
    permission: PERMISSIONS.INVENTORY_ADJUST,
  },
];

export default function QuickActions({ actions = ACTIONS, className = '' }) {
  const { can } = usePermissions();
  const vendorPath = useVendorPath();

  const visible = useMemo(
    () => actions.filter((action) => !action.permission || can(action.permission)),
    [actions, can],
  );

  if (!visible.length) return null;

  return (
    <Card padding="none" className={className}>
      <Card.Header title="Quick actions" subtitle="Jump straight into a create flow" />

      <Card.Body>
        <div className="nx-quick">
          {visible.map((action) => {
            const Icon = action.icon;
            const href = `${vendorPath(action.to)}${action.search ? `?${action.search}` : ''}`;

            return (
              <Link key={action.key} to={href} className="nx-quick__tile">
                <span className="nx-quick__icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span className="nx-quick__label">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
}

export { ACTIONS as QUICK_ACTIONS };
