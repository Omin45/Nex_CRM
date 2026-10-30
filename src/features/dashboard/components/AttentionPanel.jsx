/**
 * NexERP — AttentionPanel
 * ---------------------------------------------------------------------------
 * "Needs you today": the exceptions an operator should act on, ranked by
 * urgency. The backend composes this list; the panel only orders and styles it.
 *
 * Every row links straight to the record, so the panel is a work queue rather
 * than a report.
 *
 * @example
 * <AttentionPanel items={overview.attention} currency="NGN" />
 */

import { Link } from 'react-router-dom';
import { FiAlertCircle, FiArchive, FiClock, FiFileText, FiUsers } from 'react-icons/fi';
import Card from '@/components/ui/Card/Card';
import EmptyState from '@/components/feedback/EmptyState';
import { formatCurrency } from '@/utils/currency';
import './Dashboard.css';

/** Category -> icon + tone. Unknown categories degrade to a neutral dot. */
const KIND = {
  overdue_invoice: { icon: FiFileText, tone: 'danger', label: 'Overdue invoice' },
  low_stock: { icon: FiArchive, tone: 'warning', label: 'Low stock' },
  pending_leave: { icon: FiUsers, tone: 'info', label: 'Leave request' },
  failed_payment: { icon: FiAlertCircle, tone: 'danger', label: 'Failed payment' },
  sla_breach: { icon: FiClock, tone: 'danger', label: 'SLA breach' },
};

export default function AttentionPanel({ items = [], currency = 'NGN', limit = 6 }) {
  const visible = items.slice(0, limit);
  const remaining = items.length - visible.length;

  return (
    <Card padding="none">
      <Card.Header
        title="Needs your attention"
        subtitle={
          items.length
            ? `${items.length} item${items.length === 1 ? '' : 's'} outstanding`
            : 'Nothing outstanding'
        }
        action={
          items.length ? (
            <span className="nx-attention__count" aria-hidden="true">
              {items.length}
            </span>
          ) : null
        }
      />

      <Card.Body>
        {visible.length === 0 ? (
          <EmptyState
            icon={<FiAlertCircle size={22} />}
            title="You're all caught up"
            description="No overdue invoices, stock alerts or approvals are waiting."
            className="nx-empty--inline"
          />
        ) : (
          <div className="nx-attention">
            {visible.map((item) => {
              const kind = KIND[item.kind] ?? { icon: FiAlertCircle, tone: 'info', label: item.kind };
              const Icon = kind.icon;

              const content = (
                <>
                  <span className={`nx-attention__icon is-${kind.tone}`} aria-hidden="true">
                    <Icon size={14} />
                  </span>

                  <span className="nx-attention__body">
                    <span className="nx-attention__title" title={item.title}>{item.title}</span>
                    <span className="nx-attention__meta" title={item.meta ?? kind.label}>{item.meta ?? kind.label}</span>
                  </span>

                  {item.amount !== undefined && item.amount !== null ? (
                    <span className="nx-attention__value">
                      {formatCurrency(item.amount, { currency, compact: true })}
                    </span>
                  ) : null}
                </>
              );

              return item.to ? (
                <Link key={item.id} to={item.to} className="nx-attention__item">
                  {content}
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  className="nx-attention__item"
                  onClick={item.onClick}
                >
                  {content}
                </button>
              );
            })}

            {remaining > 0 ? (
              <p className="text-xs text-dim" style={{ paddingLeft: 'var(--nx-space-3)' }}>
                and {remaining} more
              </p>
            ) : null}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
