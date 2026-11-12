/**
 * ArkCRM — ResetPasswordPage
 * ---------------------------------------------------------------------------
 * Consumes the token from the emailed link (?token=…). The token is treated as
 * a one-shot secret: the form stays disabled until the API confirms the link is
 * still valid, and a bad token produces an explanation rather than a silent
 * failure.
 *
 * Mounted inside AuthShell, so this page renders only the form column.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiEye, FiEyeOff, FiKey, FiLock, FiMail } from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import PasswordStrength from '../components/PasswordStrength';
import { useResetPasswordMutation } from '../api/authApi';
import { useNotify } from '@/hooks/useNotification';
import { validateForm, email as emailRule, password, confirmPassword, required } from '@/utils/validators';
import { appRoutes } from '@/config/navigation.config';
import './ForgotPasswordPage.css';
import { serverMessage } from '@/utils/errorMessage';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const notify = useNotify();

  /* The address and the code come from the reset link. They are editable,
     because the code may have arrived by another route. */
  const email = params.get('email') ?? '';
  const code = params.get('code') ?? '';

  const [values, setValues] = useState({
    email,
    code,
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();

  /* No code in the URL at all is a different failure from a rejected code,
     and the copy should say so. */
  useEffect(() => {
    if (!email || !code) {
      notify.warning('That reset link is incomplete', {
        message: 'Open the link straight from your email, or request a new one.',
      });
    }
  }, [email, code, notify]);

  const serverError = useMemo(() => {
    if (error?.status === 400 || error?.status === 410) {
      return 'This reset link is invalid or has expired. Request a new one.';
    }
    if (error?.status >= 500) return 'The server had a problem. Try again in a moment.';
    return serverMessage(error, null);
  }, [error]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { valid, errors: nextErrors } = validateForm(values, {
      email: [required, emailRule],
      code: [required],
      password: [required, password],
      confirmPassword: [required, confirmPassword(() => values.password)],
    });
    setErrors(nextErrors);
    if (!valid) return;

    try {
      await resetPassword({
        email: values.email.trim(),
        code: values.code.trim(),
        newPassword: values.password,
      }).unwrap();
      notify.success('Password updated', {
        message: 'Sign in with your new password. Other sessions were signed out.',
      });
      navigate(appRoutes.login, { replace: true });
    } catch {
      /* Rendered from `serverError`. */
    }
  };

  if (!email || !code) {
    return (
      <div className="nx-forgot">
        <h1 className="nx-forgot__title">Reset link required</h1>
        <p className="nx-forgot__subtitle">
          Open the reset link from your email, or request a new one.
        </p>

        <div className="nx-alert nx-alert--warning">
          <span className="nx-alert__icon" aria-hidden="true">
            <FiAlertCircle size={16} />
          </span>
          No address and code were present in the link.
        </div>

        <Button to={appRoutes.forgotPassword} variant="primary" size="lg" fullWidth>
          Request a new link
        </Button>

        <p className="nx-forgot__foot">
          <Link to={appRoutes.login} className="nx-form__link">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="nx-forgot">
      <h1 className="nx-forgot__title">Choose a new password</h1>
      <p className="nx-forgot__subtitle">
        Eight characters minimum, with a mix of cases, a number and a symbol.
      </p>

      <form className="nx-forgot__form" onSubmit={handleSubmit} noValidate>
        <Input
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          leftIcon={<FiMail size={15} />}
          value={values.email}
          onChange={(event) => {
            setValues((prev) => ({ ...prev, email: event.target.value }));
            if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
          }}
          error={errors.email}
          required
        />

        <Input
          label="Reset code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          leftIcon={<FiKey size={15} />}
          value={values.code}
          onChange={(event) => {
            setValues((prev) => ({ ...prev, code: event.target.value }));
            if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
          }}
          error={errors.code}
          required
        />

        {serverError ? (
          <div className="nx-alert nx-alert--error" role="alert">
            <span className="nx-alert__icon" aria-hidden="true">
              <FiAlertCircle size={16} />
            </span>
            {serverError}
          </div>
        ) : null}

        <div>
          <Input
            label="New password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            leftIcon={<FiLock size={15} />}
            value={values.password}
            onChange={(event) => {
              setValues((prev) => ({ ...prev, password: event.target.value }));
              if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
            }}
            error={errors.password}
            required
            autoFocus
            rightIcon={
              <button
                type="button"
                className="nx-auth__reveal"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            }
          />

          {/* Same meter as the register form, so the policy is shown wherever a
              new password is chosen. */}
          <PasswordStrength value={values.password} />
        </div>

        <Input
          label="Confirm new password"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          leftIcon={<FiLock size={15} />}
          value={values.confirmPassword}
          onChange={(event) => {
            setValues((prev) => ({ ...prev, confirmPassword: event.target.value }));
            if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
          }}
          error={errors.confirmPassword}
          required
        />

        <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
          Update password
        </Button>
      </form>

      <p className="nx-forgot__foot">
        <Link to={appRoutes.login} className="nx-form__link">
          Cancel and go to sign in
        </Link>
      </p>
    </div>
  );
}
