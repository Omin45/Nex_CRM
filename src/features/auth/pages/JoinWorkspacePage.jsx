/**
 * ArkCRM — JoinWorkspacePage
 * ---------------------------------------------------------------------------
 * Joining a workspace with its code, for somebody who already has an account.
 *
 * <p>At sign-up the join code does the same job, but that is the only place
 * it worked: an existing account had no way in. That matters because an
 * invitation names one address, and that address may well already have an
 * ArkCRM account.
 *
 * <p>An account belongs to one workspace, so joining moves the person - they
 * leave the business they were in and come to this one, under the role they
 * pick. The screen says so, because it is not a small thing.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiShield, FiUsers } from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import { useJoinTenantMutation, useGetMyTenantQuery } from '@/features/tenants/api/tenantsApi';
import { ROLE_LABELS } from '@/config/permissions.config';
import useAuth from '@/hooks/useAuth';
import { useNotify } from '@/hooks/useNotification';
import { serverMessage } from '@/utils/errorMessage';
import { required, validateForm } from '@/utils/validators';
import './AuthPage.css';

const JOIN_INITIAL = { code: '', role: 'SALES_AGENT' };

const JOIN_SCHEMA = {
  code: [required],
  role: [required],
};

/* The same seven the sign-up form offers. */
const JOIN_ROLES = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SALES_MANAGER', label: 'Sales Manager' },
  { value: 'SALES_AGENT', label: 'Sales Agent' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'FINANCE_MANAGER', label: 'Finance Manager' },
  { value: 'SUPPORT_MANAGER', label: 'Support Manager' },
  { value: 'SUPPORT_AGENT', label: 'Support Agent' },
];

export default function JoinWorkspacePage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const [params] = useSearchParams();

  const { user, tenant, setActiveTenant, updateProfile } = useAuth();
  const { refetch: refreshTenant } = useGetMyTenantQuery();
  const [joinTenant, { isLoading }] = useJoinTenantMutation();

  const [values, setValues] = useState(JOIN_INITIAL);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState(null);

  /* The invitation page sends people here with the code already known. */
  useEffect(() => {
    const code = params.get('code');
    if (code) setValues((prev) => ({ ...prev, code }));
  }, [params]);

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const { errors: nextErrors } = validateForm({ ...values, [field]: value }, JOIN_SCHEMA);
      setErrors((prev) => ({ ...prev, [field]: nextErrors[field] ?? '' }));
    }
  };

  const blurField = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const { errors: nextErrors } = validateForm(values, JOIN_SCHEMA);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] ?? '' }));
  };

  const errorFor = (field) => (touched[field] ? errors[field] : '');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ code: true, role: true });
    setServerError(null);

    const { valid, errors: nextErrors } = validateForm(values, JOIN_SCHEMA);
    setErrors(nextErrors);
    if (!valid) return;

    try {
      const result = await joinTenant({
        code: values.code.trim().toUpperCase(),
        role: values.role,
      }).unwrap();

      /* The session has to point at the new workspace, so the shell, the
         sidebar and the data all follow. */
      const { data } = await refreshTenant();
      if (data) setActiveTenant(data);
      updateProfile({ role: result.role, vendorId: result.tenantId });

      notify.success(`You are now in ${result.tenantName}.`);
      navigate(`/vendor/${result.tenantId}/dashboard`, { replace: true });
    } catch (err) {
      setServerError(serverMessage(err, 'Could not join that workspace.'));
    }
  };

  const roleLabel = useMemo(
    () => ROLE_LABELS[values.role] ?? values.role,
    [values.role],
  );

  /* Somebody who is not signed in has no workspace to move. */
  if (!user) {
    return (
      <div className="nx-authpage">
        <div className="nx-authpage__heading">
          <h1 className="nx-authpage__title">Sign in first</h1>
          <p className="nx-authpage__subtitle">
            Joining a workspace changes which business your account belongs to, so it has to
            know who you are.
          </p>
        </div>

        <div className="nx-authpage__form">
          <div className="nx-alert" role="status">
            <span className="nx-alert__icon" aria-hidden="true">
              <FiUsers size={16} />
            </span>
            Sign in with the account you want to move, then come back here.
          </div>

          <Button variant="primary" size="md" onClick={() => navigate('/login')}>
            Go to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="nx-authpage">
      <div className="nx-authpage__heading">
        <h1 className="nx-authpage__title">Join a workspace</h1>
        <p className="nx-authpage__subtitle">
          {tenant
            ? `You are in ${tenant.name} today. Joining another business moves your account there, under the role you pick.`
            : 'Enter the join code your team gave you.'}
        </p>
      </div>

      <form className="nx-authpage__form" onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <div className="nx-alert nx-alert--error" role="alert">
            <span className="nx-alert__icon" aria-hidden="true">
              <FiAlertCircle size={16} />
            </span>
            {serverError}
          </div>
        ) : null}

        <Input
          label="Workspace code"
          name="code"
          autoComplete="off"
          placeholder="SPA-0002"
          leftIcon={<FiShield size={15} />}
          value={values.code}
          onChange={setField('code')}
          onBlur={blurField('code')}
          error={errorFor('code')}
          hint="It looks like ABC-1234. Your team lead has it."
          required
        />

        <Input
          label="Role"
          name="role"
          as="select"
          options={JOIN_ROLES}
          value={values.role}
          onChange={setField('role')}
          onBlur={blurField('role')}
          error={errorFor('role')}
          hint={`You will join as ${roleLabel}.`}
          required
        />

        <Button type="submit" variant="primary" size="md" loading={isLoading}>
          Join as {roleLabel}
        </Button>

        <p className="nx-authpage__dev-note">
          No code yet? <Link to="/login">Sign in</Link> and ask your team lead for one.
        </p>
      </form>
    </div>
  );
}
