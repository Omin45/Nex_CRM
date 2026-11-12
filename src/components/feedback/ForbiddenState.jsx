/**
 * ArkCRM — ForbiddenState
 * ---------------------------------------------------------------------------
 * Rendered by PermissionGate when the user is authenticated but lacks the
 * required permission. Distinct from a 404: the resource exists, the user
 * simply cannot see it.
 *
 * @example
 * <PermissionGate permission={PERMISSIONS.EXPENSE_APPROVE}>
 *   <ExpenseApprovalQueue />
 * </PermissionGate>
 */

import Button from '../ui/Button/Button';
import Badge from '../ui/Badge/Badge';
import { ROLE_LABELS } from '@/config/permissions.config';
import './Feedback.css';

export default function ForbiddenState({
  /** What the user was trying to reach, e.g. "expense approvals". */
  resource = 'this page',
  /** The permission that was missing, for a precise explanation. */
  permission = null,
  /** The signed-in user's role, so the copy can suggest who to contact. */
  role = null,
  onBack = null,
  /** Shown only in development — makes RBAC bugs obvious. */
  showDiagnostics = import.meta.env.DEV,
}) {
  return (
    <div className="nx-forbidden" role="alert">
      <span className="nx-forbidden__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 018 0v3" strokeLinecap="round" />
        </svg>
      </span>

      <h2 className="text-xl font-semibold">You don't have access to {resource}</h2>

      <p className="text-muted" style={{ maxWidth: '52ch' }}>
        Your account is signed in
        {role && ROLE_LABELS[role] ? (
          <>
            {' '}as <strong>{ROLE_LABELS[role]}</strong>
          </>
        ) : null}
        , but this area is restricted. Ask a workspace administrator to grant you the required
        permission, or contact your account owner.
      </p>

      {showDiagnostics && permission ? (
        <div className="nx-forbidden__permissions">
          <span className="text-xs text-dim">Missing permission:</span>
          <Badge tone="warning" size="sm" className="mono">
            {permission}
          </Badge>
        </div>
      ) : null}

      <div className="row gap-2" style={{ marginTop: 'var(--nx-space-2)' }}>
        {onBack ? (
          <Button variant="primary" onClick={onBack}>
            Go back
          </Button>
        ) : (
          <Button variant="primary" onClick={() => window.history.back()}>
            Go back
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = `mailto:${import.meta.env.VITE_SUPPORT_EMAIL ?? 'support@arkcrm.io'}?subject=Access request: ${resource}`;
          }}
        >
          Request access
        </Button>
      </div>
    </div>
  );
}
