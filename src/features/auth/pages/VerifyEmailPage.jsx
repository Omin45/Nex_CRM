/**
 * ArkCRM — VerifyEmailPage
 * ---------------------------------------------------------------------------
 * Consumes the ?token=… from the confirmation email. Self-verifying on mount,
 * with three outcomes: pending, verified, or failed-with-a-retry.
 *
 * Mounted inside AuthShell, so this page renders only the form column. It
 * reuses .nx-forgot (styles/ForgotPasswordPage.css) — the two screens have the
 * same shape: a heading, a status block, and one or two actions.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiLoader } from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import { useVerifyEmailMutation } from '../api/authApi';
import { useVendorHome } from '@/hooks/useVendorPath';
import { appRoutes } from '@/config/navigation.config';
import './ForgotPasswordPage.css';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const vendorHome = useVendorHome();

  const [verifyEmail, { isLoading }] = useVerifyEmailMutation();
  const [status, setStatus] = useState(token ? 'pending' : 'error');
  const [message, setMessage] = useState('');

  /* A ref guards against React 18 StrictMode double-invoking the effect in
     development, which would burn a single-use verification token. */
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!token) {
      setStatus('error');
      setMessage('No verification token was present in the link.');
      return;
    }

    verifyEmail(token)
      .unwrap()
      .then(() => {
        setStatus('verified');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(
          error?.status === 400 || error?.status === 410
            ? 'This verification link has already been used or has expired. Request a new one from your profile.'
            : 'We could not verify your email right now. Try again in a moment.',
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="nx-forgot">
      {status === 'pending' ? (
        <div className="nx-verify" aria-live="polite">
          <span className="nx-verify__icon" aria-hidden="true">
            <FiLoader size={26} className="nx-spin" />
          </span>
          <h3 className="text-lg font-semibold">Verifying your email…</h3>
          <p className="text-sm text-dim">This only takes a moment.</p>
        </div>
      ) : null}

      {status === 'verified' ? (
        <div className="nx-verify" aria-live="polite">
          <span className="nx-verify__icon is-success" aria-hidden="true">
            <FiCheckCircle size={26} />
          </span>
          <h3 className="text-lg font-semibold">Email verified</h3>
          <p className="text-sm text-dim">
            Your address is confirmed. You now have the full feature set, including email
            delivery for invoices and statements.
          </p>

          <Button to={vendorHome} fullWidth>
            Go to dashboard
          </Button>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="nx-verify" aria-live="assertive">
          <span className="nx-verify__icon is-danger" aria-hidden="true">
            <FiAlertCircle size={26} />
          </span>
          <h3 className="text-lg font-semibold">We could not verify that link</h3>
          <p className="text-sm text-dim">{message}</p>

          <div className="nx-form__row">
            <Button to={appRoutes.profile} variant="primary">
              Resend from profile
            </Button>
            <Button to={appRoutes.login} variant="secondary">
              Back to sign in
            </Button>
          </div>

          <p className="nx-forgot__foot">
            Need a hand? <Link to={appRoutes.help} className="nx-form__link">Contact support</Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
