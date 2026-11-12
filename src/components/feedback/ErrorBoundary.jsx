/**
 * ArkCRM — ErrorBoundary
 * ---------------------------------------------------------------------------
 * Class component: React has no hook equivalent for catching render errors.
 * Mounted at three levels in RootLayout — around the whole app, around each
 * layout, and around individual route outlets — so a crash in one feature
 * module blanks a card rather than the entire workspace.
 *
 * In development the stack trace is shown. In production only a correlation
 * id is displayed, which should be the `X-Request-Id` from the Spring Boot
 * response so a user can quote it in a support ticket.
 */

import { Component } from 'react';
import Button from '../ui/Button/Button';
import './Feedback.css';

/** Stable-ish id used as the support correlation key. */
function generateErrorId(error) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const source = (error?.message ?? 'ERR').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
  return `NX-${source || 'ERR'}-${stamp}`;
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null, errorId: null };
    this.handleReset = this.handleReset.bind(this);
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    /* Runs during the commit phase — must stay side-effect free. */
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = generateErrorId(error);
    this.setState({ errorInfo, errorId });

    /* Forward to the logging endpoint. The backend should be able to
       correlate this with the tenant and the failing request. */
    this.props.onError?.(error, { ...errorInfo, errorId });

    if (import.meta.env.DEV) {
      /* eslint-disable-next-line no-console */
      console.error(`[ArkCRM:${errorId}]`, error, errorInfo);
    }
  }

  /** Clears the error and re-renders the children. */
  handleReset() {
    this.setState({ error: null, errorInfo: null, errorId: null });
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    const { error, errorInfo, errorId } = this.state;
    const { children, title, compact } = this.props;

    /* No error — render normally. */
    if (!error) return children;

    /* A compact boundary (e.g. inside a card) shows a single-line reset. */
    if (compact) {
      return (
        <div className="nx-error-boundary" style={{ padding: 'var(--nx-space-5)' }}>
          <p className="text-sm text-muted">This section could not be displayed.</p>
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            Try again
          </Button>
        </div>
      );
    }

    return (
      <div className="nx-error-boundary" role="alert">
        <span className="nx-error-boundary__code" aria-label="Error reference">
          {errorId}
        </span>

        <h2 className="text-xl font-semibold">
          {title ?? 'Something went wrong'}
        </h2>

        <p className="text-muted" style={{ maxWidth: '52ch' }}>
          The interface hit an unexpected error. Your data has not been affected. You can retry
          this section, or reload the workspace if the problem persists.
        </p>

        {import.meta.env.DEV && error.message ? (
          <pre className="nx-error-boundary__details">
            {error.message}
            {errorInfo?.componentStack}
          </pre>
        ) : null}

        <div className="row gap-2" style={{ marginTop: 'var(--nx-space-2)' }}>
          <Button variant="primary" onClick={this.handleReset}>
            Try again
          </Button>
          <Button variant="outline" onClick={this.handleReload}>
            Reload workspace
          </Button>
        </div>

        <p className="text-xs text-dim">
          Quote the reference above when contacting support.
        </p>
      </div>
    );
  }
}
