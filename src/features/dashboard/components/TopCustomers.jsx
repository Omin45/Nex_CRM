/**
 * ArkCRM — TopCustomers
 * ---------------------------------------------------------------------------
 * Ranked revenue-by-customer. Used on the vendor dashboard and, with a
 * different title, inside the customer report.
 *
 * @example
 * <TopCustomers customers={overview.topCustomers} currency="NGN" />
 */

import { Link } from 'react-router-dom';
import { FiArrowUpRight } from 'react-icons/fi';
import Card from '@/components/ui/Card/Card';
import EmptyState from '@/components/feedback/EmptyState';
import useVendorPath from '@/hooks/useVendorPath';
import { formatCurrency } from '@/utils/currency';
import { appRoutes } from '@/config/navigation.config';
import './Dashboard.css';

export default function TopCustomers({
  customers = [],
  currency = 'NGN',
  title = 'Top customers',
  subtitle = 'By revenue in the selected period',
  limit = 5,
  showShare = true,
}) {
  const vendorPath = useVendorPath();
  const rows = customers.slice(0, limit);
  const total = rows.reduce((sum, row) => sum + Number(row.revenue ?? row.value ?? 0), 0);

  return (
    <Card padding="none">
      <Card.Header
        title={title}
        subtitle={subtitle}
        action={
          <Link to={vendorPath(appRoutes.vendor.customers.index)} className="nx-link nx-link--sm">
            All customers
            <FiArrowUpRight size={12} aria-hidden="true" />
          </Link>
        }
      />

      <Card.Body>
        {rows.length === 0 ? (
          <EmptyState
            title="No revenue yet"
            description="Once you invoice a customer, they will be ranked here."
            className="nx-empty--inline"
          />
        ) : (
          <div className="nx-rank">
            {rows.map((row, index) => {
              const revenue = Number(row.revenue ?? row.value ?? 0);
              const share = row.share ?? (total > 0 ? (revenue / total) * 100 : 0);
              const to = row.to
                ?? (row.id ? vendorPath(appRoutes.vendor.customers.detail(row.id)) : null);

              return (
                <div className="nx-rank__row" key={row.id ?? row.name}>
                  <span className="nx-rank__position">{index + 1}</span>

                  <div className="min-w-0">
                    {to ? (
                      <Link to={to} className="nx-rank__name">
                        {row.name}
                      </Link>
                    ) : (
                      <span className="nx-rank__name">{row.name}</span>
                    )}

                    <div className="nx-rank__bar">
                      <div
                        className="nx-rank__bar-fill"
                        style={{ width: `${Math.round(share)}%` }}
                      />
                    </div>
                  </div>

                  <span className="nx-rank__value">
                    {formatCurrency(revenue, { currency, compact: true })}
                    {showShare ? (
                      <span className="text-xs text-dim"> · {share.toFixed(0)}%</span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
