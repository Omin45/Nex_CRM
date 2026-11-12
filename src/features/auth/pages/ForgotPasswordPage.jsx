/**
 * ArkCRM — ForgotPasswordPage
 * ---------------------------------------------------------------------------
 * Requests a reset link. Deliberately does not reveal whether an address is
 * registered — the backend returns 202 either way, and this screen mirrors
 * that so it cannot be used to enumerate accounts.
 *
 * Mounted inside AuthShell (see layouts/AuthShell.jsx), so this page renders
 * only the form column: no card, no heading block of its own beyond the
 * title/subtitle the shell cannot know about.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiMail } from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import { useForgotPasswordMutation } from '../api/authApi';
import { validateForm, email, required } from '@/utils/validators';
import { appRoutes } from '@/config/navigation.config';
import './ForgotPasswordPage.css';

export default function ForgotPasswordPage() {
  const [emailValue, setEmailValue] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  /* The reset code, when the server had nowhere to send it. */
  const [code, setCode] = useState('');
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { valid, errors } = validateForm({ email: emailValue }, { email: [required, email] });
    setError(errors.email ?? '');
    if (!valid) return;

    try {
      const result = await forgotPassword(emailValue.trim()).unwrap();
      setCode(result?.code ?? '');
      setSent(true);
    } catch {
      /* Even a hard failure shows the same confirmation, so this screen cannot
         be used to discover which addresses exist. */
      setSent(true);
    }
  };

  if (sent) {
    /* With a mail service the code is on its way. Without one, the server
       hands it back, and the screen shows it - otherwise the reset could
       never be finished. */
    return (
      <div className="nx-forgot">
        <h1 className="nx-forgot__title">
          {code ? 'Your reset code' : 'Check your inbox'}
        </h1>
        <p className="nx-forgot__subtitle">
          {code
            ? 'This deployment has no mail service, so the code comes back with the answer. It expires in 15 minutes.'
            : `If an account exists for ${emailValue}, a reset link is on its way. It expires in 15 minutes.`}
        </p>

        {code ? (
          <>
            <div className="nx-alert nx-alert--success">
              <span className="nx-alert__icon" aria-hidden="true">
                <FiCheckCircle size={16} />
              </span>
              Your reset code is <strong>{code}</strong>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              to={`${appRoutes.resetPassword}?email=${encodeURIComponent(emailValue)}&code=${encodeURIComponent(code)}`}
            >
              Choose a new password
            </Button>
          </>
        ) : (
          <div className="nx-alert nx-alert--success">
            <span className="nx-alert__icon" aria-hidden="true">
              <FiCheckCircle size={16} />
            </span>
            Reset link sent. Check spam if it has not arrived in a few minutes.
          </div>
        )}

        <Button
          variant="secondary"
          to={appRoutes.login}
          leftIcon={<FiArrowLeft size={15} />}
          fullWidth
        >
          Back to sign in
        </Button>

        <p className="nx-forgot__foot">
          <button
            type="button"
            className="nx-form__link"
            onClick={() => {
              setSent(false);
              setCode('');
              setError('');
            }}
          >
            Try another email
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="nx-forgot">
      <h1 className="nx-forgot__title">Reset your password</h1>
      <p className="nx-forgot__subtitle">
        Enter the email on your account and we will send a link to set a new
        password.
      </p>

      <form className="nx-forgot__form" onSubmit={handleSubmit} noValidate>
        <Input
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          leftIcon={<FiMail size={15} />}
          value={emailValue}
          onChange={(event) => {
            setEmailValue(event.target.value);
            if (error) setError('');
          }}
          error={error}
          required
          autoFocus
        />

        <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
          Send reset link
        </Button>
      </form>

      <p className="nx-forgot__foot">
        <span>Remembered it? </span>
        <Link to={appRoutes.login} className="nx-form__link">
          Sign in instead
        </Link>
      </p>
    </div>
  );
}
