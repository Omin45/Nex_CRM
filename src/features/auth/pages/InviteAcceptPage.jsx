/**
 * ArkCRM — InviteAcceptPage
 * ---------------------------------------------------------------------------
 * The other end of an invitation: somebody who was invited opens the link and
 * becomes a member of the workspace.
 *
 * <p>An invitation is a link, not an email. The owner copies it and sends it
 * however they already talk to their team, so the page has to work on its own:
 * it reads the token out of the URL, asks the server what the invitation is,
 * and shows the person exactly where they are about to land before asking
 * them for a password.
 *
 * <p>After the account is made, the person is signed in with the password
 * they just chose, so an accepted invitation ends at the dashboard rather
 * than at another sign-in form.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiShield, FiUser } from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import { useLoginMutation } from '@/features/auth/api/authApi';
import {
  useAcceptInviteMutation,
  useLookupInviteQuery,
} from '@/features/tenants/api/tenantsApi';
import { ROLE_LABELS } from '@/config/permissions.config';
import { useNotify } from '@/hooks/useNotification';
import { serverMessage } from '@/utils/errorMessage';
import { minLength, required, validateForm } from '@/utils/validators';
import './AuthPage.css';

const ACCEPT_INITIAL = { fullName: '', phone: '', password: '', confirmPassword: '' };

const ACCEPT_SCHEMA = {
  /* `minLength` takes (value, length), so a bound rule has to be wrapped -
     `minLength.bind(null, 2)` would shift the arguments and never fire. */
  fullName: [required, (value) => minLength(value, 2)],
  phone: [],
  password: [required, (value) => minLength(value, 8)],
  confirmPassword: [required],
};

export default function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();

  const [values, setValues] = useState(ACCEPT_INITIAL);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [done, setDone] = useState(null);
  /* Why the accept did not work, said on the page rather than in a toast
     that scrolls away. */
  const [serverError, setServerError] = useState(null);
  const [joinCode, setJoinCode] = useState('');

  const { data: invite, isLoading, isError, error } = useLookupInviteQuery(token, { skip: !token });
  const [acceptInvite, { isLoading: isAccepting }] = useAcceptInviteMutation();
  const [login] = useLoginMutation();

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));

    if (touched[field]) {
      const { errors: nextErrors } = validateForm({ ...values, [field]: value }, ACCEPT_SCHEMA);
      setErrors((prev) => ({ ...prev, [field]: nextErrors[field] ?? '' }));
    }
  };

  const blurField = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const { errors: nextErrors } = validateForm(values, ACCEPT_SCHEMA);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] ?? '' }));
  };

  const errorFor = (field) => (touched[field] ? errors[field] : '');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError(null);

    setTouched({ fullName: true, phone: true, password: true, confirmPassword: true });
    const { valid, errors: nextErrors } = validateForm(values, ACCEPT_SCHEMA);
    setErrors(nextErrors);
    if (!valid) return;

    try {
      const account = await acceptInvite({
        token,
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        password: values.password,
      }).unwrap();

      /* Sign them straight in with the password they just chose, so an
         accepted invitation ends at the dashboard. */
      try {
        await login({ email: account.email, password: values.password }).unwrap();
      } catch {
        /* The account exists either way; a failed auto-sign-in only means
           they type the password themselves on the next screen. */
      }

      setDone(account);
      notify.success(`Welcome to ${account.tenantName}.`);
    } catch (err) {
      /* The reason is on the page. A toast alone is how "it does not work"
         happens: the message goes past before it is read. */
      const payload = err?.data ?? null;
      setServerError(serverMessage(err, 'Could not accept this invitation.'));
      setJoinCode(payload?.tenantCode ?? '');
    }
  };

  const roleLabel = useMemo(() => {
    const role = invite?.role;
    if (!role) return null;
    return ROLE_LABELS[role] ?? role;
  }, [invite]);

  /* ---------------------------------------------------------------------
   * The invitation could not be read at all.
   * ------------------------------------------------------------------- */
  if (isError) {
    return (
      <div className="nx-authpage">
        <div className="nx-authpage__heading">
          <h1 className="nx-authpage__title">This invitation is not valid</h1>
          <p className="nx-authpage__subtitle">
            {serverMessage(error, 'The link may have been mistyped, or it may have been withdrawn.')}
          </p>
        </div>

        <div className="nx-authpage__form">
          <div className="nx-alert nx-alert--error" role="alert">
            <span className="nx-alert__icon" aria-hidden="true">
              <FiAlertCircle size={16} />
            </span>
            Ask the person who invited you for a fresh link.
          </div>

          <Button variant="primary" size="md" onClick={() => navigate('/login')}>
            Go to sign in
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------
   * The invitation was read, but it cannot be used.
   * ------------------------------------------------------------------- */
  if (invite && !invite.valid) {
    return (
      <div className="nx-authpage">
        <div className="nx-authpage__heading">
          <h1 className="nx-authpage__title">This invitation has closed</h1>
          <p className="nx-authpage__subtitle">{invite.message}</p>
        </div>

        <div className="nx-authpage__form">
          <div className="nx-alert nx-alert--error" role="alert">
            <span className="nx-alert__icon" aria-hidden="true">
              <FiAlertCircle size={16} />
            </span>
            {invite.message ?? 'This invitation can no longer be used.'}
          </div>

          <Button variant="primary" size="md" onClick={() => navigate('/login')}>
            Go to sign in
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------
   * Done: the account exists.
   * ------------------------------------------------------------------- */
  if (done) {
    return (
      <div className="nx-authpage">
        <div className="nx-authpage__heading">
          <h1 className="nx-authpage__title">You are in</h1>
          <p className="nx-authpage__subtitle">
            Your account is ready in {done.tenantName}, with the {roleLabel ?? done.role} role.
          </p>
        </div>

        <div className="nx-authpage__form">
          <div className="nx-alert nx-alert--success" role="status">
            <span className="nx-alert__icon" aria-hidden="true">
              <FiCheckCircle size={16} />
            </span>
            {done.email} can now sign in with the password you chose.
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(`/vendor/${done.tenantId}/dashboard`)}
          >
            Open the workspace
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------
   * The invitation, waiting for a password.
   * ------------------------------------------------------------------- */
  return (
    <div className="nx-authpage">
      <div className="nx-authpage__heading">
        <h1 className="nx-authpage__title">Join the team</h1>
        <p className="nx-authpage__subtitle">
          {isLoading
            ? 'Checking your invitation…'
            : `You have been invited to ${invite?.tenantName ?? 'a workspace'} as ${roleLabel ?? 'a team member'}.`}
        </p>
      </div>

      <form className="nx-authpage__form" onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <div className="nx-alert nx-alert--error" role="alert">
            <span className="nx-alert__icon" aria-hidden="true">
              <FiAlertCircle size={16} />
            </span>
            {serverError}
            {joinCode ? (
              <span className="nx-authpage__dev-note">
                <br />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/join?code=${joinCode}`)}
                >
                  Sign in and join with the code
                </Button>
              </span>
            ) : null}
          </div>
        ) : null}

        {invite?.email ? (
          <div className="nx-alert" role="status">
            <span className="nx-alert__icon" aria-hidden="true">
              <FiUser size={16} />
            </span>
            This invitation is for <strong>{invite.email}</strong>.
          </div>
        ) : null}

        <Input
          label="Full name"
          name="fullName"
          autoComplete="name"
          placeholder="Adaeze Okonkwo"
          leftIcon={<FiUser size={15} />}
          value={values.fullName}
          onChange={setField('fullName')}
          onBlur={blurField('fullName')}
          error={errorFor('fullName')}
          required
        />

        <Input
          label="Phone number"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+234 800 000 0000"
          leftIcon={<FiUser size={15} />}
          value={values.phone}
          onChange={setField('phone')}
          onBlur={blurField('phone')}
          error={errorFor('phone')}
          hint="Optional, but it is how your team reaches you."
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          leftIcon={<FiShield size={15} />}
          value={values.password}
          onChange={setField('password')}
          onBlur={blurField('password')}
          error={errorFor('password')}
          required
        />

        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Type it again"
          leftIcon={<FiShield size={15} />}
          value={values.confirmPassword}
          onChange={setField('confirmPassword')}
          onBlur={blurField('confirmPassword')}
          error={errorFor('confirmPassword')}
          required
        />

        <Button type="submit" variant="primary" size="md" loading={isAccepting} disabled={isLoading}>
          Join {invite?.tenantName ?? 'the workspace'}
        </Button>

        <p className="nx-authpage__dev-note">
          By joining you accept the workspace&apos;s access rules. Already have an account?{' '}
          <Link to="/login">Sign in instead</Link>.
        </p>
      </form>
    </div>
  );
}
